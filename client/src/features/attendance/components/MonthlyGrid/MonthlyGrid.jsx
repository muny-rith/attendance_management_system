import React, { useState, useEffect, useCallback } from 'react';
import './MonthlyGrid.css';
import { fetchMonthlyGrid } from '../../services/attendanceApi';
import { exportMonthlyMatrixToExcel } from '../../utils/exportMonthlyExcel';
import { printMonthlyMatrixA4 } from '../../utils/printMonthlyA4';
import { Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MonthlyGrid() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [gridData, setGridData] = useState({ daysInMonth: 30, matrix: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const loadGrid = useCallback(async () => {
    setLoading(true);
    const res = await fetchMonthlyGrid(year, month);
    setGridData(res);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((prev) => prev - 1);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((prev) => prev + 1);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  const daysArray = Array.from({ length: gridData.daysInMonth || 30 }, (_, i) => i + 1);

  const getDayName = (dayNum) => {
    const d = new Date(year, month - 1, dayNum);
    const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return names[d.getDay()];
  };

  const isWeekend = (dayNum) => {
    const d = new Date(year, month - 1, dayNum);
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const getHoliday = (dayNum) => gridData.holidays && gridData.holidays[dayNum];

  const handleExportExcel = async () => {
    if (exporting || printing) return;
    if (!gridData.matrix || gridData.matrix.length === 0) {
      alert('No monthly attendance data to export.');
      return;
    }

    try {
      setExporting(true);
      await exportMonthlyMatrixToExcel({ year, month, gridData });
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintA4 = async () => {
    if (printing || exporting) return;
    if (!gridData.matrix || gridData.matrix.length === 0) {
      alert('No monthly attendance data to print.');
      return;
    }

    try {
      setPrinting(true);
      await printMonthlyMatrixA4({ year, month, gridData });
    } catch (error) {
      console.error('A4 print failed:', error);
      alert('Failed to prepare A4 print view. Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="monthly-wrapper">
      {/* Clean Toolbar */}
      <div className="monthly-compact-toolbar">
        <div className="month-selector">
          <button type="button" onClick={handlePrevMonth} className="btn-month-nav" title="Previous Month">
            <ChevronLeft size={16} />
          </button>
          <span className="month-title-text">
            {monthNames[month - 1]} {year}
          </span>
          <button type="button" onClick={handleNextMonth} className="btn-month-nav" title="Next Month">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="matrix-legend-compact">
          <span><span className="dot dot-p" /> P (Present)</span>
          <span><span className="dot dot-l" /> L (Late)</span>
          <span><span className="dot dot-a" /> A (Absent)</span>
          <span><span className="dot dot-h" /> H (Holiday)</span>
        </div>

        <div className="monthly-toolbar-actions">
          <button
            type="button"
            onClick={handlePrintA4}
            className="btn-print-matrix"
            disabled={printing || exporting || loading || !gridData.matrix?.length}
            title="Print or Save as true A4 Landscape PDF"
          >
            <Printer size={14} />
            <span>{printing ? 'Preparing...' : 'Print'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="btn-export-matrix"
            disabled={exporting || printing || loading || !gridData.matrix?.length}
          >
            <Download size={14} />
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="monthly-grid-container">
        {loading ? (
          <div className="empty-state">Loading monthly matrix...</div>
        ) : (
          <table className="monthly-matrix-table">
            <thead>
              <tr>
                <th className="sticky-col" style={{ width: '160px' }}>Name</th>
                {daysArray.map((dayNum) => {
                  const weekend = isWeekend(dayNum);
                  const holiday = getHoliday(dayNum);
                  return (
                    <th
                      key={dayNum}
                      className={`day-th ${weekend ? 'weekend-th' : ''} ${holiday ? 'holiday-th' : ''}`}
                      title={holiday ? `${holiday.name} (${holiday.localName || ''})` : undefined}
                    >
                      <span className="d-num">{dayNum}</span>
                      <span className="d-name">{getDayName(dayNum)}</span>
                    </th>
                  );
                })}
                <th style={{ width: '70px', textAlign: 'center', color: '#D97706' }}>Late</th>
                <th style={{ width: '80px', textAlign: 'center', color: '#DC2626' }}>Absence</th>
                <th style={{ width: '80px', textAlign: 'center', color: '#059669' }}>Present</th>
              </tr>
            </thead>
            <tbody>
              {gridData.matrix.map((emp) => {
                const absentDays =
                  emp.absentDays !== undefined
                    ? emp.absentDays
                    : Object.values(emp.daysData || {}).filter((d) => d.status === 'ABSENT').length;

                return (
                  <tr key={emp.employeeId} className="table-row">
                    <td className="sticky-col employee-name">{emp.employeeName}</td>
                    {daysArray.map((dayNum) => {
                      const dayInfo = emp.daysData ? emp.daysData[dayNum] : null;
                      const status = dayInfo ? dayInfo.status : 'OFF';
                      const weekend = isWeekend(dayNum);
                      const holiday = getHoliday(dayNum);

                      return (
                        <td
                          key={dayNum}
                          className={`day-td ${weekend ? 'weekend-td' : ''} ${holiday ? 'holiday-td' : ''}`}
                          title={
                            dayInfo && dayInfo.times
                              ? `${emp.employeeName} (Day ${dayNum}): ${dayInfo.times}`
                              : holiday
                                ? `${holiday.name}: ${status}`
                                : `${emp.employeeName} (Day ${dayNum}): ${status}`
                          }
                        >
                          {status === 'PRESENT' && <span className="m-tag tag-p">P</span>}
                          {status === 'LATE' && <span className="m-tag tag-l">L</span>}
                          {status === 'ABSENT' && <span className="m-tag tag-a">A</span>}
                          {status === 'WEEKEND' && <span className="m-tag tag-w">·</span>}
                          {status === 'HOLIDAY' && <span className="m-tag tag-h">H</span>}
                          {status === 'OFF' && <span className="m-tag tag-off">—</span>}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        textAlign: 'center',
                        color: emp.lateDays > 0 ? '#D97706' : 'var(--text-secondary)',
                        fontWeight: emp.lateDays > 0 ? 600 : 400,
                      }}
                    >
                      {emp.lateDays}d
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        color: absentDays > 0 ? '#DC2626' : 'var(--text-secondary)',
                        fontWeight: absentDays > 0 ? 600 : 400,
                      }}
                    >
                      {absentDays}d
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        color: emp.presentDays > 0 ? '#059669' : 'var(--text-secondary)',
                        fontWeight: emp.presentDays > 0 ? 600 : 400,
                      }}
                    >
                      {emp.presentDays}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
