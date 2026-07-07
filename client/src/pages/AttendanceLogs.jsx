import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Header from '../components/Header';
import AttendanceTable from '../components/AttendanceTable';
import RegistrationModal from '../components/RegistrationModal';
import { fetchAttendanceLogs } from '../services/api';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

export default function AttendanceLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registerLog, setRegisterLog] = useState(null);

  const loadData = async () => {
    const data = await fetchAttendanceLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    socket.on('new_scan', (newLog) => {
      setLogs((prevLogs) => [newLog, ...prevLogs]);
    });

    return () => {
      socket.off('new_scan');
    };
  }, []);

  const handleRegisterSuccess = () => {
    setRegisterLog(null);
    loadData();
  };

  return (
    <>
      {registerLog && (
        <RegistrationModal 
          log={registerLog} 
          onClose={() => setRegisterLog(null)} 
          onRegisterSuccess={handleRegisterSuccess} 
        />
      )}
      
      <Header logs={logs} />
      
      <main className="main-content">
        <div className="table-header">
          <h2>Recent Activity</h2>
          <div className="records-count">{logs.length} Records</div>
        </div>
        
        {loading ? (
          <div className="loading-spinner">Loading logs...</div>
        ) : (
          <AttendanceTable logs={logs} onRegisterClick={setRegisterLog} />
        )}
      </main>
    </>
  );
}
