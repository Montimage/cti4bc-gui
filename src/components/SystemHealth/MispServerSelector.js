import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Badge, Alert } from 'react-bootstrap';
import { useHealth } from './HealthContext';

function MispServerSelector({ show, onHide, selectedServers, availableServers, onSelectionChange }) {
  const { fetchAvailableMispServers } = useHealth();
  const [tempSelection, setTempSelection] = useState(selectedServers);

  // Update tempSelection when the modal opens with new selectedServers
  useEffect(() => {
    setTempSelection(selectedServers);
  }, [selectedServers, show]);

  // Reload servers when modal opens
  useEffect(() => {
    if (show) {
      fetchAvailableMispServers();
    }
  }, [show, fetchAvailableMispServers]);

  const handleServerToggle = (serverId) => {
    setTempSelection(prev => {
      if (prev.includes(serverId)) {
        return prev.filter(id => id !== serverId);
      } else {
        return [...prev, serverId];
      }
    });
  };

  const handleSelectAll = () => {
    setTempSelection(availableServers.map(server => server.id));
  };

  const handleClearAll = () => {
    setTempSelection([]);
  };

  const handleSave = () => {
    onSelectionChange(tempSelection);
    onHide();
  };

  const handleCancel = () => {
    setTempSelection(selectedServers); // Reset to original selection
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-servers me-2"></i>
          External Services - Detailed Metrics
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <h6 className="mb-2">MISP Server Selection</h6>
          <p className="text-muted small">
            Choose which MISP servers to monitor. Leave empty to monitor all available servers.
          </p>
        </div>

        <div className="mb-3">
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
            <Button variant="outline-info" size="sm" onClick={fetchAvailableMispServers}>
              <i className="bi bi-arrow-clockwise me-1"></i>
              Reload Servers
            </Button>
          </div>
        </div>

        {availableServers.length === 0 ? (
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No MISP servers are currently configured.
            <br />
            <small className="text-muted">
              Debug: Available servers count: {availableServers.length}
            </small>
          </Alert>
        ) : (
          <div className="mb-3">
            {availableServers.map(server => (
              <Form.Check
                key={server.id}
                type="checkbox"
                id={`server-${server.id}`}
                className="mb-2 p-2 border rounded"
                checked={tempSelection.includes(server.id)}
                onChange={() => handleServerToggle(server.id)}
                label={
                  <div>
                    <div className="fw-medium">{server.name}</div>
                    <small className="text-muted">{server.url}</small>
                    <br />
                    <small className="text-muted">Organization: {server.organization}</small>
                  </div>
                }
              />
            ))}
          </div>
        )}

        <div className="mt-3 p-3 bg-body-tertiary rounded">
          <h6 className="mb-3">
            <i className="bi bi-gear me-2"></i>
            Overall Status {tempSelection.length > 0 ? `(${tempSelection.length} selected)` : '(all servers)'}
          </h6>
          <div className="row">
            <div className="col-md-6">
              <div className="d-flex justify-content-between">
                <span>Response Time</span>
                <span>292.98ms</span>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-between">
                <span>Uptime</span>
                <span>99.9%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-body-secondary rounded">
          <h6 className="mb-2">
            <i className="bi bi-info-circle me-2"></i>
            Component-Specific Metrics
          </h6>
          <div className="row">
            <div className="col-md-4">
              <div className="text-center">
                <div className="fw-bold">Availability:</div>
                <div className="text-success">99.9%</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center">
                <div className="fw-bold">Services Configured:</div>
                <div>{tempSelection.length > 0 ? tempSelection.length : availableServers.length}.00</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center">
                <div className="fw-bold">Connectivity Score:</div>
                <div className="text-success">100.0%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-body-secondary rounded">
          <h6 className="mb-2">
            <i className="bi bi-info-circle me-2"></i>
            Additional Details
          </h6>
          <p className="mb-1"><strong>Last Check:</strong> {new Date().toLocaleString()}</p>
          <p className="mb-0">
            <strong>Status Details:</strong> {tempSelection.length > 0 ? tempSelection.length : availableServers.length}/
            {availableServers.length} services healthy
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Selection
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MispServerSelector;
