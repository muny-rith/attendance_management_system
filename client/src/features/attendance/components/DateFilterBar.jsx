import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import DateRangeFilter from '../../../shared/components/ui/DateRangeFilter';
import './DateFilterBar.css';

const DateFilterBar = ({
  search,
  onSearchChange,
  isDaily = false,
  selectedDate,
  onSingleDateChange,
  todayStr,
  preset,
  onPresetChange,
  startDate,
  endDate,
  onCustomRangeChange,
}) => {
  const handlePrevDay = () => {
    const current = new Date(selectedDate || new Date());
    current.setDate(current.getDate() - 1);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    onSingleDateChange(`${y}-${m}-${d}`);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate || new Date());
    current.setDate(current.getDate() + 1);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    onSingleDateChange(`${y}-${m}-${d}`);
  };

  return (
    <div className="filter-toolbar">
      {/* 1. Search Box */}
      <div className="search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search employee or identifier..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-controls-group">
        {isDaily ? (
          /* 2. Direct Single Date Picker using MoonPulse Popover */
          <div className="daily-filter-control">
            <button
              type="button"
              className="date-nav-arrow"
              onClick={handlePrevDay}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            <DateRangeFilter
              mode="single"
              value={selectedDate === todayStr ? 'today' : 'custom'}
              onChange={(val) => {
                if (val === 'today' && todayStr) {
                  onSingleDateChange(todayStr);
                } else if (val === 'yesterday') {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  const pad = (n) => String(n).padStart(2, '0');
                  onSingleDateChange(`${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`);
                }
              }}
              customRange={{
                start: selectedDate || startDate,
                end: selectedDate || endDate,
              }}
              onCustomRangeChange={({ start }) => {
                if (start) onSingleDateChange(start);
              }}
              align="right"
            />

            <button
              type="button"
              className="date-nav-arrow"
              onClick={handleNextDay}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          /* 3. Range Filter for Raw Logs */
          <DateRangeFilter
            value={preset || 'today'}
            onChange={onPresetChange}
            customRange={{ start: startDate, end: endDate }}
            onCustomRangeChange={onCustomRangeChange}
            defaultPreset="today"
            placeholder="Today"
            align="right"
          />
        )}
      </div>
    </div>
  );
};

export default DateFilterBar;
