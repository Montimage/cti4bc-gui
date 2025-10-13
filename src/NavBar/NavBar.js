import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import UserProfile from '../UserProfile/UserProfile';
import NotificationBell from '../components/Notifications/NotificationBell';
import SystemHealthIndicator from '../components/SystemHealth';

const SERVER_URL = process.env.REACT_APP_API_URL;

function NavBar({ showNavLinks = true }) {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [userIsStaff, setUserIsStaff] = useState(false);

  // Fetch user information to check if user is staff
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`${SERVER_URL}/api/users/info/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUserIsStaff(userData.is_staff || false);
        }
      } catch (error) {
        // Error fetching user info
        setUserIsStaff(false);
      }
    };

    fetchUserInfo();
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userData');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  const isAnalytics = location.pathname === '/analytics';
  const isShareLogs = location.pathname === '/share-logs';
  const isKafka = location.pathname === '/admin/kafka';
  const isForms = location.pathname === '/admin/forms';
  const isFormStats = location.pathname === '/admin/form-stats';
  const isMyFormAnswers = location.pathname === '/my-form-answers';
  const isNotifications = location.pathname === '/notifications';
  const isHealth = location.pathname === '/health';
  const isReports = location.pathname === '/reports';
  const isAnalyticsOrShareLogsOrKafkaOrMyFormAnswersOrNotificationsOrHealth = isAnalytics || isShareLogs || isKafka || isForms || isFormStats || isMyFormAnswers || isNotifications || isHealth || isReports;

  return (
    <div className="d-flex justify-content-between align-items-center mb-3" style={{ transition: 'none' }}>
      <div className="d-flex align-items-center">
        <h4 className="mb-0 me-4" style={{ transition: 'none' }}>CTI4BC</h4>
        {showNavLinks && (
          <div style={{ transition: 'none' }}>
            {!isShareLogs && (
              <Button 
                variant="outline-primary" 
                className="me-2" 
                onClick={() => navigate('/share-logs')}
                style={{ transition: 'none' }}
              >
                Shared Logs
              </Button>
            )}
            {!isAnalytics && (
              <Button 
                variant="outline-success" 
                className="me-2"
                onClick={() => navigate('/analytics')}
                style={{ transition: 'none' }}
              >
                Analytics
              </Button>
            )}
            {!isKafka && userIsStaff && (
              <Button 
                variant="outline-info" 
                className="me-2"
                onClick={() => navigate('/admin/kafka')}
                style={{ transition: 'none' }}
              >
                Kafka
              </Button>
            )}
            {!isForms && !isFormStats && userIsStaff && (
              <Button 
                variant="outline-warning" 
                className="me-2"
                onClick={() => navigate('/admin/forms')}
                style={{ transition: 'none' }}
              >
                Forms
              </Button>
            )}
            {!isReports && (
              <Button 
                variant="outline-secondary" 
                className="me-2"
                onClick={() => navigate('/reports')}
                style={{ transition: 'none' }}
              >
                Reports
              </Button>
            )}
            {isAnalyticsOrShareLogsOrKafkaOrMyFormAnswersOrNotificationsOrHealth && (
              <Button 
                variant="outline-danger" 
                className="me-2" 
                onClick={() => navigate('/events')}
                style={{ transition: 'none' }}
              >
                <i className="bi me-1"></i>
                Back to Events
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="d-flex align-items-center" style={{ transition: 'none' }}>
        <SystemHealthIndicator />
        <NotificationBell />
        <UserProfile onLogout={handleLogout} />
      </div>
    </div>
  );
}

export default NavBar;