import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Clock, Sparkles, ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './DateRangeFilter.css';

export const DATE_PRESETS = [
  { id: 'today', label: 'Today', icon: Clock, badge: '1D' },
  { id: 'this_week', label: 'This Week', icon: Calendar, badge: 'Week' },
  { id: 'this_month', label: 'This Month', icon: Calendar, badge: 'Month' },
  { id: 'last_month', label: 'Last Month', icon: Calendar, badge: 'Prev' },
];

/**
 * Checks whether a post's date (published_time, scheduled_time, or created_at)
 * falls within the selected date preset or custom date range.
 */
export const isPostInDateRange = (post, filterKey, customStart, customEnd) => {
  if (!filterKey || filterKey === 'all') return true;

  const rawDate = post?.published_time || post?.scheduled_time || post?.created_at;
  if (!rawDate) return false;

  const postDate = new Date(rawDate);
  if (isNaN(postDate.getTime())) return false;

  const now = new Date();

  switch (filterKey) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case 'yesterday': {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case '7days': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return postDate >= start && postDate <= now;
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case '30days': {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return postDate >= start && postDate <= now;
    }
    case '90days': {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return postDate >= start && postDate <= now;
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case 'custom': {
      if (!customStart && !customEnd) return true;
      if (customStart) {
        const start = new Date(customStart + 'T00:00:00');
        if (postDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd + 'T23:59:59.999');
        if (postDate > end) return false;
      }
      return true;
    }
    default:
      return true;
  }
};

export const DateRangeFilter = ({
  mode = 'range', // 'range' | 'single'
  value = 'today',
  onChange,
  customRange = { start: '', end: '' },
  onCustomRangeChange,
  align = 'auto', // 'auto' | 'left' | 'right'
  defaultPreset = 'today',
  placeholder = 'Today',
  isOpen: controlledIsOpen,
  onOpenChange,
  disableActiveColor = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const setIsOpen = (next) => {
    const val = typeof next === 'function' ? next(isOpen) : next;
    if (isControlled) {
      onOpenChangeRef.current?.(val);
    } else {
      setInternalIsOpen(val);
    }
  };
  const [localStart, setLocalStart] = useState(customRange.start || '');
  const [localEnd, setLocalEnd] = useState(customRange.end || '');
  const [dropdownAlign, setDropdownAlign] = useState(align === 'right' ? 'right' : 'left');
  const ref = useRef(null);

  // Embedded calendar state (Option 2)
  const initialDate = localStart ? new Date(localStart) : new Date();
  const [calMonth, setCalMonth] = useState(isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth());
  const [calYear, setCalYear] = useState(isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear());

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const prevMonth = (e) => {
    e.stopPropagation();
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleDayClick = (dayNum) => {
    const pad = (n) => String(n).padStart(2, '0');
    const dayStr = `${calYear}-${pad(calMonth + 1)}-${pad(dayNum)}`;

    if (mode === 'single') {
      setLocalStart(dayStr);
      setLocalEnd(dayStr);
      if (onCustomRangeChange) {
        onCustomRangeChange({ start: dayStr, end: dayStr });
      }
      setIsOpen(false);
      return;
    }

    if (!localStart || (localStart && localEnd)) {
      setLocalStart(dayStr);
      setLocalEnd('');
    } else if (localStart && !localEnd) {
      if (dayStr >= localStart) {
        setLocalEnd(dayStr);
      } else {
        setLocalStart(dayStr);
        setLocalEnd('');
      }
    }
  };

  // Sync internal state when props change
  useEffect(() => {
    const nextStart = customRange.start || '';
    const nextEnd = customRange.end || '';
    setLocalStart(nextStart);
    setLocalEnd(nextEnd);

    if (nextStart) {
      const d = new Date(nextStart + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setCalMonth(d.getMonth());
        setCalYear(d.getFullYear());
      }
    }
  }, [customRange.start, customRange.end]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isControlled]);

  // Compute alignment when opened so it never clips off-screen
  useEffect(() => {
    if (!isOpen) return;
    if (align === 'left') {
      setDropdownAlign('left');
      return;
    }
    if (align === 'right') {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const menuWidth = window.innerWidth <= 768 ? 280 : 320;
        if (rect.right - menuWidth < 8) {
          setDropdownAlign('left');
          return;
        }
      }
      setDropdownAlign('right');
      return;
    }
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuWidth = window.innerWidth <= 768 ? 280 : 320;
      if (rect.left + menuWidth > window.innerWidth - 16) {
        setDropdownAlign('right');
      } else {
        setDropdownAlign('left');
      }
    }
  }, [isOpen, align]);

  const handleSelectPreset = (presetId) => {
    if (mode === 'single') {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      let target = '';
      if (presetId === 'today') {
        target = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      } else if (presetId === 'yesterday') {
        now.setDate(now.getDate() - 1);
        target = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      }
      if (target) {
        setLocalStart(target);
        setLocalEnd(target);
        onCustomRangeChange?.({ start: target, end: target });
      }
      onChange(presetId);
      setIsOpen(false);
      return;
    }

    onChange(presetId);
    setIsOpen(false);
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (onCustomRangeChange) {
      onCustomRangeChange({ start: localStart, end: localEnd });
    }
    onChange('custom');
    setIsOpen(false);
  };

  const handleClearCustom = () => {
    setLocalStart('');
    setLocalEnd('');
    if (onCustomRangeChange) {
      onCustomRangeChange({ start: '', end: '' });
    }
    onChange(defaultPreset);
    setIsOpen(false);
  };

  // Determine active presets & current display label
  const activePresets = mode === 'single'
    ? [
      { id: 'today', label: 'Today', icon: Clock, badge: '1D' },
      { id: 'yesterday', label: 'Yesterday', icon: Clock, badge: '1D' },
    ]
    : DATE_PRESETS;

  const selectedPreset = activePresets.find((p) => p.id === value);
  const TriggerIcon = selectedPreset?.icon || Calendar;
  let displayLabel = selectedPreset?.label || placeholder;
  let shortDisplayLabel = displayLabel;

  if (mode === 'single') {
    if (customRange?.start) {
      const d = new Date(customRange.start + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        displayLabel = d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        shortDisplayLabel = d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
      } else {
        displayLabel = customRange.start;
        shortDisplayLabel = customRange.start;
      }
    } else if (value === 'today') {
      displayLabel = 'Today';
      shortDisplayLabel = 'Today';
    }
  } else if (value === 'custom') {
    if (customRange.start && customRange.end) {
      displayLabel = `${customRange.start} → ${customRange.end}`;
      shortDisplayLabel = 'Range';
    } else if (customRange.start) {
      displayLabel = `From ${customRange.start}`;
      shortDisplayLabel = customRange.start;
    } else if (customRange.end) {
      displayLabel = `Until ${customRange.end}`;
      shortDisplayLabel = customRange.end;
    } else {
      displayLabel = 'Custom Range';
      shortDisplayLabel = 'Custom';
    }
  }

  // Only highlight as 'filtered' when different from defaultPreset or in custom range
  const isFiltered = Boolean(
    mode !== 'single' &&
    !disableActiveColor &&
    ((value && value !== defaultPreset) ||
      (value === 'custom' && (customRange?.start || customRange?.end)))
  );

  return (
    <div ref={ref} className="drf-container">
      <button
        type="button"
        className={`drf-trigger-btn ${isFiltered ? 'is-filtered' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="drf-trigger-left">
          <TriggerIcon size={14} className="drf-trigger-icon" />
          <span className="drf-label-full">{displayLabel}</span>
          <span className="drf-label-short">{shortDisplayLabel}</span>
        </div>
        <ChevronDown
          size={14}
          className="drf-chevron"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>

      {isOpen && (
        <div className={`drf-dropdown ${dropdownAlign === 'right' ? 'align-right' : 'align-left'}`}>
          {/* Quick Presets Grid */}
          <div className="drf-presets-list">
            {activePresets.map((preset) => {
              const isSelected = value === preset.id;
              const PresetIcon = preset.icon;

              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`drf-preset-item ${isSelected ? 'active' : ''}`}
                >
                  <div className="drf-preset-item-label">
                    <PresetIcon size={14} className="drf-trigger-icon" />
                    <span>{preset.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="drf-preset-badge">{preset.badge}</span>
                    {isSelected && <Check size={14} className="drf-check-icon" strokeWidth={2.5} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Date Range Section (Option 2: Embedded Calendar Grid) */}
          <div className="drf-calendar-section">
            {/* Calendar Month Header */}
            <div className="drf-calendar-header">
              <span className="drf-calendar-title">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <div className="drf-nav-group">
                <button
                  type="button"
                  className="drf-nav-btn"
                  onClick={prevMonth}
                  title="Previous Month"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  className="drf-nav-btn"
                  onClick={nextMonth}
                  title="Next Month"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Days Grid */}
            <div className="drf-weekdays-grid">
              {WEEKDAYS.map((w) => (
                <div key={w} className="drf-weekday">
                  {w}
                </div>
              ))}
            </div>

            <div className="drf-days-grid">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const pad = (n) => String(n).padStart(2, '0');
                const dayStr = `${calYear}-${pad(calMonth + 1)}-${pad(d)}`;
                const isStart = dayStr === localStart;
                const isEnd = dayStr === localEnd;
                const inRange =
                  localStart && localEnd && dayStr > localStart && dayStr < localEnd;

                let stateClass = '';
                if (mode === 'single') {
                  if (dayStr === localStart) {
                    stateClass = 'range-start range-end range-single';
                  }
                } else if (isStart && isEnd) {
                  stateClass = 'range-start range-end';
                } else if (isStart) {
                  stateClass = 'range-start' + (!localEnd ? ' range-single' : '');
                } else if (isEnd) {
                  stateClass = 'range-end';
                } else if (inRange) {
                  stateClass = 'range-between';
                }

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDayClick(d)}
                    className={`drf-day-btn ${stateClass}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Quick Today button for single mode */}
            {mode === 'single' && (
              <div className="drf-single-footer">
                <button
                  type="button"
                  className="drf-today-btn"
                  onClick={() => {
                    const now = new Date();
                    const pad = (n) => String(n).padStart(2, '0');
                    const todayFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                    setLocalStart(todayFormatted);
                    setLocalEnd(todayFormatted);
                    setCalMonth(now.getMonth());
                    setCalYear(now.getFullYear());
                    onCustomRangeChange?.({ start: todayFormatted, end: todayFormatted });
                    onChange?.('today');
                    setIsOpen(false);
                  }}
                >
                  Today
                </button>
              </div>
            )}

            {/* Range Selection Label & Actions (Range Mode Only) */}
            {mode !== 'single' && (
              <>
                <div className="drf-summary-box">
                  {localStart ? (
                    localEnd ? (
                      <span>
                        Selected: <strong>{localStart}</strong> → <strong>{localEnd}</strong>
                      </span>
                    ) : (
                      <span>
                        Start: <strong>{localStart}</strong> (Click end date)
                      </span>
                    )
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Click dates on calendar to select range</span>
                  )}
                </div>

                <div className="drf-actions">
                  <button
                    type="button"
                    className="drf-apply-btn"
                    onClick={handleApplyCustom}
                    disabled={!localStart}
                  >
                    Apply Range
                  </button>
                  {(localStart || localEnd || value === 'custom') && (
                    <button
                      type="button"
                      className="drf-reset-btn"
                      onClick={handleClearCustom}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
