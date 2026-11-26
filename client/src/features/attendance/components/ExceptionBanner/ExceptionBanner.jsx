import React, { useState } from 'react';
import './ExceptionBanner.css';
import { AlertTriangle, Clock, HelpCircle, ChevronDown, ChevronUp, UserPlus, CheckCircle2 } from 'lucide-react';

export default function ExceptionBanner({ exceptions = [], onRegisterUnknown }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!exceptions || exceptions.length === 0) {
    return (
      <div className="exception-banner success-banner">
        <div className="banner-left">
          <CheckCircle2 size={18} className="banner-icon success-icon" />
          <span className="banner-title">
            Normal Attendance: All scheduled staff are present on time with zero anomalies detected.
          </span>
        </div>
      </div>
    );
  }

  // Categorize exceptions
  const lateExceptions = exceptions.filter((e) => e.type === 'LATE');
  const unknownExceptions = exceptions.filter((e) => e.type === 'UNKNOWN_SCAN');
  const absentExceptions = exceptions.filter((e) => e.type === 'ABSENT');

  return (
    <div className="exception-banner warning-banner">
      <div className="banner-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="banner-left">
          <AlertTriangle size={18} className="banner-icon warning-icon" />
          <span className="banner-title">
            Attendance Exceptions Requiring Review ({exceptions.length} item{exceptions.length > 1 ? 's' : ''}):
          </span>
          <div className="banner-chips">
            {lateExceptions.length > 0 && (
              <span className="exception-chip chip-late">
                <Clock size={12} /> {lateExceptions.length} Late
              </span>
            )}
            {unknownExceptions.length > 0 && (
              <span className="exception-chip chip-unknown">
                <HelpCircle size={12} /> {unknownExceptions.length} Unregistered
              </span>
            )}
            {absentExceptions.length > 0 && (
              <span className="exception-chip chip-absent">
                {absentExceptions.length} Absent
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="expand-btn"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
        </button>
      </div>

      {isExpanded && (
        <div className="banner-details">
          <div className="exception-items-list">
            {exceptions.map((exc, idx) => (
              <div key={idx} className={`exception-item item-${exc.type.toLowerCase()}`}>
                <div className="item-message">
                  {exc.type === 'UNKNOWN_SCAN' ? (
                    <>
                      <HelpCircle size={14} className="item-icon" />
                      <span>
                        Unregistered scan: <strong>{exc.method}</strong> (ID: {exc.identifier}) at {exc.time}
                      </span>
                    </>
                  ) : exc.type === 'LATE' ? (
                    <>
                      <Clock size={14} className="item-icon" />
                      <span>{exc.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} className="item-icon" />
                      <span>{exc.message}</span>
                    </>
                  )}
                </div>

                {exc.type === 'UNKNOWN_SCAN' && onRegisterUnknown && (
                  <button
                    type="button"
                    className="assign-id-btn"
                    onClick={() =>
                      onRegisterUnknown({
                        scanned_identifier: exc.identifier,
                        scanned_method: exc.method,
                        id: null,
                      })
                    }
                  >
                    <UserPlus size={13} />
                    <span>Assign Staff</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
