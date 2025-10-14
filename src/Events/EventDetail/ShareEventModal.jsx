import React, { useState, useEffect } from 'react';
import MISPServerSelector from './MISPServerSelector';
import OrganizationSelector from './OrganizationSelector';
import 'bootstrap/dist/css/bootstrap.min.css';

const ShareEventModal = ({ show, onClose, onConfirm, eventId }) => {
  const [selectedMispServers, setSelectedMispServers] = useState([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);

  useEffect(() => {
    if (show) {
      setSelectedMispServers([]);
      setSelectedOrganizations([]);
    }
  }, [show]);

  const handleServersSelected = (serverIds) => {
    setSelectedMispServers(serverIds);
  };

  const handleOrganizationsSelected = (orgIds) => setSelectedOrganizations(orgIds);

  if (!show) return null;

  const canShare = selectedMispServers.length > 0 || selectedOrganizations.length > 0;

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

          <div className="modal-body">
            <div>
              <MISPServerSelector onServersSelected={handleServersSelected} />
              <hr className="my-4" />

              <h6 className="mb-2">Share with other CTI4BC organisations</h6>
              <OrganizationSelector onOrganizationsSelected={handleOrganizationsSelected} />
            </div>

            {/* Warning message if no recipients are selected */}
            {!selectedMispServers.length && !selectedOrganizations.length && (
              <div className="alert alert-warning mt-4 mb-0">
                Please select at least one destination (MISP server or recipient organisation) to share with.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                onConfirm({
                  mispServerIds: selectedMispServers,
                  organizationIds: selectedOrganizations
                })
              }
              disabled={!canShare}
              title={!canShare ? "Select at least one destination" : ""}
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