import React, { useState } from 'react';
import { Modal, Badge, Row, Col, ProgressBar, Button } from 'react-bootstrap';
import { useHealth } from './HealthContext';
import MispServerSelector from './MispServerSelector';

function ComponentDetailsModal({ show, onHide, component }) {
  const { availableMispServers, selectedMispServers, updateSelectedMispServers, fetchHealthStatus } = useHealth();
  const [showMispSelector, setShowMispSelector] = useState(false);
  
  if (!component) return null;

  const getStatusVariant = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'danger';
      default: return 'secondary';
    }
  };

  const getProgressVariant = (value, type) => {
    if (type === 'uptime') {
      const uptimeValue = parseFloat(value);
      if (uptimeValue >= 99) return 'success';
      if (uptimeValue >= 98) return 'warning';
      return 'danger';
    } else {
      // For CPU, Memory, etc.
      if (value <= 70) return 'success';
      if (value <= 85) return 'warning';
      return 'danger';
    }
  };

  // Extract numeric values from strings
  const responseTime = parseFloat(component.responseTime);
  const uptime = parseFloat(component.uptime);
  
  // Use real metrics data from the component if available
  const metrics = component.metrics || {};
  
  // Get CPU and Memory usage based on component type and available metrics
  let cpuUsage = 0;
  let memoryUsage = 0;
  
  if (component.name === 'API Server') {
    cpuUsage = metrics.cpu_percent !== undefined ? Math.round(metrics.cpu_percent) : 0;
    // For memory, convert MB to a rough percentage (assuming 8GB total system memory)
    memoryUsage = metrics.memory_usage_mb !== undefined ? Math.min(100, Math.round((metrics.memory_usage_mb / 8192) * 100)) : 0;
  } else if (component.name === 'Database') {
    // Database doesn't provide CPU/Memory in our current implementation
    cpuUsage = 0;
    memoryUsage = 0;
  } else if (component.name === 'Message Queue') {
    // Kafka doesn't provide CPU/Memory in our current implementation
    cpuUsage = 0;
    memoryUsage = 0;
  } else if (component.name === 'External Services') {
    // External services don't provide CPU/Memory
    cpuUsage = 0;
    memoryUsage = 0;
  }

  return (
    <>
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-server me-2"></i>
          {component.name} - Detailed Metrics
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Overall Status</h6>
            <Badge bg={getStatusVariant(component.status)} className="fs-6">
              {component.status.toUpperCase()}
            </Badge>
          </div>
          <small className="text-muted">{component.description}</small>
        </div>

        {/* Special section for External Services - MISP Server Selection */}
        {component.name === 'External Services' && (
          <div className="mb-4 p-3 border rounded bg-body-tertiary">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                <i className="bi bi-servers me-2"></i>
                MISP Server Selection
              </h6>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowMispSelector(true)}
              >
                <i className="bi bi-gear me-1"></i>
                Configure Servers
              </Button>
            </div>
            
            {selectedMispServers.length > 0 ? (
              <div>
                <p className="mb-2 text-muted small">
                  Currently monitoring {selectedMispServers.length} server(s):
                </p>
                <div className="d-flex flex-wrap gap-1">
                  {availableMispServers
                    .filter(server => selectedMispServers.includes(server.id))
                    .map(server => (
                      <Badge key={server.id} bg="info" className="me-1">
                        {server.name}
                      </Badge>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-muted small">
                <i className="bi bi-info-circle me-1"></i>
                No specific servers selected. Monitoring all available servers.
              </div>
            )}
          </div>
        )}

        <Row>
          {/* Response Time */}
          <Col md={6} className="mb-4">
            <div className="metric-card p-3 border rounded">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  <i className="bi bi-speedometer2 me-2 text-primary"></i>
                  Response Time
                </h6>
                <span className="badge bg-secondary">{component.responseTime}</span>
              </div>
              <ProgressBar 
                now={Math.min(responseTime, 200)} 
                max={200} 
                variant={getProgressVariant(responseTime, 'responseTime')}
                className="mb-2"
              />
              <div className="d-flex justify-content-between small text-muted">
                <span>0ms</span>
                <span>Target: &lt;100ms</span>
                <span>200ms+</span>
              </div>
            </div>
          </Col>

          {/* Uptime */}
          <Col md={6} className="mb-4">
            <div className="metric-card p-3 border rounded">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  <i className="bi bi-clock me-2 text-success"></i>
                  Uptime
                </h6>
                <span className="badge bg-secondary">{component.uptime}</span>
              </div>
              <ProgressBar 
                now={uptime} 
                max={100} 
                variant={getProgressVariant(uptime, 'uptime')}
                className="mb-2"
              />
              <div className="d-flex justify-content-between small text-muted">
                <span>95%</span>
                <span>Target: &gt;99%</span>
                <span>100%</span>
              </div>
            </div>
          </Col>

          {/* CPU Usage */}
          <Col md={6} className="mb-4">
            <div className="metric-card p-3 border rounded">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  <i className="bi bi-cpu me-2 text-warning"></i>
                  CPU Usage
                </h6>
                <span className="badge bg-secondary">{cpuUsage}%</span>
              </div>
              <ProgressBar 
                now={cpuUsage} 
                max={100} 
                variant={getProgressVariant(cpuUsage, 'cpu')}
                className="mb-2"
              />
              <div className="d-flex justify-content-between small text-muted">
                <span>0%</span>
                <span>Target: &lt;70%</span>
                <span>100%</span>
              </div>
            </div>
          </Col>

          {/* Memory Usage */}
          <Col md={6} className="mb-4">
            <div className="metric-card p-3 border rounded">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  <i className="bi bi-memory me-2 text-info"></i>
                  Memory Usage
                </h6>
                <span className="badge bg-secondary">{memoryUsage}%</span>
              </div>
              <ProgressBar 
                now={memoryUsage} 
                max={100} 
                variant={getProgressVariant(memoryUsage, 'memory')}
                className="mb-2"
              />
              <div className="d-flex justify-content-between small text-muted">
                <span>0%</span>
                <span>Target: &lt;75%</span>
                <span>100%</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* Component-specific metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="mt-3 p-3 bg-body-tertiary rounded">
            <h6 className="mb-3">
              <i className="bi bi-gear me-2"></i>
              Component-Specific Metrics
            </h6>
            <Row>
              {Object.entries(metrics).map(([key, value]) => (
                <Col md={6} lg={4} key={key} className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                    <span className="fw-medium small">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}

        <div className="mt-3 p-3 bg-body-secondary rounded">
          <h6 className="mb-2">
            <i className="bi bi-info-circle me-2"></i>
            Additional Details
          </h6>
          <p className="mb-1"><strong>Last Check:</strong> {component.lastCheck.toLocaleString()}</p>
          <p className="mb-0"><strong>Status Details:</strong> {component.details}</p>
        </div>
      </Modal.Body>
    </Modal>
    
    {/* MISP Server Selector Modal */}
    <MispServerSelector
      show={showMispSelector}
      onHide={() => setShowMispSelector(false)}
      selectedServers={selectedMispServers}
      availableServers={availableMispServers}
      onSelectionChange={(newSelection) => {
        updateSelectedMispServers(newSelection);
        // Refresh health data after changing selection
        setTimeout(() => fetchHealthStatus(), 500);
      }}
    />
    </>
  );
}

export default ComponentDetailsModal;
