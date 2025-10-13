import React from 'react';
import { Card, Row, Col, Badge, Table } from 'react-bootstrap';
import { useHealth } from './HealthContext';

function ThresholdsDisplay() {
  const { thresholds } = useHealth();

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Card className="thresholds-display">
      <Card.Header>
        <h5 className="mb-0">
          <i className="bi bi-sliders me-2"></i>
          Health Status Thresholds
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          {/* Response Time Thresholds */}
          <Col md={6} className="mb-3">
            <h6 className="text-muted mb-3">Response Time (ms)</h6>
            <Table size="sm" className="threshold-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('healthy')}>
                      Healthy
                    </Badge>
                  </td>
                  <td>≤ {thresholds.responseTime.healthy.max} ms</td>
                </tr>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('warning')}>
                      Warning
                    </Badge>
                  </td>
                  <td>≤ {thresholds.responseTime.warning.max} ms</td>
                </tr>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('critical')}>
                      Critical
                    </Badge>
                  </td>
                  <td>&gt; {thresholds.responseTime.warning.max} ms</td>
                </tr>
              </tbody>
            </Table>
          </Col>

          {/* Uptime Thresholds */}
          <Col md={6} className="mb-3">
            <h6 className="text-muted mb-3">Uptime (%)</h6>
            <Table size="sm" className="threshold-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('healthy')}>
                      Healthy
                    </Badge>
                  </td>
                  <td>≥ {thresholds.uptime.healthy.min}%</td>
                </tr>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('warning')}>
                      Warning
                    </Badge>
                  </td>
                  <td>≥ {thresholds.uptime.warning.min}%</td>
                </tr>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('critical')}>
                      Critical
                    </Badge>
                  </td>
                  <td>&lt; {thresholds.uptime.warning.min}%</td>
                </tr>
              </tbody>
            </Table>
          </Col>

          {/* System Metrics Thresholds */}
          <Col md={6} className="mb-3">
            <h6 className="text-muted mb-3">CPU Usage (%)</h6>
            <Table size="sm" className="threshold-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('healthy')}>
                      Healthy
                    </Badge>
                  </td>
                  <td>≤ {thresholds.cpu.healthy.max}%</td>
                </tr>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('warning')}>
                      Warning
                    </Badge>
                  </td>
                  <td>≤ {thresholds.cpu.warning.max}%</td>
                </tr>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('critical')}>
                      Critical
                    </Badge>
                  </td>
                  <td>&gt; {thresholds.cpu.warning.max}%</td>
                </tr>
              </tbody>
            </Table>
          </Col>

          {/* Memory Thresholds */}
          <Col md={6} className="mb-3">
            <h6 className="text-muted mb-3">Memory Usage (%)</h6>
            <Table size="sm" className="threshold-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('healthy')}>
                      Healthy
                    </Badge>
                  </td>
                  <td>≤ {thresholds.memory.healthy.max}%</td>
                </tr>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('warning')}>
                      Warning
                    </Badge>
                  </td>
                  <td>≤ {thresholds.memory.warning.max}%</td>
                </tr>
                <tr>
                  <td>
                    <Badge bg={getStatusBadgeVariant('critical')}>
                      Critical
                    </Badge>
                  </td>
                  <td>&gt; {thresholds.memory.warning.max}%</td>
                </tr>
              </tbody>
            </Table>
          </Col>
        </Row>

        <div className="mt-3 text-muted small">
          <i className="bi bi-info-circle me-1"></i>
          These thresholds automatically determine component status. Status changes trigger real-time icon updates.
        </div>
      </Card.Body>
    </Card>
  );
}

export default ThresholdsDisplay;
