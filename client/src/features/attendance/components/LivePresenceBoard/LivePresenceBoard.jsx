import React, { useState, useEffect, useCallback } from 'react';
import './LivePresenceBoard.css';
import { useSocket } from '../../../../shared/context/SocketContext';
import { fetchLivePresence } from '../../services/attendanceApi';
import { Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LivePresenceBoard() {
  const [presenceData, setPresenceData] = useState({
    currentTime: '--:--',
    onCampusCount: 0,
    totalEmployees: 0,
    presenceList: [],
  });
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const { socket } = useSocket();

  const loadPresence = useCallback(async () => {
    setLoading(true);
    const data = await fetchLivePresence();
    setPresenceData(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPresence();
  }, [loadPresence]);

  useEffect(() => {
    if (!socket) return;
    const handleNewScan = () => loadPresence();
    socket.on('new_scan', handleNewScan);
    return () => socket.off('new_scan', handleNewScan);
  }, [socket, loadPresence]);

  const { presenceList = [], totalEmployees = 0, currentTime = '--:--' } = presenceData;

  const filteredStaff = presenceList.filter((p) => {
    const matchesQuery =
      !filterQuery ||
      p.employeeName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (p.role && p.role.toLowerCase().includes(filterQuery.toLowerCase()));

    if (!matchesQuery) return false;
    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'ON_CAMPUS') return p.presenceStatus === 'ON_CAMPUS';
    if (activeCategory === 'NOT_ARRIVED') return p.presenceStatus === 'ABSENT';
    if (activeCategory === 'UPCOMING') return p.presenceStatus === 'UPCOMING';
    if (activeCategory === 'CHECKED_OUT') return p.presenceStatus === 'CHECKED_OUT';
    return true;
  });

  const onCampusStaff = presenceList.filter((p) => p.presenceStatus === 'ON_CAMPUS');
  const notArrivedStaff = presenceList.filter((p) => p.presenceStatus === 'ABSENT');
  const upcomingStaff = presenceList.filter((p) => p.presenceStatus === 'UPCOMING');
  const checkedOutStaff = presenceList.filter((p) => p.presenceStatus === 'CHECKED_OUT');

  return (
    <div className="presence-board-wrapper">
      {/* Category Pills & Refresh */}
      <div className="presence-toolbar">
        <div className="presence-counters-bar">
          <button
            type="button"
            className={`counter-pill ${activeCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveCategory('ALL')}
          >
            <Users size={14} />
            <span>All ({totalEmployees})</span>
          </button>

          <button
            type="button"
            className={`counter-pill counter-on-campus ${activeCategory === 'ON_CAMPUS' ? 'active' : ''}`}
            onClick={() => setActiveCategory('ON_CAMPUS')}
          >
            <span className="live-dot-green" />
            <span>On Campus ({onCampusStaff.length})</span>
          </button>

          <button
            type="button"
            className={`counter-pill counter-not-arrived ${activeCategory === 'NOT_ARRIVED' ? 'active' : ''}`}
            onClick={() => setActiveCategory('NOT_ARRIVED')}
          >
            <AlertCircle size={14} />
            <span>Not Arrived ({notArrivedStaff.length})</span>
          </button>

          <button
            type="button"
            className={`counter-pill counter-upcoming ${activeCategory === 'UPCOMING' ? 'active' : ''}`}
            onClick={() => setActiveCategory('UPCOMING')}
          >
            <Clock size={14} />
            <span>Upcoming ({upcomingStaff.length})</span>
          </button>

          <button
            type="button"
            className={`counter-pill counter-checked-out ${activeCategory === 'CHECKED_OUT' ? 'active' : ''}`}
            onClick={() => setActiveCategory('CHECKED_OUT')}
          >
            <CheckCircle2 size={14} />
            <span>Checked Out ({checkedOutStaff.length})</span>
          </button>
        </div>
      </div>

      {/* Grid of Presence Cards */}
      {loading ? (
        <div className="table-container">
          <div className="empty-state">Loading campus presence...</div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">No staff match the current filter.</div>
        </div>
      ) : (
        <div className="presence-cards-grid">
          {filteredStaff.map((staff) => {
            const isOnCampus = staff.presenceStatus === 'ON_CAMPUS';
            const isAbsent = staff.presenceStatus === 'ABSENT';
            const isUpcoming = staff.presenceStatus === 'UPCOMING';

            return (
              <div
                key={staff.employeeId}
                className={`presence-card ${
                  isOnCampus
                    ? 'card-on-campus'
                    : isAbsent
                    ? 'card-absent'
                    : isUpcoming
                    ? 'card-upcoming'
                    : 'card-checked-out'
                }`}
              >
                <div className="presence-card-top">
                  <div className="presence-avatar">
                    {staff.employeeName.slice(0, 2)}
                    {isOnCampus && <span className="presence-status-dot" />}
                  </div>
                  <div className="presence-card-meta">
                    <span className="presence-staff-name">{staff.employeeName}</span>
                    <span className="presence-staff-role">
                      {staff.role === 'cleaner'
                        ? 'Cleaner'
                        : staff.role === 'staff'
                        ? 'Admin'
                        : 'Teacher'}
                    </span>
                  </div>
                </div>

                <div className="presence-status-box">
                  <span className="presence-status-text">
                    {staff.presenceLabel || 'No activity'}
                  </span>
                  {staff.currentActivity && (
                    <span className="presence-activity-badge">
                      {staff.currentActivity}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
