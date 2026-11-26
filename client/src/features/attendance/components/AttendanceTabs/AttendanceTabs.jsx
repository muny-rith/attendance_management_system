import React from 'react';
import './AttendanceTabs.css';
import { CalendarCheck, Radio, Calendar, Activity } from 'lucide-react';

export default function AttendanceTabs({ activeTab, onTabChange, liveCount = 0 }) {
  const tabs = [
    {
      id: 'daily',
      label: 'Daily Timesheet',
      shortLabel: 'Daily',
      icon: CalendarCheck,
    },
    {
      id: 'presence',
      label: 'Live Presence',
      shortLabel: 'Presence',
      icon: Radio,
      badge: liveCount > 0 ? liveCount : null,
      isLive: true,
    },
    {
      id: 'monthly',
      label: 'Monthly Grid',
      shortLabel: 'Monthly',
      icon: Calendar,
    },
    {
      id: 'logs',
      label: 'Raw Activity Logs',
      shortLabel: 'Activity Log',
      icon: Activity,
    },
  ];

  return (
    <div className="attendance-tabs-container">
      <div className="attendance-tabs-nav" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              className={`attendance-tab-btn ${isActive ? 'tab-active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon size={16} className={tab.isLive && isActive ? 'pulse-icon' : ''} />
              <span className="tab-title-full">{tab.label}</span>
              <span className="tab-title-short">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
