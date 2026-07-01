import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header';
import AttendanceTable from './components/AttendanceTable';
import EmployeeManager from './components/EmployeeManager';
import RegistrationModal from './components/RegistrationModal';
import { fetchAttendanceLogs } from './services/api';
import { Users, FileText } from 'lucide-react';
import './index.css';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

const App = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logs');
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
    loadData(); // Reload logs so they show the new name
  };

  return (
    <div className="app-container">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      
      {registerLog && (
        <RegistrationModal 
          log={registerLog} 
          onClose={() => setRegisterLog(null)} 
          onRegisterSuccess={handleRegisterSuccess} 
        />
      )}
      
      <div className="content-wrapper">
        <Header logs={logs} />
        
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <FileText size={18} /> Attendance Logs
          </button>
          <button 
            className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            <Users size={18} /> Manage Employees
          </button>
        </div>

        <main className="main-content">
          {activeTab === 'logs' ? (
            <>
              <div className="table-header">
                <h2>Recent Activity</h2>
                <div className="records-count">{logs.length} Records</div>
              </div>
              
              {loading ? (
                <div className="loading-spinner">Loading logs...</div>
              ) : (
                <AttendanceTable logs={logs} onRegisterClick={setRegisterLog} />
              )}
            </>
          ) : (
            <EmployeeManager />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
