import React from 'react';
import './KPICards.css';
import { Users, UserCheck, Clock, UserX, TrendingUp } from 'lucide-react';

export default function KPICards({ kpi }) {
  if (!kpi) return null;

  const {
    totalScheduled = 0,
    presentCount = 0,
    onTimeCount = 0,
    lateCount = 0,
    absentCount = 0,
    attendanceRate = 0,
  } = kpi;

  return (
    <div className="kpi-grid">
      <div className="kpi-card kpi-scheduled">
        <div className="kpi-icon-wrapper scheduled-icon">
          <Users size={20} />
        </div>
        <div className="kpi-details">
          <span className="kpi-label">Scheduled Staff</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{totalScheduled}</span>
            <span className="kpi-unit">staff</span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-present">
        <div className="kpi-icon-wrapper present-icon">
          <UserCheck size={20} />
        </div>
        <div className="kpi-details">
          <span className="kpi-label">Present</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{presentCount}</span>
            <span className="kpi-subtext">/ {totalScheduled}</span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-ontime">
        <div className="kpi-icon-wrapper ontime-icon">
          <Clock size={20} />
        </div>
        <div className="kpi-details">
          <span className="kpi-label">On-Time</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{onTimeCount}</span>
            <span className="kpi-tag ontime-tag">
              {totalScheduled > 0 ? Math.round((onTimeCount / totalScheduled) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-late">
        <div className="kpi-icon-wrapper late-icon">
          <Clock size={20} />
        </div>
        <div className="kpi-details">
          <span className="kpi-label">Late Arrival</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{lateCount}</span>
            {lateCount > 0 && <span className="kpi-tag late-tag">Needs Review</span>}
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-absent">
        <div className="kpi-icon-wrapper absent-icon">
          <UserX size={20} />
        </div>
        <div className="kpi-details">
          <span className="kpi-label">Absent</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{absentCount}</span>
            {absentCount > 0 && <span className="kpi-tag absent-tag">Not Scanned</span>}
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-rate">
        <div className="kpi-icon-wrapper rate-icon">
          <TrendingUp size={20} />
        </div>
        <div className="kpi-details">
          <span className="kpi-label">Attendance Rate</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{attendanceRate}%</span>
            <div className="kpi-progress-bar">
              <div
                className="kpi-progress-fill"
                style={{ width: `${Math.min(100, attendanceRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
