import React from 'react';
import './DailyTimesheet.css';

export default function DailyTimesheet({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="daily-timesheet-container">
        <div className="daily-timesheet-empty">Loading daily timesheet records...</div>
      </div>
    );
  }

  const renderTimeValue = (time, isWarning) => {
    if (time) {
      return (
        <span className={isWarning ? 'dt-time-warning' : 'dt-time-success'}>
          {time}
        </span>
      );
    }
    return <span className="dt-blank-underscore" title="Missing scan" />;
  };

  const renderShiftTime = (shiftData) => {
    if (!shiftData || (!shiftData.in && !shiftData.out)) {
      return <span className="dt-text-muted">—</span>;
    }

    return (
      <span className="dt-shift-time">
        {renderTimeValue(shiftData.in, shiftData.isLate)}
        <span className="dt-shift-separator">–</span>
        {renderTimeValue(shiftData.out, shiftData.isEarly)}
      </span>
    );
  };

  const renderCleanerShift = (fullDayData, type) => {
    if (!fullDayData || (!fullDayData.in && !fullDayData.out)) {
      return <span className="dt-text-muted">—</span>;
    }

    if (type === 'morning') {
      return (
        <span className="dt-shift-time">
          {renderTimeValue(fullDayData.in, fullDayData.isLate)}
        </span>
      );
    }

    if (type === 'afternoon') {
      return (
        <span className="dt-shift-time">
          {renderTimeValue(fullDayData.out, fullDayData.isEarly)}
        </span>
      );
    }

    return <span className="dt-text-muted">—</span>;
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return <span className="dt-status dt-status-present">Present</span>;
      case 'LATE':
        return <span className="dt-status dt-status-late">Late</span>;
      case 'PARTIAL':
        return <span className="dt-status dt-status-partial">Partial</span>;
      case 'UPCOMING':
        return <span className="dt-status dt-status-upcoming">Upcoming</span>;
      case 'ABSENT':
        return <span className="dt-status dt-status-absent">Absent</span>;
      case 'WEEKEND':
        return <span className="dt-status dt-status-off">Weekend</span>;
      case 'HOLIDAY':
        return <span className="dt-status dt-status-holiday">Holiday</span>;
      default:
        return <span className="dt-status dt-status-off">Off</span>;
    }
  };

  return (
    <div className="daily-timesheet-container">
      {/* 1. Desktop Table View */}
      <table className="daily-timesheet-table">
        <thead>
          <tr>
            <th className="dt-col-id">No</th>
            <th className="dt-col-name">Name</th>
            <th className="dt-col-shift">Morning</th>
            <th className="dt-col-shift">Afternoon</th>
            <th className="dt-col-shift">Evening</th>
            <th className="dt-col-status">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="6" className="daily-timesheet-empty">
                No timesheet records found for this date.
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const isCleaner = row.role === 'cleaner' || row.fullDay !== null;

              return (
                <tr key={row.employeeId} className="daily-timesheet-row">
                  <td className="dt-cell-id">{index + 1}</td>
                  <td className="dt-cell-name">{row.employeeName}</td>
                  <td className="dt-cell-shift">
                    {isCleaner
                      ? renderCleanerShift(row.fullDay, 'morning')
                      : renderShiftTime(row.morning)}
                  </td>
                  <td className="dt-cell-shift">
                    {isCleaner
                      ? renderCleanerShift(row.fullDay, 'afternoon')
                      : renderShiftTime(row.afternoon)}
                  </td>
                  <td className="dt-cell-shift">{renderShiftTime(row.evening)}</td>
                  <td className="dt-cell-status">
                    {renderStatusBadge(row.dailyStatus)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* 2. Mobile Responsive Card List (Option 2: Zero Horizontal Scroll) */}
      <div className="daily-timesheet-mobile-list">
        {data.length === 0 ? (
          <div className="daily-timesheet-empty">
            No timesheet records found for this date.
          </div>
        ) : (
          data.map((row) => {
            const isCleaner = row.role === 'cleaner' || row.fullDay !== null;

            return (
              <div key={row.employeeId} className="dt-mobile-card">
                <div className="dt-mobile-header">
                  <div className="dt-mobile-employee">
                    <span className="dt-mobile-name">{row.employeeName}</span>
                  </div>
                  {renderStatusBadge(row.dailyStatus)}
                </div>

                <div className="dt-mobile-shifts-row">
                  <div className="dt-shift-item">
                    <span className="dt-shift-label">Morning</span>
                    <span className="dt-shift-val">
                      {isCleaner
                        ? renderCleanerShift(row.fullDay, 'morning')
                        : renderShiftTime(row.morning)}
                    </span>
                  </div>
                  <div className="dt-shift-item">
                    <span className="dt-shift-label">Afternoon</span>
                    <span className="dt-shift-val">
                      {isCleaner
                        ? renderCleanerShift(row.fullDay, 'afternoon')
                        : renderShiftTime(row.afternoon)}
                    </span>
                  </div>
                  <div className="dt-shift-item">
                    <span className="dt-shift-label">Evening</span>
                    <span className="dt-shift-val">
                      {renderShiftTime(row.evening)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
