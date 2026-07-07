import React, { useState, useEffect } from 'react';
import { fetchEmployees, fetchShifts, addEmployee, deleteEmployee, editEmployee, checkHardwareOnline, setHardwareMode } from '../services/api';
import { Trash2, UserPlus, Pencil, X, CheckCircle, AlertCircle, RefreshCw, Cpu, Fingerprint, CreditCard, Plus, Clock } from 'lucide-react';
import { io } from 'socket.io-client';
import './Employees.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [enrollStep, setEnrollStep] = useState('none');

  const [name, setName] = useState('');
  const [identifiers, setIdentifiers] = useState([{ identifier: '', method: 'fingerprint', label: '' }]);
  const [selectedShiftIds, setSelectedShiftIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [enrollingIndex, setEnrollingIndex] = useState(0); // which identifier slot is being enrolled

  useEffect(() => {
    loadEmployees();
    loadShifts();

    const socket = io(API_URL);
    socket.on('enroll_success', (data) => {
      setIdentifiers(prev => {
        const updated = [...prev];
        updated[enrollingIndex] = { ...updated[enrollingIndex], identifier: data.identifier };
        return updated;
      });
      setEnrollStep('final');
    });

    return () => socket.disconnect();
  }, []);

  const loadEmployees = async () => {
    const data = await fetchEmployees();
    setEmployees(data);
    setLoading(false);
  };

  const loadShifts = async () => {
    const data = await fetchShifts();
    setShifts(data);
  };

  const openAddModal = async () => {
    setEditingId(null);
    setName('');
    setIdentifiers([{ identifier: '', method: 'fingerprint', label: '' }]);
    setSelectedShiftIds([]);
    setStatusMessage({ type: '', text: '' });
    setShowModal(true);
    setEnrollingIndex(0);

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
    setIdentifiers(
      emp.identifiers && emp.identifiers.length > 0
        ? emp.identifiers.map(i => ({ identifier: i.identifier, method: i.method, label: i.label || '' }))
        : [{ identifier: '', method: 'fingerprint', label: '' }]
    );
    setSelectedShiftIds(emp.shifts ? emp.shifts.map(s => s.shift_id) : []);
    setStatusMessage({ type: '', text: '' });
    setEnrollStep('edit');
    setShowModal(true);
  };

  const closeModal = async () => {
    if (enrollStep === 'scanning') {
      await setHardwareMode('attendance');
    }
    setShowModal(false);
    setEnrollStep('none');
  };

  const startScanning = async (index) => {
    setEnrollingIndex(index);
    setEnrollStep('scanning');
    const method = identifiers[index]?.method || 'fingerprint';
    const hwMode = method === 'fingerprint' ? 'enroll_fingerprint' : 'enroll_rfid';
    await setHardwareMode(hwMode);
  };

  // Identifier management
  const addIdentifierSlot = () => {
    setIdentifiers(prev => [...prev, { identifier: '', method: 'fingerprint', label: '' }]);
  };

  const removeIdentifierSlot = (index) => {
    setIdentifiers(prev => prev.filter((_, i) => i !== index));
  };

  const updateIdentifierField = (index, field, value) => {
    setIdentifiers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Shift toggling
  const toggleShift = (shiftId) => {
    setSelectedShiftIds(prev =>
      prev.includes(shiftId) ? prev.filter(id => id !== shiftId) : [...prev, shiftId]
    );
  };

  const handleManualAddOrEdit = async (e) => {
    e.preventDefault();
    const validIdentifiers = identifiers.filter(i => i.identifier.trim() !== '');
    if (!name || validIdentifiers.length === 0) return;

    setIsSubmitting(true);
    setStatusMessage({ type: '', text: '' });

    let result;
    const payload = { name, identifiers: validIdentifiers, shift_ids: selectedShiftIds };

    if (editingId) {
      result = await editEmployee(editingId, payload);
    } else {
      result = await addEmployee(payload);
    }

    setIsSubmitting(false);

    if (result && result.success !== false) {
      setStatusMessage({ type: 'success', text: editingId ? 'Employee updated successfully!' : 'Employee added successfully!' });
      loadEmployees();
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

  // --- Identifier Input Row ---
  const renderIdentifierRow = (ident, index, readOnly = false) => (
    <div key={index} className="identifier-row">
      <div className="identifier-row-fields">
        <select
          value={ident.method}
          onChange={(e) => updateIdentifierField(index, 'method', e.target.value)}
          disabled={readOnly}
          className="ident-method-select"
        >
          <option value="fingerprint">Fingerprint</option>
          <option value="rfid">RFID</option>
        </select>
        <input
          type="text"
          placeholder="Identifier (ID/UID)"
          value={ident.identifier}
          onChange={(e) => updateIdentifierField(index, 'identifier', e.target.value)}
          required={index === 0}
          readOnly={readOnly}
          className="ident-value-input"
        />
        <input
          type="text"
          placeholder="Label (optional)"
          value={ident.label}
          onChange={(e) => updateIdentifierField(index, 'label', e.target.value)}
          className="ident-label-input"
        />
        {!readOnly && (enrollStep === 'select' || enrollStep === 'final') && (
          <button type="button" onClick={() => startScanning(index)} className="scan-hw-btn" title="Scan from hardware">
            {ident.method === 'fingerprint' ? <Fingerprint size={16} /> : <CreditCard size={16} />}
          </button>
        )}
        {identifiers.length > 1 && (
          <button type="button" onClick={() => removeIdentifierSlot(index)} className="remove-ident-btn" title="Remove">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );

  // --- Modal Content ---
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
            Cannot connect to the machine for enrollment. You can still add employees manually.
          </p>
          <button onClick={() => setEnrollStep('final')} style={{ background: 'var(--accent-cyan)', color: '#000', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Continue Manually
          </button>
          <button onClick={closeModal} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)', marginLeft: '0.5rem', cursor: 'pointer' }}>
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
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You can scan from hardware or enter identifiers manually.</p>
          <button onClick={() => setEnrollStep('final')} style={{ background: 'var(--accent-cyan)', color: '#000', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', width: '100%' }}>
            Continue to Form
          </button>
        </div>
      );
    }

    if (enrollStep === 'scanning') {
      const scanMethod = identifiers[enrollingIndex]?.method || 'fingerprint';
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {scanMethod === 'fingerprint' ? (
            <Fingerprint size={60} className="pulse-icon" style={{ color: 'var(--accent-cyan)', margin: '0 auto 1.5rem' }} />
          ) : (
            <CreditCard size={60} className="pulse-icon" style={{ color: 'var(--accent-green)', margin: '0 auto 1.5rem' }} />
          )}
          <h3 style={{ marginBottom: '1rem' }}>Waiting for Hardware...</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            Scanning identifier slot #{enrollingIndex + 1}
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {scanMethod === 'fingerprint'
              ? 'Please follow the instructions on the physical machine screen to scan your finger.'
              : 'Please tap your RFID card on the physical machine now.'}
          </p>
          <button onClick={() => setEnrollStep('final')} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer' }}>
            Cancel Scanning
          </button>
        </div>
      );
    }

    if (enrollStep === 'final' || enrollStep === 'edit') {
      return (
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {editingId ? <Pencil size={24} /> : <UserPlus size={24} />}
            {editingId ? 'Edit Employee' : 'Add Employee'}
          </h2>

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
            {/* Employee Name */}
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

            {/* Identifiers */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Identifiers (Fingerprints / RFID Cards)</label>
                <button type="button" onClick={addIdentifierSlot} className="add-ident-btn">
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="identifiers-list">
                {identifiers.map((ident, index) => renderIdentifierRow(ident, index))}
              </div>
            </div>

            {/* Shift Assignment */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Assigned Shifts</label>
              <div className="shift-checkboxes">
                {shifts.map(shift => (
                  <label key={shift.id} className={`shift-checkbox ${selectedShiftIds.includes(shift.id) ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedShiftIds.includes(shift.id)}
                      onChange={() => toggleShift(shift.id)}
                    />
                    <Clock size={14} />
                    <span>{shift.title}</span>
                    <small>{shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}</small>
                  </label>
                ))}
              </div>
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
    <main className="main-content">
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
              <th>Identifiers</th>
              <th>Shifts</th>
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
                  <td className="identifiers-cell">
                    {emp.identifiers && emp.identifiers.length > 0 ? (
                      <div className="ident-chips">
                        {emp.identifiers.map((ident, i) => (
                          <span key={i} className={`ident-chip ${ident.method}`}>
                            {ident.method === 'fingerprint' ? <Fingerprint size={12} /> : <CreditCard size={12} />}
                            <span>{ident.identifier}</span>
                            {ident.label && <small className="ident-chip-label">{ident.label}</small>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td className="shifts-cell">
                    {emp.shifts && emp.shifts.length > 0 ? (
                      <div className="shift-badges-row">
                        {emp.shifts.map((s, i) => (
                          <span key={i} className={`shift-badge shift-${s.title.toLowerCase()}`}>
                            {s.title}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">Unassigned</span>
                    )}
                  </td>
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
    </main>
  );
};

export default Employees;
