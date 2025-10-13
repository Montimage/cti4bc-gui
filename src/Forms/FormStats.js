import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { getToken } from '../auth';
import NavBar from '../NavBar/NavBar';
import { useTheme } from '../ThemeContext';
import { useToast } from '../components/Toast';
import './FormStats.css';

// Configuration de l'URL du serveur
const SERVER_URL = process.env.REACT_APP_API_URL;

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const FormStats = () => {
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formStats, setFormStats] = useState(null);
  const [overviewStats, setOverviewStats] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Get theme context
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Enhanced color palette for charts with dark mode support
  const getColorPalette = () => {
    if (isDarkMode) {
      return {
        primary: ['#6ea8fe', '#0d6efd', '#0a58ca'],
        success: ['#75dd75', '#198754', '#146c43'],
        warning: ['#ffda6a', '#ffc107', '#e0a800'],
        danger: ['#ea868f', '#dc3545', '#b02a37'],
        info: ['#6edff6', '#0dcaf0', '#087990'],
        neutral: ['#adb5bd', '#6c757d', '#495057']
      };
    } else {
      return {
        primary: ['#007bff', '#0056b3', '#004085'],
        success: ['#28a745', '#1e7e34', '#155724'],
        warning: ['#ffc107', '#e0a800', '#d39e00'],
        danger: ['#dc3545', '#c82333', '#bd2130'],
        info: ['#17a2b8', '#138496', '#117a8b'],
        neutral: ['#6c757d', '#545b62', '#495057']
      };
    }
  };

  const colorPalette = getColorPalette();

  useEffect(() => {
    fetchForms();
    fetchOverviewStats();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setForms(data.forms || []);
      } else {
        showError('Failed to fetch forms');
      }
    } catch (error) {
      showError('Error fetching forms: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverviewStats = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/stats/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOverviewStats(data.overview);
      }
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    }
  };

  const fetchFormStats = async (formId) => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/${formId}/stats/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormStats(data.stats);
        setSelectedForm(forms.find(f => f.id === formId));
        setShowStatsModal(true);
      } else {
        showError('Failed to fetch form statistics');
      }
    } catch (error) {
      showError('Error fetching form statistics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (fieldStats) => {
    const charts = {};
    
    Object.entries(fieldStats).forEach(([fieldName, stats]) => {
      if (stats.type === 'radio' || stats.type === 'select') {
        // Single choice questions - doughnut chart
        const labels = Object.keys(stats.choice_distribution);
        const data = Object.values(stats.choice_distribution).map(item => item.count);
        
        charts[fieldName] = {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: colorPalette.primary.concat(colorPalette.success, colorPalette.warning, colorPalette.danger),
              borderWidth: 2,
              borderColor: isDarkMode ? '#2d3748' : '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 15,
                  usePointStyle: true,
                  font: {
                    size: 11
                  },
                  color: isDarkMode ? '#e9ecef' : '#495057'
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        };
      } else if (stats.type === 'checkbox') {
        // Multiple choice questions - bar chart
        const labels = Object.keys(stats.choice_distribution);
        const data = Object.values(stats.choice_distribution).map(item => item.count);
        
        charts[fieldName] = {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Responses',
              data: data,
              backgroundColor: colorPalette.info[0],
              borderColor: colorPalette.info[1],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  color: isDarkMode ? '#e9ecef' : '#495057'
                },
                grid: {
                  color: isDarkMode ? '#4a5568' : '#dee2e6'
                }
              },
              x: {
                ticks: {
                  color: isDarkMode ? '#e9ecef' : '#495057'
                },
                grid: {
                  color: isDarkMode ? '#4a5568' : '#dee2e6'
                }
              }
            }
          }
        };
      }
    });
    
    return charts;
  };

  const generateTrendsChart = (trends) => {
    // Check if trends is a valid array
    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return null;
    }
    
    const labels = trends.map(item => new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }));
    const data = trends.map(item => item.count);
    
    return {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Responses',
          data: data,
          borderColor: colorPalette.primary[0],
          backgroundColor: colorPalette.primary[0] + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: isDarkMode ? '#e9ecef' : '#495057'
            },
            grid: {
              color: isDarkMode ? '#4a5568' : '#dee2e6'
            }
          },
          x: {
            ticks: {
              color: isDarkMode ? '#e9ecef' : '#495057'
            },
            grid: {
              color: isDarkMode ? '#4a5568' : '#dee2e6'
            }
          }
        }
      }
    };
  };

  const renderChart = (chartConfig) => {
    if (!chartConfig) return null;
    
    switch (chartConfig.type) {
      case 'doughnut':
        return <Doughnut data={chartConfig.data} options={chartConfig.options} />;
      case 'bar':
        return <Bar data={chartConfig.data} options={chartConfig.options} />;
      case 'line':
        return <Line data={chartConfig.data} options={chartConfig.options} />;
      default:
        return null;
    }
  };

  return (
    <>
    <div className="container-fluid mt-4">
      <NavBar />
      <Container fluid className={`forms-stats-container ${isDarkMode ? 'dark-theme' : ''}`}>
        <Row>
          <Col>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Form Statistics & KPIs</h2>
              <Button variant="outline-primary" onClick={() => window.location.href = '/admin/forms'}>
              Back to Forms
              </Button>
            </div>

            {/* Overview Statistics */}
            {overviewStats && (
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h5>Total Forms</h5>
                      <h2 className="text-primary">{overviewStats.total_forms}</h2>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h5>Total Responses</h5>
                      <h2 className="text-success">{overviewStats.total_responses}</h2>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h5>Avg Responses/Form</h5>
                      <h2 className="text-info">{overviewStats.average_responses_per_form}</h2>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h5>Active Forms</h5>
                      <h2 className="text-warning">{forms.filter(f => f.is_active).length}</h2>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Forms List with Stats Buttons */}
            <Row>
              <Col>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">All Forms - Click for Detailed Statistics</h5>
                  </Card.Header>
                  <Card.Body>
                    {loading ? (
                      <div className="text-center">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </Spinner>
                      </div>
                    ) : forms.length > 0 ? (
                      <Table responsive hover>
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Description</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forms.map((form) => (
                            <tr key={form.id}>
                              <td>{form.title}</td>
                              <td>{form.description || 'No description'}</td>
                              <td className="text-center">
                                <Badge bg={form.is_active ? 'success' : 'secondary'}>
                                  {form.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="text-center">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => fetchFormStats(form.id)}
                                  disabled={loading}
                                >
                                  View Statistics
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <Alert variant="info">No forms available</Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Enhanced Statistics Modal */}
            <Modal show={showStatsModal} onHide={() => setShowStatsModal(false)} size="xl" className="modal-xl-custom">
              <Modal.Header closeButton>
                <Modal.Title>
                  Statistics for: {selectedForm?.title}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="stats-modal-body">
                {formStats ? (
                  <div>
                    {/* Summary Cards */}
                    <Row className="stats-summary-cards">
                      <Col md={4}>
                        <Card className="text-center h-100">
                          <Card.Body>
                            <h5>Total Responses</h5>
                            <h3 className="text-primary">{formStats.total_responses}</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={4}>
                        <Card className="text-center h-100">
                          <Card.Body>
                            <h5>Response Rate</h5>
                            <h3 className="text-success">{formStats.response_rate}%</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={4}>
                        <Card className="text-center h-100">
                          <Card.Body>
                            <h5>Questions with Choices</h5>
                            <h3 className="text-info">{Object.keys(formStats.field_stats).length}</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Completion Trends */}
                    {formStats.completion_trends && Array.isArray(formStats.completion_trends) && formStats.completion_trends.length > 0 ? (
                      <div className="chart-section">
                        <h5 className="chart-title">Response Trends (Last 30 Days)</h5>
                        <div className="chart-container">
                          {(() => {
                            const trendsChart = generateTrendsChart(formStats.completion_trends);
                            return trendsChart ? renderChart(trendsChart) : (
                              <div className="d-flex align-items-center justify-content-center h-100">
                                <Alert variant="info">No trend data available</Alert>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="chart-section">
                        <h5 className="chart-title">Response Trends (Last 30 Days)</h5>
                        <div className="chart-container">
                          <div className="d-flex align-items-center justify-content-center h-100">
                            <Alert variant="info">No responses yet - trends will appear after the first submissions</Alert>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Field Statistics Charts */}
                    {Object.keys(formStats.field_stats).length > 0 ? (
                      <div>
                        <h5 className="chart-title">Response Distribution by Question</h5>
                        <div className="chart-grid">
                          {Object.entries(formStats.field_stats).map(([fieldName, stats]) => {
                            const chartConfig = generateChartData({ [fieldName]: stats })[fieldName];
                            return (
                              <div key={fieldName} className="chart-section">
                                <h6 className="mb-3">{stats.label || fieldName} ({stats.type})</h6>
                                <Row>
                                  <Col lg={7}>
                                    <div className="chart-container">
                                      {chartConfig && renderChart(chartConfig)}
                                    </div>
                                  </Col>
                                  <Col lg={5}>
                                    <Table size="sm" className="response-distribution-table">
                                      <thead>
                                        <tr>
                                          <th>Option</th>
                                          <th>Count</th>
                                          <th>%</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(stats.choice_distribution).map(([choice, data]) => (
                                          <tr key={choice}>
                                            <td>{choice}</td>
                                            <td>
                                              <Badge bg="primary" className="me-1">{data.count}</Badge>
                                            </td>
                                            <td>{data.percentage}%</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </Col>
                                </Row>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <Alert variant="info">
                        This form doesn't have any choice-based questions (radio, checkbox, select) to analyze, 
                        or no responses have been submitted yet.
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="chart-loading">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading statistics...</span>
                    </Spinner>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
          </Col>
        </Row>
      </Container>
      </div>
     </>
  );
};

export default FormStats;