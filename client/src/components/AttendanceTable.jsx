import React from 'react';
import { Fingerprint, CreditCard, Clock, HelpCircle } from 'lucide-react';
import './AttendanceTable.css';

const AttendanceTable = ({ logs, onRegisterClick }) => {
  return (
    <div className="table-container">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Method</th>
            <th>Identifier</th>
            <th>Shift</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty-state">No attendance logs found.</td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="table-row">
                <td>#{log.id}</td>
                <td className="employee-name">
                  {log.name ? (
                    log.name
                  ) : (
                    <span className="text-unknown">Unknown User</span>
                  )}
                </td>
                <td className="method-cell">
                  {log.scanned_method === 'fingerprint' ? (
                    <span className="badge fingerprint" title="Fingerprint">
                      <Fingerprint size={16} />
                      <span className="badge-text">Fingerprint</span>
                    </span>
                  ) : log.scanned_method === 'rfid' ? (
                    <span className="badge rfid" title="RFID Card">
                      <CreditCard size={16} />
                      <span className="badge-text">RFID Card</span>
                    </span>
                  ) : (
                    <span className="badge unknown" title="Unknown">
                      <HelpCircle size={16} />
                      <span className="badge-text">Unknown</span>
                    </span>
                  )}
                </td>
                <td className="identifier">{log.scanned_identifier || '-'}</td>
                <td>
                  {log.shift_title ? (
                    <span className={`shift-badge shift-${log.shift_title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {log.shift_title}
                    </span>
                  ) : (
                    <span className="shift-badge shift-none">—</span>
                  )}
                </td>
                <td className="timestamp">
                  <Clock size={16} className="clock-icon" />
                  <span className="time-full">
                    {new Date(log.timestamp).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',

                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </span>
                  <span className="time-short">
                    {new Date(log.timestamp).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </span>
                </td>

              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
