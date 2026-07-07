import React, { useState, useEffect } from 'react';
import { fetchShifts, addShift, updateShift, deleteShift } from '../services/api';
import { Clock, Plus, Pencil, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import './Shifts.css';

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [shiftToDelete, setShiftToDelete] = useState(null);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    const data = await fetchShifts();
    setShifts(data);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setStartTime('');
    setEndTime('');
    setStatusMessage({ type: '', text: '' });
    setShowModal(true);
  };

  const openEditModal = (shift) => {
    setEditingId(shift.id);
    setTitle(shift.title);
    setStartTime(shift.start_time?.slice(0, 5) || '');
    setEndTime(shift.end_time?.slice(0, 5) || '');
    setStatusMessage({ type: '', text: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;

    setIsSubmitting(true);
    setStatusMessage({ type: '', text: '' });

    let result;
    if (editingId) {
      result = await updateShift(editingId, { title, start_time: startTime, end_time: endTime });
    } else {
      result = await addShift({ title, start_time: startTime, end_time: endTime });
    }

    setIsSubmitting(false);

    if (result && result.success !== false) {
      setStatusMessage({ type: 'success', text: editingId ? 'Shift updated!' : 'Shift created!' });
      loadShifts();
      setTimeout(() => closeModal(), 1200);
    } else {
      setStatusMessage({ type: 'error', text: 'Failed to save shift.' });
    }
  };

  const confirmDelete = (shift) => {
    setShiftToDelete(shift);
  };

  const handleDelete = async () => {
    if (!shiftToDelete) return;
    await deleteShift(shiftToDelete.id);
    setShiftToDelete(null);
    loadShifts();
  };

  const getShiftColor = (title) => {
    const t = title.toLowerCase();
    if (t.includes('morning')) return { bg: '#FFFBEB', border: '#FDE68A', iconColor: '#F59E0B', icon: '🌅' };
    if (t.includes('afternoon')) return { bg: '#FFF7ED', border: '#FED7AA', iconColor: '#EA580C', icon: '☀️' };
    if (t.includes('evening') || t.includes('night')) return { bg: '#FAF5FF', border: '#E9D5FF', iconColor: '#9333EA', icon: '🌙' };
    return { bg: '#F0FDF4', border: '#BBF7D0', iconColor: '#16A34A', icon: '⏰' };
  };

  return (
    <main className="main-content">
      <div className="table-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2>Shift Definitions</h2>
          <div className="records-count">{shifts.length} Shifts</div>
        </div>
        <button onClick={openAddModal} className="export-btn" style={{ background: 'var(--accent-cyan)', borderColor: 'rgba(34, 211, 238, 0.3)', color: '#000' }}>
          <Plus size={18} /> Add Shift
        </button>
      </div>

      <div className="shift-grid">
        {loading ? (
          <div className="loading-spinner">Loading shifts...</div>
        ) : shifts.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>No shifts defined. Add your first shift.</div>
        ) : (
          shifts.map(shift => {
            const colors = getShiftColor(shift.title);
            return (
              <div key={shift.id} className="shift-clean-card" style={{ background: colors.bg, borderColor: colors.border }}>
                
                <div className="shift-card-content">
                  <div className="shift-card-header">
                    <div className="shift-card-title-wrap">
                      <span className="shift-card-icon-clean">{colors.icon}</span>
                      <h3>{shift.title}</h3>
                    </div>
                  </div>
                  
                  <div className="shift-card-time-clean">
                    <Clock size={18} />
                    <span>{shift.start_time?.slice(0, 5)} — {shift.end_time?.slice(0, 5)}</span>
                  </div>
                  
                  <div className="shift-card-actions-clean">
                    <button onClick={() => openEditModal(shift)} className="shift-action-btn edit" title="Edit Shift">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => confirmDelete(shift)} className="shift-action-btn delete" title="Delete Shift">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation */}
      {shiftToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
            <Trash2 size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h3 style={{ marginBottom: '1rem' }}>Delete Shift?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Are you sure you want to delete the <strong style={{ color: 'var(--text-primary)' }}>{shiftToDelete.title}</strong> shift? Employees assigned to this shift will be unassigned.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShiftToDelete(null)} style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDelete} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', fontWeight: 600 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <button className="close-btn" onClick={closeModal}><X size={24} /></button>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={24} />
              {editingId ? 'Edit Shift' : 'Add New Shift'}
            </h2>

            {statusMessage.text && (
              <div style={{
                padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: statusMessage.type === 'success' ? 'var(--accent-green)' : '#ef4444',
                border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="register-form">
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Shift Name</label>
                <input type="text" placeholder="e.g. Morning" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Start Time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>End Time</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
                {isSubmitting ? 'Saving...' : editingId ? 'Update Shift' : 'Create Shift'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Shifts;
