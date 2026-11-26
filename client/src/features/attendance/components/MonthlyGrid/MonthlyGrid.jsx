import React, { useState, useEffect, useCallback } from 'react';
import './MonthlyGrid.css';
import { fetchMonthlyGrid } from '../../services/attendanceApi';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MonthlyGrid() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [gridData, setGridData] = useState({ daysInMonth: 30, matrix: [] });
  const [loading, setLoading] = useState(true);

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

  const handleExportMatrixCSV = () => {
    if (!gridData.matrix || gridData.matrix.length === 0) {
      alert('No monthly attendance data to export.');
      return;
    }

    const header = [
      'Staff Name',
      'Role',
      ...daysArray.map((d) => `Day ${d}`),
      'Late Days',
      'Absent Days',
      'Present Days',
    ];

    const rows = [header.join(',')];

    gridData.matrix.forEach((emp) => {
      const absentCount =
        emp.absentDays !== undefined
          ? emp.absentDays
          : Object.values(emp.daysData || {}).filter((d) => d.status === 'ABSENT').length;

      const row = [
        `"${emp.employeeName}"`,
        `"${emp.role || 'teacher'}"`,
        ...daysArray.map((d) => {
          const dayInfo = emp.daysData && emp.daysData[d];
          if (!dayInfo) return '""';
          if (dayInfo.status === 'WEEKEND') return '"W"';
          if (dayInfo.status === 'HOLIDAY') return '"H"';
          if (dayInfo.status === 'PRESENT') return '"P"';
          if (dayInfo.status === 'LATE') return '"L"';
          if (dayInfo.status === 'ABSENT') return '"A"';
          return '"-"';
        }),
        emp.lateDays || 0,
        `${absentCount}d`,
        emp.presentDays || 0,
      ];
      rows.push(row.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_attendance_matrix_${year}_${String(month).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          <span><span className="dot dot-w" /> W (Weekend)</span>
          <span><span className="dot dot-h" /> H (Holiday)</span>
        </div>

        <button type="button" onClick={handleExportMatrixCSV} className="btn-export-matrix">
          <Download size={14} />
          <span>Export CSV</span>
        </button>
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
