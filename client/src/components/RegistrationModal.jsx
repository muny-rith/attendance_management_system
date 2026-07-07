import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { addEmployee } from '../services/api';
import './RegistrationModal.css';

const RegistrationModal = ({ log, onClose, onRegisterSuccess }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scannedIdentifier = log.scanned_identifier || '';
  const scannedMethod = log.scanned_method || 'rfid';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    
    setIsSubmitting(true);
    await addEmployee({
      name,
      identifiers: [{ identifier: scannedIdentifier, method: scannedMethod, label: 'Primary' }],
      shift_ids: []
    });
    setIsSubmitting(false);
    onRegisterSuccess();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        
        <h2><UserPlus size={24} /> Register Unknown Device</h2>
        <p className="modal-subtitle">Assign a name to this unregistered scan.</p>
        
        <div className="modal-details">
          <div className="detail-row">
            <span>Method:</span>
            <strong>{scannedMethod === 'rfid' ? 'RFID Card' : 'Fingerprint'}</strong>
          </div>
          <div className="detail-row">
            <span>Identifier:</span>
            <strong className="identifier-text">{scannedIdentifier}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <input 
            type="text" 
            placeholder="Enter Employee Name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required 
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register Employee'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationModal;
