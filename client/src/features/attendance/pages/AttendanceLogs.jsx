import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import DateFilterBar from '../components/DateFilterBar';
import AttendanceTable from '../components/AttendanceTable';
import PaginationBar from '../components/PaginationBar';
import RegistrationModal from '../components/RegistrationModal';

// Attendance Hub Components
import AttendanceTabs from '../components/AttendanceTabs/AttendanceTabs';
import DailyTimesheet from '../components/DailyTimesheet/DailyTimesheet';
import LivePresenceBoard from '../components/LivePresenceBoard/LivePresenceBoard';
import MonthlyGrid from '../components/MonthlyGrid/MonthlyGrid';

import {
  fetchAttendanceLogs,
  fetchDailyTimesheet,
  fetchLivePresence,
} from '../services/attendanceApi';
import { useSocket } from '../../../shared/context/SocketContext';
import { Bell } from 'lucide-react';

export default function AttendanceLogs() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper date formatter: YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDate(new Date());

  // Active view tab (defaults to 'daily')
  const currentTab = searchParams.get('tab') || 'daily';

  // URL state synchronization
  const currentPage = Number(searchParams.get('page')) || 1;
  const currentLimit = Number(searchParams.get('limit')) || 25;
  const hasDateFilter = searchParams.has('preset') || searchParams.has('startDate') || searchParams.has('endDate');
  const currentPreset = hasDateFilter ? (searchParams.get('preset') || '') : 'today';
  const currentStartDate = hasDateFilter ? (searchParams.get('startDate') || '') : todayStr;
  const currentEndDate = hasDateFilter ? (searchParams.get('endDate') || '') : todayStr;
  const currentSearch = searchParams.get('search') || '';

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 25,
  });
  const [loading, setLoading] = useState(true);
  const [registerLog, setRegisterLog] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [newScansPending, setNewScansPending] = useState(0);

  // Daily Timesheet State
  const [dailyData, setDailyData] = useState({
    date: currentStartDate || todayStr,
    kpi: null,
    exceptions: [],
    data: [],
  });
  const [dailyLoading, setDailyLoading] = useState(false);
  const [livePresenceCount, setLivePresenceCount] = useState(0);

  const { socket } = useSocket();

  // Helper to update URL search params
  const updateUrlParams = useCallback((newParams) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        updated.set(key, val);
      } else {
        updated.delete(key);
      }
    });
    setSearchParams(updated);
  }, [searchParams, setSearchParams]);

  // Tab change handler
  const handleTabChange = (tabId) => {
    updateUrlParams({ tab: tabId });
  };

  // Populate default Today filter in URL on initial visit if none set
  useEffect(() => {
    if (!hasDateFilter) {
      updateUrlParams({
        tab: currentTab,
        preset: 'today',
        startDate: todayStr,
        endDate: todayStr,
      });
    }
  }, []);

  // Fetch Daily Timesheet
  const loadDailyData = useCallback(async (targetDate) => {
    setDailyLoading(true);
    const dateToQuery = targetDate || currentStartDate || todayStr;
    const res = await fetchDailyTimesheet(dateToQuery);
    setDailyData(res);
    setDailyLoading(false);
  }, [currentStartDate, todayStr]);

  // Fetch live count for presence badge
  const loadLiveCount = useCallback(async () => {
    try {
      const res = await fetchLivePresence();
      if (res && typeof res.onCampusCount === 'number') {
        setLivePresenceCount(res.onCampusCount);
      }
    } catch (err) {
      console.error('Error fetching live count:', err);
    }
  }, []);

  // Fetch paginated raw logs
  const loadLogsData = useCallback(async () => {
    setLoading(true);

    let start = currentStartDate;
    let end = currentEndDate;

    if (start) start = `${start} 00:00:00`;
    if (end) end = `${end} 23:59:59.999`;

    const res = await fetchAttendanceLogs({
      page: currentPage,
      limit: currentLimit,
      startDate: start,
      endDate: end,
      search: currentSearch,
    });

    setLogs(res.data || []);
    if (res.pagination) {
      setPagination(res.pagination);
    }
    setLoading(false);
  }, [currentPage, currentLimit, currentStartDate, currentEndDate, currentSearch]);

  useEffect(() => {
    loadLiveCount();
  }, [loadLiveCount]);

  useEffect(() => {
    if (currentTab === 'daily') {
      loadDailyData(currentStartDate || todayStr);
    } else if (currentTab === 'logs') {
      loadLogsData();
    }
  }, [currentTab, currentStartDate, todayStr, loadDailyData, loadLogsData]);

  // Debounce search input changes (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrlParams({ search: searchInput, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, currentSearch, updateUrlParams]);

  // Real-time WebSocket scan handling
  useEffect(() => {
    if (!socket) return;

    const handleNewScan = (newLog) => {
      if (currentPage === 1 && (currentPreset === 'all' || currentPreset === 'today')) {
        setLogs((prev) => [newLog, ...prev.slice(0, currentLimit - 1)]);
        setPagination((prev) => ({
          ...prev,
          totalRecords: prev.totalRecords + 1,
        }));
      } else {
        setNewScansPending((prev) => prev + 1);
      }

      const activeDate = currentStartDate || todayStr;
      if (activeDate === todayStr) {
        loadDailyData(todayStr);
      }

      loadLiveCount();
    };

    socket.on('new_scan', handleNewScan);
    return () => {
      socket.off('new_scan', handleNewScan);
    };
  }, [socket, currentPage, currentLimit, currentPreset, currentStartDate, todayStr, loadDailyData, loadLiveCount]);

  // Preset Date Filter Handler
  const handlePresetChange = (presetId) => {
    if (!presetId || presetId === 'custom') return;

    const now = new Date();
    let start = '';
    let end = '';

    if (presetId === 'today') {
      start = formatDate(now);
      end = formatDate(now);
    } else if (presetId === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      start = formatDate(y);
      end = formatDate(y);
    } else if (presetId === 'this_week' || presetId === 'week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const first = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6);
      start = formatDate(first);
      end = formatDate(last);
    } else if (presetId === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      start = formatDate(first);
      end = formatDate(last);
    } else if (presetId === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      start = formatDate(first);
      end = formatDate(last);
    }

    updateUrlParams({
      preset: presetId || undefined,
      startDate: start,
      endDate: end,
      page: 1,
    });
  };

  // Custom Date Change Handler
  const handleCustomRangeChange = ({ start, end }) => {
    updateUrlParams({
      preset: 'custom',
      startDate: start || '',
      endDate: end || '',
      page: 1,
    });
  };

  // Direct Single Date Handler for Daily Timesheet
  const handleSingleDateChange = (newDate) => {
    updateUrlParams({
      preset: newDate === todayStr ? 'today' : 'custom',
      startDate: newDate,
      endDate: newDate,
      page: 1,
    });
    loadDailyData(newDate);
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams({
      tab: currentTab,
      page: '1',
      limit: String(currentLimit),
      preset: 'today',
      startDate: todayStr,
      endDate: todayStr,
    }));
  };

  // Pagination Change Handlers
  const handlePageChange = (newPage) => {
    setNewScansPending(0);
    updateUrlParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit) => {
    updateUrlParams({ limit: newLimit, page: 1 });
  };

  // Export Handler
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      let start = currentStartDate ? `${currentStartDate} 00:00:00` : null;
      let end = currentEndDate ? `${currentEndDate} 23:59:59.999` : null;

      const res = await fetchAttendanceLogs({
        startDate: start,
        endDate: end,
        search: currentSearch,
        exportAll: true,
      });

      const exportRows = res.data || [];
      if (exportRows.length === 0) {
        alert('No records match your filters to export.');
        setIsExporting(false);
        return;
      }

      const headers = ['ID', 'Employee Name', 'Method', 'Identifier', 'Shift', 'Timestamp'];
      const csvData = [headers.join(',')];

      exportRows.forEach((log) => {
        const row = [
          log.id,
          `"${log.name || 'Unknown User'}"`,
          log.scanned_method || '',
          `"${log.scanned_identifier || ''}"`,
          `"${log.shift_title || ''}"`,
          `"${new Date(log.timestamp).toLocaleString()}"`,
        ];
        csvData.push(row.join(','));
      });

      const blob = new Blob([csvData.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute(
        'download',
        `attendance_logs_${currentPreset || 'export'}_${formatDate(new Date())}.csv`
      );
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter daily timesheet rows by search box
  const filteredDailyRows = (dailyData.data || []).filter((row) => {
    if (!searchInput) return true;
    const q = searchInput.toLowerCase();
    return (
      row.employeeName.toLowerCase().includes(q) ||
      (row.role && row.role.toLowerCase().includes(q)) ||
      (row.dailyStatus && row.dailyStatus.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {registerLog && (
        <RegistrationModal
          log={registerLog}
          onClose={() => setRegisterLog(null)}
          onRegisterSuccess={() => {
            setRegisterLog(null);
            loadDailyData(currentStartDate || todayStr);
            loadLogsData();
          }}
        />
      )}

      <Header onExport={handleExportCSV} isExporting={isExporting} />

      <main className="main-content">
        {/* Real-time scan pill alert when browsing older pages */}
        {newScansPending > 0 && currentTab === 'logs' && (
          <div
            className="realtime-banner"
            onClick={() => handlePageChange(1)}
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: 'var(--accent-cyan)',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            <Bell size={16} />
            <span>
              {newScansPending} new scan{newScansPending > 1 ? 's' : ''} recorded. Click to jump to
              Page 1.
            </span>
          </div>
        )}

        {/* Clean Segmented Control Tabs */}
        <AttendanceTabs
          activeTab={currentTab}
          onTabChange={handleTabChange}
          liveCount={livePresenceCount}
        />

        {/* Filter Toolbar (Direct Date for Daily, Range for Logs) */}
        {(currentTab === 'daily' || currentTab === 'logs') && (
          <DateFilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            isDaily={currentTab === 'daily'}
            selectedDate={currentStartDate || todayStr}
            todayStr={todayStr}
            onSingleDateChange={handleSingleDateChange}
            preset={currentPreset}
            onPresetChange={handlePresetChange}
            startDate={currentStartDate}
            endDate={currentEndDate}
            onCustomRangeChange={handleCustomRangeChange}
            onReset={handleResetFilters}
          />
        )}

        {/* VIEW 1: Daily Timesheet */}
        {currentTab === 'daily' && (
          <>
            <div className="table-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h2>Daily Timesheet ({currentStartDate || todayStr})</h2>
                {dailyData.calendarInfo?.isNonWorking && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      background: dailyData.calendarInfo.reason === 'HOLIDAY' ? '#EEF2FF' : '#F3F4F6',
                      color: dailyData.calendarInfo.reason === 'HOLIDAY' ? '#4F46E5' : '#4B5563',
                      border:
                        dailyData.calendarInfo.reason === 'HOLIDAY'
                          ? '1px solid #C7D2FE'
                          : '1px solid #E5E7EB',
                    }}
                  >
                    {dailyData.calendarInfo.reason === 'HOLIDAY'
                      ? `Holiday: ${dailyData.calendarInfo.title}`
                      : 'School Weekend (Sat / Sun)'}
                  </span>
                )}
              </div>
              <div className="records-count">
                {filteredDailyRows.length} Staff
              </div>
            </div>
            <DailyTimesheet
              data={filteredDailyRows}
              loading={dailyLoading}
            />
          </>
        )}

        {/* VIEW 2: Live Presence Board */}
        {currentTab === 'presence' && (
          <>
            <div className="table-header">
              <h2>Live Presence</h2>
              <div className="records-count">
                {livePresenceCount} On Campus
              </div>
            </div>
            <LivePresenceBoard />
          </>
        )}

        {/* VIEW 3: Monthly Register Grid */}
        {currentTab === 'monthly' && (
          <>
            <div className="table-header">
              <h2>Monthly Register Grid</h2>
              <div className="records-count">
                {dailyData.data?.length || '-'} Staff
              </div>
            </div>
            <MonthlyGrid />
          </>
        )}

        {/* VIEW 4: Raw Activity Logs (Preserved 100%) */}
        {currentTab === 'logs' && (
          <>
            <div className="table-header">
              <h2>Hardware Activity Logs</h2>
              <div className="records-count">
                {pagination.totalRecords.toLocaleString()} Records
              </div>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading attendance records...</div>
            ) : (
              <>
                <AttendanceTable logs={logs} onRegisterClick={setRegisterLog} />
                <PaginationBar
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalRecords={pagination.totalRecords}
                  limit={pagination.limit}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
