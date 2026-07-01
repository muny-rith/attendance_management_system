import React, { useState, useEffect } from 'react';
import { fetchEmployees, addEmployee, deleteEmployee, editEmployee, checkHardwareOnline, setHardwareMode } from '../services/api';
import { Trash2, UserPlus, Pencil, X, CheckCircle, AlertCircle, RefreshCw, Cpu, Fingerprint, CreditCard } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3000';

const EmployeeManager = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [enrollStep, setEnrollStep] = useState('none'); // 'checking', 'offline', 'select', 'scanning', 'final', 'edit'
  
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState('fingerprint');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  useEffect(() => {
    loadEmployees();

    // Setup websocket listener for enrollment
    const socket = io(API_URL);
    socket.on('enroll_success', (data) => {
      setIdentifier(data.identifier);
      setEnrollStep('final');
    });

    return () => socket.disconnect();
  }, []);

  const loadEmployees = async () => {
    const data = await fetchEmployees();
    setEmployees(data);
    setLoading(false);
  };

  const openAddModal = async () => {
    setEditingId(null);
    setName('');
    setIdentifier('');
    setMethod('fingerprint');
    setStatusMessage({ type: '', text: '' });
    setShowModal(true);
    
    // Start active enrollment flow
    setEnrollStep('checking');
    const { isOnline } = await checkHardwareOnline();
    
    if (isOnline) {
      setEnrollStep('select');
    } else {
      setEnrollStep('offline');
    }
  };

  const handleEditClick = (emp) => {
    setEditingId(emp.id);
    setName(emp.name);
    setIdentifier(emp.identifier);
    setMethod(emp.method);
    setStatusMessage({ type: '', text: '' });
    setEnrollStep('edit');
    setShowModal(true);
  };

  const closeModal = async () => {
    // If we were scanning, tell hardware to go back to normal
    if (enrollStep === 'scanning') {
      await setHardwareMode('attendance');
    }
    setShowModal(false);
    setEnrollStep('none');
  };

  const startScanning = async () => {
    setEnrollStep('scanning');
    const hwMode = method === 'fingerprint' ? 'enroll_fingerprint' : 'enroll_rfid';
    await setHardwareMode(hwMode);
  };

  const handleManualAddOrEdit = async (e) => {
    e.preventDefault();
    if (!name || !identifier) return;
    
    setIsSubmitting(true);
    setStatusMessage({ type: '', text: '' });
    
    let result;
    if (editingId) {
      result = await editEmployee(editingId, { name, identifier, method });
    } else {
      result = await addEmployee({ name, identifier, method });
    }
    
    setIsSubmitting(false);

    if (result && result.success !== false) {
      setStatusMessage({ type: 'success', text: editingId ? 'Employee updated successfully!' : 'Employee added successfully!' });
      loadEmployees();
      // Close modal after a short delay
      setTimeout(() => {
        closeModal();
      }, 1500);
    } else {
      setStatusMessage({ type: 'error', text: 'Failed to save employee. Identifier may already exist.' });
    }
  };

  const confirmDelete = (emp) => {
    setEmployeeToDelete(emp);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    await deleteEmployee(employeeToDelete.id);
    setEmployeeToDelete(null);
    loadEmployees();
  };

  // Render Modal Content based on enrollStep
  const renderModalContent = () => {
    if (enrollStep === 'checking') {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <RefreshCw size={40} className="pulse-icon" style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }} />
          <h3>Checking Machine Status...</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Looking for active ESP32 connection on the network.</p>
        </div>
      );
    }

    if (enrollStep === 'offline') {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Cpu size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3 style={{ color: '#ef4444' }}>Machine is Offline</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            We cannot initiate hardware enrollment because the machine is not responding. Please make sure it is powered on and connected to WiFi.
          </p>
          <button onClick={closeModal} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            Cancel
          </button>
        </div>
      );
    }

    if (enrollStep === 'select') {
      return (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <h3 style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CheckCircle size={20} /> Machine is Online
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Select the authentication method to enroll:</p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
            <button 
              type="button"
              onClick={() => setMethod('fingerprint')}
              style={{
                flex: 1,
                padding: '1.5rem',
                borderRadius: '12px',
                background: method === 'fingerprint' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: method === 'fingerprint' ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: method === 'fingerprint' ? 'var(--accent-cyan)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Fingerprint size={32} />
              <span style={{ fontWeight: 600 }}>Fingerprint</span>
            </button>

            <button 
              type="button"
              onClick={() => setMethod('rfid')}
              style={{
                flex: 1,
                padding: '1.5rem',
                borderRadius: '12px',
                background: method === 'rfid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: method === 'rfid' ? '1px solid var(--accent-green)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: method === 'rfid' ? 'var(--accent-green)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CreditCard size={32} />
              <span style={{ fontWeight: 600 }}>RFID Card</span>
            </button>
          </div>

          <button onClick={startScanning} style={{ background: 'var(--accent-cyan)', color: '#000', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', width: '100%' }}>
            Start Enrollment
          </button>
        </div>
      );
    }

    if (enrollStep === 'scanning') {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {method === 'fingerprint' ? (
            <Fingerprint size={60} className="pulse-icon" style={{ color: 'var(--accent-cyan)', margin: '0 auto 1.5rem' }} />
          ) : (
            <CreditCard size={60} className="pulse-icon" style={{ color: 'var(--accent-green)', margin: '0 auto 1.5rem' }} />
          )}
          <h3 style={{ marginBottom: '1rem' }}>Waiting for Hardware...</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            {method === 'fingerprint' 
              ? 'Please follow the instructions on the physical machine screen to scan your finger.'
              : 'Please tap your RFID card on the physical machine now.'}
          </p>
          <button onClick={closeModal} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer' }}>
            Cancel Enrollment
          </button>
        </div>
      );
    }

    if (enrollStep === 'final' || enrollStep === 'edit') {
      return (
        <div>
          <h2>{editingId ? <Pencil size={24} /> : <UserPlus size={24} />} {editingId ? 'Edit Employee' : 'Complete Enrollment'}</h2>
          
          {enrollStep === 'final' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <CheckCircle size={20} /> Successfully scanned from hardware!
            </div>
          )}

          {statusMessage.text && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: statusMessage.type === 'success' ? 'var(--accent-green)' : '#ef4444',
              border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {statusMessage.text}
            </div>
          )}

          <form className="register-form" onSubmit={handleManualAddOrEdit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Authentication Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={enrollStep === 'final'}>
                <option value="rfid">RFID Card</option>
                <option value="fingerprint">Fingerprint</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Identifier (ID/UID)</label>
              <input 
                type="text" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required 
                readOnly={enrollStep === 'final'}
                style={{ background: enrollStep === 'final' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.05)' }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Employee Name</label>
              <input 
                type="text" 
                placeholder="e.g. Alice Smith" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                autoFocus
              />
            </div>
            
            <button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
              {isSubmitting ? 'Saving...' : editingId ? 'Update Employee' : 'Save Employee'}
            </button>
          </form>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="employee-manager">
      <div className="table-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2>Registered Employees</h2>
          <div className="records-count">{employees.length} Employees</div>
        </div>
        <button onClick={openAddModal} className="export-btn" style={{ background: 'var(--accent-green)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#fff' }}>
          <UserPlus size={18} /> Add Employee
        </button>
      </div>

      <div className="table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Method</th>
              <th>Identifier</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="table-row"><td colSpan="5" className="empty-state">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr className="table-row"><td colSpan="5" className="empty-state">No employees found.</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} className="table-row">
                  <td>#{emp.id}</td>
                  <td className="employee-name">{emp.name}</td>
                  <td><span className={`badge ${emp.method}`}>{emp.method}</span></td>
                  <td className="identifier">{emp.identifier}</td>
                  <td className="action-cells">
                    <button onClick={() => handleEditClick(emp)} className="edit-btn" title="Edit Employee">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => confirmDelete(emp)} className="delete-btn" title="Delete Employee">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
            <Trash2 size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h3 style={{ marginBottom: '1rem' }}>Delete Employee?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{employeeToDelete.name}</strong>? This will permanently remove their access and delete their biometric data from the machine.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setEmployeeToDelete(null)} 
                style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete} 
                style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Modal Overlay */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={closeModal}><X size={24} /></button>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManager;
