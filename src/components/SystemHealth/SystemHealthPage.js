import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Button, ButtonGroup, Badge } from 'react-bootstrap';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { useTheme } from '../../ThemeContext';
import { useHealth } from './HealthContext';
import NavBar from '../../NavBar/NavBar';
import ThresholdsDisplay from './ThresholdsDisplay';
import ComponentDetailsModal from './ComponentDetailsModal';
import './SystemHealthPage.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function SystemHealthPage() {
  const { theme } = useTheme();
  const { healthData, loading, refreshHealth, selectedMispServers, availableMispServers } = useHealth();
  
  // States for new features
  const [timeRange, setTimeRange] = useState('1h'); // '1h' or '24h'
  const [responseTimeData, setResponseTimeData] = useState({
    '1h': {
      labels: [],
      datasets: []
    },
    '24h': {
      labels: [],
      datasets: []
    }
  });

  // Modal state for component details
  const [showModal, setShowModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);

  // Handle component badge click
  const handleComponentClick = (component) => {
    setSelectedComponent(component);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedComponent(null);
  };

  // Response time data generation
  const generateResponseTimeData = () => {
    const now = new Date();
    
    // Data for 1 hour (points every 5 minutes)
    const oneHourLabels = [];
    const oneHourData = {
      Database: [],
      'API Server': [],
      'Redis Cache': [],
      'External Services': []
    };
    
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      oneHourLabels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      // Simulate realistic data with variations
      oneHourData.Database.push(Math.random() * 5 + 2);
      oneHourData['API Server'].push(Math.random() * 20 + 10);
      oneHourData['Redis Cache'].push(Math.random() * 50 + 30);
      oneHourData['External Services'].push(Math.random() * 100 + 80);
    }
    
    // Data for 24 hours (points every hour)
    const twentyFourHourLabels = [];
    const twentyFourHourData = {
      Database: [],
      'API Server': [],
      'Redis Cache': [],
      'External Services': []
    };
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      twentyFourHourLabels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      twentyFourHourData.Database.push(Math.random() * 8 + 1);
      twentyFourHourData['API Server'].push(Math.random() * 30 + 8);
      twentyFourHourData['Redis Cache'].push(Math.random() * 60 + 25);
      twentyFourHourData['External Services'].push(Math.random() * 150 + 70);
    }
    
    setResponseTimeData({
      '1h': {
        labels: oneHourLabels,
        datasets: [
          {
            label: 'Database',
            data: oneHourData.Database,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'API Server',
            data: oneHourData['API Server'],
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.1
          },
          {
            label: 'Redis Cache',
            data: oneHourData['Redis Cache'],
            borderColor: 'rgb(255, 206, 86)',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            tension: 0.1
          },
          {
            label: 'External Services',
            data: oneHourData['External Services'],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          }
        ]
      },
      '24h': {
        labels: twentyFourHourLabels,
        datasets: [
          {
            label: 'Database',
            data: twentyFourHourData.Database,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'API Server',
            data: twentyFourHourData['API Server'],
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.1
          },
          {
            label: 'Redis Cache',
            data: twentyFourHourData['Redis Cache'],
            borderColor: 'rgb(255, 206, 86)',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            tension: 0.1
          },
          {
            label: 'External Services',
            data: twentyFourHourData['External Services'],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          }
        ]
      }
    });
  };

  // Function to add a new real-time data point
  const refreshChartData = () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setResponseTimeData(prevData => {
      const newData = { ...prevData };
      
      // Get current values from health components
      const currentComponents = healthData.components.reduce((acc, component) => {
        acc[component.name] = parseFloat(component.responseTime) || Math.random() * 50 + 10;
        return acc;
      }, {});
      
      // Update data for 1h view
      const oneHourLabels = [...newData['1h'].labels];
      const oneHourDatasets = newData['1h'].datasets.map(dataset => ({
        ...dataset,
        data: [...dataset.data]
      }));
      
      // Add the new data point
      oneHourLabels.push(currentTime);
      oneHourDatasets.forEach(dataset => {
        const componentValue = currentComponents[dataset.label] || Math.random() * 50 + 10;
        dataset.data.push(componentValue);
      });
      
      // Keep only the last 12 points (1 hour)
      if (oneHourLabels.length > 12) {
        oneHourLabels.shift();
        oneHourDatasets.forEach(dataset => {
          dataset.data.shift();
        });
      }
      
      newData['1h'] = {
        labels: oneHourLabels,
        datasets: oneHourDatasets
      };
      
      // Update data for 24h view similarly
      const twentyFourHourLabels = [...newData['24h'].labels];
      const twentyFourHourDatasets = newData['24h'].datasets.map(dataset => ({
        ...dataset,
        data: [...dataset.data]
      }));
      
      // For 24h, add a point every hour
      const shouldAddTo24h = now.getMinutes() === 0; // Add only at the exact hour
      if (shouldAddTo24h) {
        twentyFourHourLabels.push(currentTime);
        twentyFourHourDatasets.forEach(dataset => {
          const componentValue = currentComponents[dataset.label] || Math.random() * 50 + 10;
          dataset.data.push(componentValue);
        });
        
        // Keep only the last 24 points
        if (twentyFourHourLabels.length > 24) {
          twentyFourHourLabels.shift();
          twentyFourHourDatasets.forEach(dataset => {
            dataset.data.shift();
          });
        }
        
        newData['24h'] = {
          labels: twentyFourHourLabels,
          datasets: twentyFourHourDatasets
        };
      }
      
      return newData;
    });
  };

  // Data initialization
  useEffect(() => {
    generateResponseTimeData();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return 'bi-check-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'critical':
        return 'bi-x-circle-fill';
      default:
        return 'bi-question-circle-fill';
    }
  };

  const formatTime = (date) => {
    return date.toLocaleString();
  };

  // Function to get formatted details for components
  const getComponentDetails = (component) => {
    if (component.name === 'External Services') {
      if (selectedMispServers.length > 0) {
        const selectedServerNames = availableMispServers
          .filter(server => selectedMispServers.includes(server.id))
          .map(server => server.name);
        
        if (selectedServerNames.length > 0) {
          return `${component.details} (${selectedServerNames.join(', ')})`;
        }
      }
    }
    return component.details;
  };

  // Chart configurations

  const systemMetricsData = {
    labels: ['CPU', 'Memory', 'Disk', 'Network'],
    datasets: [{
      data: [healthData.metrics.cpu, healthData.metrics.memory, healthData.metrics.disk, healthData.metrics.network],
      backgroundColor: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 205, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 205, 86, 1)',
        'rgba(75, 192, 192, 1)'
      ],
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}ms`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: theme === 'dark' ? '#ffffff' : '#000000',
          callback: function(value) {
            return value + 'ms';
          }
        },
        title: {
          display: true,
          text: 'Response Time (ms)',
          color: theme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      x: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: theme === 'dark' ? '#ffffff' : '#000000'
        },
        title: {
          display: true,
          text: timeRange === '1h' ? 'Time (Last Hour)' : 'Time (Last 24 Hours)',
          color: theme === 'dark' ? '#ffffff' : '#000000'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: theme === 'dark' ? '#ffffff' : '#000000'
        }
      }
    }
  };

  return (
    <div className={`system-health-page ${theme}`}>
      <div className="health-wrapper mt-4 px-4">
        <NavBar />
        
        {/* Header Section */}
        <div className={`health-header mb-4 ${theme}`}>
          <div className="text-center">
            <h1 className="page-title">
              <i className="bi bi-activity me-3"></i>
              System Health Dashboard
            </h1>
            <p className="page-subtitle">
              Real-time monitoring of system performance and component status
            </p>
            <div className="mt-3">
              <Badge 
                bg={healthData.overall === 'healthy' ? 'success' : healthData.overall === 'warning' ? 'warning' : 'danger'}
                className="fs-6 px-3 py-2"
              >
                <i className={`bi ${healthData.overall === 'healthy' ? 'bi-check-circle' : healthData.overall === 'warning' ? 'bi-exclamation-triangle' : 'bi-x-circle'} me-2`}></i>
                System Status: {healthData.overall.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <Row className="mb-4">
          <Col md={3} sm={6} className="mb-3">
            <Card className={`overview-card ${theme}`}>
              <Card.Body className="text-center">
                <div className="overview-icon overall-status">
                  <i className={`bi ${getStatusIcon(healthData.overall)}`}></i>
                </div>
                <h4>Overall Status</h4>
                <Badge bg={getStatusColor(healthData.overall)} className="status-badge">
                  {healthData.overall.toUpperCase()}
                </Badge>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className={`overview-card ${theme}`}>
              <Card.Body className="text-center">
                <div className="overview-icon">
                  <i className="bi bi-graph-up text-success"></i>
                </div>
                <h4>Uptime</h4>
                <p className="metric-value">{healthData.uptime}</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className={`overview-card ${theme}`}>
              <Card.Body className="text-center">
                <div className="overview-icon last-incident">
                  <i className="bi bi-exclamation-triangle text-warning"></i>
                </div>
                <h4>Last Incident</h4>
                <p className="metric-value">{healthData.lastIncident}</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className={`overview-card ${theme}`}>
              <Card.Body className="text-center">
                <div className="overview-icon components">
                  <i className="bi bi-grid-3x3-gap text-success"></i>
                </div>
                <h4>Components</h4>
                <p className="metric-value">
                  {healthData.components.filter(c => c.status === 'healthy').length}/
                  {healthData.components.length}
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* System Metrics */}
        <Row className="mb-4">
          <Col md={8}>
            <Card className={`chart-card ${theme}`}>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Response Time Trends</h5>
                  <div className="d-flex align-items-center gap-3">
                    {/* Manual refresh button - only shown for 1H view */}
                    {timeRange === '1h' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          refreshHealth();
                          refreshChartData();
                        }}
                        className="d-flex align-items-center gap-1"
                        title="Refresh data and update chart"
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                        Refresh
                      </Button>
                    )}
                    
                    {/* Switch entre 1h et 24h */}
                    <ButtonGroup size="sm">
                      <Button
                        variant={timeRange === '1h' ? 'primary' : 'outline-primary'}
                        onClick={() => setTimeRange('1h')}
                      >
                        1H
                      </Button>
                      <Button
                        variant={timeRange === '24h' ? 'primary' : 'outline-primary'}
                        onClick={() => setTimeRange('24h')}
                      >
                        24H
                      </Button>
                    </ButtonGroup>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="chart-container">
                  <Line data={responseTimeData[timeRange]} options={chartOptions} />
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className={`chart-card ${theme}`}>
              <Card.Header>
                <h5 className="mb-0">System Resource Usage</h5>
              </Card.Header>
              <Card.Body>
                <div className="chart-container">
                  <Doughnut data={systemMetricsData} options={doughnutOptions} />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Components Status Table */}
        <Row>
          <Col>
            <Card className={`components-card ${theme}`}>
              <Card.Header>
                <h5 className="mb-0">Component Status Details</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Status</th>
                      <th>Response Time</th>
                      <th>Uptime</th>
                      <th>Last Check</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthData.components.map((component, index) => (
                      <tr key={index}>
                        <td>
                          <div>
                            <strong>{component.name}</strong>
                            <br />
                            <small className="text-muted">{component.description}</small>
                          </div>
                        </td>
                        <td>
                          <Badge 
                            bg={getStatusColor(component.status)} 
                            className="d-flex align-items-center clickable-badge"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleComponentClick(component)}
                            title="Click for detailed metrics"
                          >
                            <i className={`bi ${getStatusIcon(component.status)} me-1`}></i>
                            {component.status}
                          </Badge>
                        </td>
                        <td>
                          <code>{component.responseTime}</code>
                        </td>
                        <td>{component.uptime}</td>
                        <td>
                          <small>{formatTime(component.lastCheck)}</small>
                        </td>
                        <td>
                          <small className="text-muted">{getComponentDetails(component)}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Thresholds Configuration */}
        <Row className="mb-4">
          <Col>
            <ThresholdsDisplay />
          </Col>
        </Row>
      </div>

      {/* Component Details Modal */}
      <ComponentDetailsModal 
        show={showModal}
        onHide={handleCloseModal}
        component={selectedComponent}
      />

      {/* Floating Refresh Button */}
      <button 
        className={`floating-refresh-btn ${loading ? 'loading' : ''}`}
        onClick={refreshHealth}
        disabled={loading}
        title="Refresh System Health"
      >
        <i className={`bi ${loading ? 'bi-arrow-clockwise' : 'bi-arrow-clockwise'}`}></i>
      </button>
    </div>
  );
}

export default SystemHealthPage;
