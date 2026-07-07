import React from 'react';
import { Activity, Download } from 'lucide-react';
import './Header.css';

const Header = ({ logs = [] }) => {
  const exportToCSV = () => {
    if (logs.length === 0) return alert("No logs to export");

    const headers = ["ID", "Employee Name", "Method", "Identifier", "Shift", "Timestamp"];
    const csvRows = [headers.join(",")];

    logs.forEach(log => {
      const row = [
        log.id,
        `"${log.name || 'Unknown User'}"`,
        log.scanned_method || '',
        `"${log.scanned_identifier || ''}"`,
        `"${log.shift_title || ''}"`,
        `"${new Date(log.timestamp).toLocaleString()}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `attendance_logs_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <header className="glass-header">
      <div className="header-content">
        <h1>Attendance<span> Moon</span></h1>

        <div className="header-actions">
          <button className="export-btn" onClick={exportToCSV}>
            <Download size={16} /> Export CSV
          </button>

          <div className="status-indicator">
            <Activity size={18} className="pulse-icon" />
            <span>Live Sync</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
