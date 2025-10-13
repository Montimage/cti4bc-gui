import React, { useState, useEffect } from 'react';
import MISPServerSelector from './MISPServerSelector';
import 'bootstrap/dist/css/bootstrap.min.css';

const ShareEventModal = ({ show, onClose, onConfirm, eventId }) => {
  const [selectedMispServers, setSelectedMispServers] = useState([]);

  useEffect(() => {
    if (show) {
      setSelectedMispServers([]);
    }
  }, [show]);

  const handleServersSelected = (serverIds) => {
    setSelectedMispServers(serverIds);
  };

  if (!show) return null;

  return (
    <div className="modal fade show" 
         style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
         onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Share Event</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <MISPServerSelector onServersSelected={handleServersSelected} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => onConfirm(selectedMispServers)}
              disabled={selectedMispServers.length === 0}
            >
              Share Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareEventModal;