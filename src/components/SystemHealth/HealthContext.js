import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SERVER_URL = process.env.REACT_APP_API_URL;

const HealthContext = createContext();

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};

export const HealthProvider = ({ children }) => {
  // Health status thresholds configuration
  const [thresholds] = useState({
    responseTime: {
      healthy: { max: 100 }, // ms
      warning: { max: 200 }, // ms
      critical: { max: 1000 } // ms - anything above is critical
    },
    uptime: {
      healthy: { min: 99.0 }, // %
      warning: { min: 98.0 }, // %
      critical: { min: 95.0 } // % - anything below is critical
    },
    cpu: {
      healthy: { max: 70 }, // %
      warning: { max: 85 }, // %
      critical: { max: 95 } // %
    },
    memory: {
      healthy: { max: 75 }, // %
      warning: { max: 90 }, // %
      critical: { max: 95 } // %
    }
  });

  const [healthData, setHealthData] = useState({
    overall: 'healthy', // 'healthy', 'warning', 'critical'
    uptime: '99.9%',
    lastIncident: '2 days ago',
    components: [], // Will be populated with real data from API calls
    metrics: {
      cpu: 45,
      memory: 67,
      disk: 34,
      network: 23
    },
    responseTimeHistory: [
      { time: '00:00', database: 2, api: 15, cache: 30, external: 120, queue: 8 },
      { time: '04:00', database: 3, api: 18, cache: 35, external: 110, queue: 10 },
      { time: '08:00', database: 2, api: 12, cache: 40, external: 130, queue: 7 },
      { time: '12:00', database: 4, api: 20, cache: 45, external: 125, queue: 9 },
      { time: '16:00', database: 3, api: 16, cache: 42, external: 115, queue: 8 },
      { time: '20:00', database: 2, api: 14, cache: 38, external: 118, queue: 7 }
    ],
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(false);
  
  // State for selected MISP servers
  const [selectedMispServers, setSelectedMispServers] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('selectedMispServers');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [availableMispServers, setAvailableMispServers] = useState([]);

  // Function to determine status based on response time
  const getStatusFromResponseTime = useCallback((responseTimeStr) => {
    const responseTime = parseFloat(responseTimeStr);
    if (responseTime <= thresholds.responseTime.healthy.max) {
      return 'healthy';
    } else if (responseTime <= thresholds.responseTime.warning.max) {
      return 'warning';
    } else {
      return 'critical';
    }
  }, [thresholds]);

  // Function to determine status based on uptime percentage
  const getStatusFromUptime = useCallback((uptimeStr) => {
    const uptime = parseFloat(uptimeStr);
    if (uptime >= thresholds.uptime.healthy.min) {
      return 'healthy';
    } else if (uptime >= thresholds.uptime.warning.min) {
      return 'warning';
    } else {
      return 'critical';
    }
  }, [thresholds]);

  // Function to determine status based on system metrics
  const getStatusFromMetric = useCallback((value, metricType) => {
    const threshold = thresholds[metricType];
    if (!threshold) return 'healthy';

    if (value <= threshold.healthy.max) {
      return 'healthy';
    } else if (value <= threshold.warning.max) {
      return 'warning';
    } else {
      return 'critical';
    }
  }, [thresholds]);

  // Calculate overall status based on components
  const calculateOverallStatus = useCallback((components) => {
    const criticalComponents = components.filter(c => c.status === 'critical');
    const warningComponents = components.filter(c => c.status === 'warning');
    
    if (criticalComponents.length > 0) {
      return 'critical';
    } else if (warningComponents.length > 0) {
      return 'warning';
    }
    return 'healthy';
  }, []);

  // Function to fetch real database health data
  const fetchDatabaseHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${SERVER_URL}/api/health/database/`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: 'Database',
          status: data.status,
          responseTime: typeof data.response_time === 'string' ? data.response_time : `${data.response_time}ms`,
          uptime: typeof data.uptime === 'string' ? data.uptime : `${data.uptime}%`,
          description: 'Primary PostgreSQL database',
          lastCheck: new Date(),
          details: data.details,
          metrics: data.metrics
        };
      } else {
        // If API call fails, return critical status
        return {
          name: 'Database',
          status: 'critical',
          responseTime: 'timeout',
          uptime: '0%',
          description: 'Primary PostgreSQL database',
          lastCheck: new Date(),
          details: 'API call failed',
          metrics: null
        };
      }
    } catch (error) {
      console.error('Error fetching database health:', error);
      return {
        name: 'Database',
        status: 'critical',
        responseTime: 'error',
        uptime: '0%',
        description: 'Primary PostgreSQL database',
        lastCheck: new Date(),
        details: `Connection error: ${error.message}`,
        metrics: null
      };
    }
  }, []);

  // Function to fetch real API Server health data
  const fetchApiServerHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${SERVER_URL}/api/health/api-server/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: 'API Server',
          status: data.status,
          responseTime: typeof data.response_time === 'string' ? data.response_time : `${data.response_time}ms`,
          uptime: typeof data.uptime === 'string' ? data.uptime : `${data.uptime}%`,
          description: 'Django REST API server',
          lastCheck: new Date(),
          details: data.details,
          metrics: data.metrics
        };
      } else {
        // If API call fails, return critical status
        return {
          name: 'API Server',
          status: 'critical',
          responseTime: 'timeout',
          uptime: '0%',
          description: 'Django REST API server',
          lastCheck: new Date(),
          details: 'API call failed',
          metrics: null
        };
      }
    } catch (error) {
      console.error('Error fetching API server health:', error);
      return {
        name: 'API Server',
        status: 'critical',
        responseTime: 'error',
        uptime: '0%',
        description: 'Django REST API server',
        lastCheck: new Date(),
        details: `Connection error: ${error.message}`,
        metrics: null
      };
    }
  }, []);

  // Function to fetch real External Services health data
  const fetchExternalServicesHealth = useCallback(async (selectedServerIds = null) => {
    try {
      const token = localStorage.getItem('accessToken');
      let url = `${SERVER_URL}/api/health/external-services/`;
      
      // Add server_ids parameter if specific servers are selected
      if (selectedServerIds && selectedServerIds.length > 0) {
        url += `?server_ids=${selectedServerIds.join(',')}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: 'External Services',
          status: data.status,
          responseTime: typeof data.response_time === 'string' ? data.response_time : `${data.response_time}ms`,
          uptime: typeof data.uptime === 'string' ? data.uptime : `${data.uptime}%`,
          description: 'MISP servers and external APIs',
          lastCheck: new Date(),
          details: data.services && data.services.length > 0 ? `${data.healthy_services}/${data.total_services} services healthy` : 'No external services configured',
          metrics: data.metrics
        };
      } else {
        // If API call fails, return critical status
        return {
          name: 'External Services',
          status: 'critical',
          responseTime: 'timeout',
          uptime: '0%',
          description: 'MISP servers and external APIs',
          lastCheck: new Date(),
          details: 'API call failed',
          metrics: null
        };
      }
    } catch (error) {
      console.error('Error fetching external services health:', error);
      return {
        name: 'External Services',
        status: 'critical',
        responseTime: 'error',
        uptime: '0%',
        description: 'MISP servers and external APIs',
        lastCheck: new Date(),
        details: `Connection error: ${error.message}`,
        metrics: null
      };
    }
  }, []);

  // Function to fetch real Message Queue health data
  const fetchMessageQueueHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${SERVER_URL}/api/health/message-queue/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: 'Message Queue',
          status: data.status,
          responseTime: typeof data.response_time === 'string' ? data.response_time : `${data.response_time}ms`,
          uptime: typeof data.uptime === 'string' ? data.uptime : `${data.uptime}%`,
          description: 'Kafka message broker',
          lastCheck: new Date(),
          details: data.broker_reachable ? 'Broker reachable' : (data.error || 'Broker unreachable'),
          metrics: data.metrics
        };
      } else {
        // If API call fails, return critical status
        return {
          name: 'Message Queue',
          status: 'critical',
          responseTime: 'timeout',
          uptime: '0%',
          description: 'Kafka message broker',
          lastCheck: new Date(),
          details: 'API call failed',
          metrics: null
        };
      }
    } catch (error) {
      console.error('Error fetching message queue health:', error);
      return {
        name: 'Message Queue',
        status: 'critical',
        responseTime: 'error',
        uptime: '0%',
        description: 'Kafka message broker',
        lastCheck: new Date(),
        details: `Connection error: ${error.message}`,
        metrics: null
      };
    }
  }, []);

  // Function to fetch available MISP servers
  const fetchAvailableMispServers = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${SERVER_URL}/api/health/available-misp-servers/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableMispServers(data.servers || []);
        return data.servers || [];
      } else {
        console.error('Failed to fetch available MISP servers');
        setAvailableMispServers([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching available MISP servers:', error);
      setAvailableMispServers([]);
      return [];
    }
  }, []);

  // Function to update selected MISP servers
  const updateSelectedMispServers = useCallback((serverIds) => {
    setSelectedMispServers(serverIds);
    // Save to localStorage for persistence
    localStorage.setItem('selectedMispServers', JSON.stringify(serverIds));
  }, []);

  // Health check function with real database data and mock data for other components
  const fetchHealthStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Store previous overall status for change detection
      const previousOverallStatus = healthData.overall;
      
      // Get real database health data
      const databaseHealth = await fetchDatabaseHealth();
      
      // Get real API Server health data
      const apiServerHealth = await fetchApiServerHealth();
      
      // Get real External Services health data
      const externalServicesHealth = await fetchExternalServicesHealth(selectedMispServers);
      
      // Get real Message Queue health data
      const messageQueueHealth = await fetchMessageQueueHealth();
      
      // Create components array with real data
      const updatedComponents = [
        databaseHealth,
        apiServerHealth,
        externalServicesHealth,
        messageQueueHealth
      ];

      const newOverallStatus = calculateOverallStatus(updatedComponents);

      // Update system metrics with threshold-based status
      const updatedMetrics = {
        cpu: Math.min(100, Math.max(0, healthData.metrics.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.min(100, Math.max(0, healthData.metrics.memory + (Math.random() - 0.5) * 8)),
        disk: Math.min(100, Math.max(0, healthData.metrics.disk + (Math.random() - 0.5) * 5)),
        network: Math.min(100, Math.max(0, healthData.metrics.network + (Math.random() - 0.5) * 15))
      };

      setHealthData(prev => ({
        ...prev,
        components: updatedComponents,
        overall: newOverallStatus,
        metrics: updatedMetrics,
        lastUpdated: new Date()
      }));

      // Log status change for debugging
      if (previousOverallStatus !== newOverallStatus) {
        
        // Dispatch custom event for external components to listen to
        window.dispatchEvent(new CustomEvent('healthStatusChanged', {
          detail: {
            previous: previousOverallStatus,
            current: newOverallStatus,
            timestamp: new Date()
          }
        }));
      }

    } catch (error) {
      console.error('Error fetching health status:', error);
      // In case of error, mark as critical
      setHealthData(prev => ({
        ...prev,
        overall: 'critical',
        lastUpdated: new Date()
      }));
    } finally {
      setLoading(false);
    }
  }, [healthData.components, healthData.overall, healthData.metrics, calculateOverallStatus, getStatusFromResponseTime, getStatusFromUptime, fetchDatabaseHealth, fetchApiServerHealth, fetchExternalServicesHealth, fetchMessageQueueHealth, selectedMispServers]);

  // Load initial health data on component mount
  useEffect(() => {
    fetchHealthStatus();
  }, []); // Empty dependency array means this runs only once on mount

  // Load available MISP servers on component mount
  useEffect(() => {
    fetchAvailableMispServers();
  }, [fetchAvailableMispServers]);

  // Auto-refresh health status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealthStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchHealthStatus]);

  // Manual refresh function
  const refreshHealth = useCallback(() => {
    fetchHealthStatus();
  }, [fetchHealthStatus]);

  const value = {
    healthData,
    loading,
    refreshHealth,
    fetchHealthStatus,
    thresholds,
    getStatusFromResponseTime,
    getStatusFromUptime,
    getStatusFromMetric,
    selectedMispServers,
    availableMispServers,
    updateSelectedMispServers,
    fetchAvailableMispServers
  };

  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  );
};

export default HealthProvider;
