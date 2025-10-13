import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../ThemeContext';
import { useHealth } from './HealthContext';
import { hasAdminPrivileges, getToken } from '../../auth';
import './SystemHealthIndicator.css';

const SERVER_URL = process.env.REACT_APP_API_URL;

function SystemHealthIndicator() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastStatus, setLastStatus] = useState('healthy');
  const [statusChangeAnimation, setStatusChangeAnimation] = useState(false);
  const [userHasAdminAccess, setUserHasAdminAccess] = useState(false);
  const { healthData, refreshHealth } = useHealth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Check user admin access dynamically
  useEffect(() => {
    const checkUserAccess = async () => {
      try {
        const token = getToken();
        if (!token) {
          setUserHasAdminAccess(false);
          return;
        }

        const response = await fetch(`${SERVER_URL}/api/users/info/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          // Store user info for other components
          localStorage.setItem('userInfo', JSON.stringify(userData));
          // Check if user has admin privileges (staff or superuser)
          const isAdmin = userData.is_staff || userData.is_superuser;
          setUserHasAdminAccess(isAdmin);
        } else {
          setUserHasAdminAccess(false);
        }
      } catch (error) {
        console.error('Error checking user access:', error);
        setUserHasAdminAccess(false);
      }
    };

    checkUserAccess();
  }, []);

  // Listen for health status changes
  useEffect(() => {
    const handleStatusChange = (event) => {
      const { previous, current } = event.detail;
      
      // Trigger animation on status change
      setStatusChangeAnimation(true);
      setTimeout(() => setStatusChangeAnimation(false), 1000);
      
      setLastStatus(previous);
    };

    window.addEventListener('healthStatusChanged', handleStatusChange);
    
    return () => {
      window.removeEventListener('healthStatusChanged', handleStatusChange);
    };
  }, []);

  // Update last status when health data changes
  useEffect(() => {
    if (healthData.overall !== lastStatus) {
      setLastStatus(healthData.overall);
    }
  }, [healthData.overall, lastStatus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // TODO: Replace with actual health check logic
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleRefresh = () => {
    refreshHealth();
  };

  const handleViewMore = () => {
    setIsOpen(false);
    // Redirect to events page if user doesn't have admin access
    if (!userHasAdminAccess) {
      navigate('/events');
    } else {
      navigate('/health');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'var(--bs-success)';
      case 'warning':
        return 'var(--bs-warning)';
      case 'critical':
        return 'var(--bs-danger)';
      default:
        return 'var(--bs-secondary)';
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

  return (
    <div className={`system-health-indicator ${theme}`} ref={dropdownRef}>
      <button 
        className={`health-button ${theme} ${healthData.overall} ${statusChangeAnimation ? 'status-changing' : ''}`}
        onClick={toggleDropdown}
        type="button"
        title={`System Health Status: ${healthData.overall.toUpperCase()}`}
      >
        <i className={`bi ${getStatusIcon(healthData.overall)}`}></i>
      </button>

      {isOpen && (
        <div className={`health-dropdown ${theme}`}>
          <div className="health-dropdown-header">
            <h6 className="mb-0">System Health</h6>
            <button 
              className="refresh-btn"
              onClick={handleRefresh}
              type="button"
              title="Refresh Status"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>

          <div className="health-components">
            {healthData.components.map((component, index) => (
              <div key={index} className="health-component-item">
                <div className="component-info">
                  <div className="component-status">
                    <i 
                      className={`bi ${getStatusIcon(component.status)}`}
                      style={{ color: getStatusColor(component.status) }}
                    ></i>
                    <span className="component-name">{component.name}</span>
                  </div>
                  <span className="component-response-time">{component.responseTime}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="health-footer">
            {userHasAdminAccess && (
              <button 
                className="view-more-btn"
                onClick={handleViewMore}
                type="button"
              >
                View Details
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemHealthIndicator;
