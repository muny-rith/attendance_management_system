import React, { useState, useEffect } from 'react';
import { fetchShifts, addShift, updateShift, deleteShift } from '../services/shiftApi';
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
    if (t.includes('morning')) return { bg: '#FFFBEB', border: '#d8c26bff', iconColor: '#F59E0B', icon: '🌅' };
    if (t.includes('afternoon')) return { bg: '#fae3c8ff', border: '#c5a37bff', iconColor: '#EA580C', icon: '☀️' };
    if (t.includes('evening') || t.includes('night')) return { bg: '#af7bcfff', border: '#563a74ff', iconColor: '#9333EA', icon: '🌙' };
    return { bg: '#F0FDF4', border: '#BBF7D0', iconColor: '#16A34A', icon: '⏰' };
  };

  return (
    <main className="main-content">
      <div className="table-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 className='page-title'>Shift Definitions</h2>
          {/* <div className="records-count">{shifts.length} Shifts</div> */}
        </div>
        <button onClick={openAddModal} className="add-btn">
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
                    <Clock size={24} />
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
          <div className="modal-content modal-confirm-card">
            <div className="modal-status-panel">
              <Trash2 size={44} className="modal-status-icon" style={{ color: '#ef4444' }} />
              <h3 className="modal-status-title">Delete Shift?</h3>
              <p className="modal-status-desc">
                Are you sure you want to delete the <strong style={{ color: 'var(--text-primary)' }}>{shiftToDelete.title}</strong> shift? Employees assigned to this shift will be unassigned.
              </p>
              <div className="modal-actions">
                <button type="button" onClick={() => setShiftToDelete(null)} className="modal-btn modal-btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={handleDelete} className="modal-btn modal-btn-danger">
                  Delete
                </button>
              </div>
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-secondary)' }}>Shift Name</label>
                <input type="text" placeholder="e.g. Morning" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
              </div>
              <div className="shift-time-fields">
                <div className="shift-time-field">
                  <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-secondary)' }}>Start Time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div className="shift-time-field">
                  <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-secondary)' }}>End Time</label>
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
