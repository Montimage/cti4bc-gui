import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SystemHealthIndicator from '../components/SystemHealth';
import NotificationBell from '../components/Notifications/NotificationBell';
import UserProfile from '../UserProfile/UserProfile';

// Map routes to a human page title shown in the topbar.
const TITLES = {
  '/events': 'Events',
  '/aggregation': 'Aggregation',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/share-logs': 'Shared Logs',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/my-form-answers': 'My Form Answers',
  '/health': 'System Health',
  '/admin/kafka': 'Kafka',
  '/admin/forms': 'Forms',
  '/admin/form-stats': 'Form Statistics',
};

function titleFor(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/event/')) return 'Event detail';
  if (pathname.startsWith('/download/')) return 'Download';
  return 'CTI4BC';
}

function Topbar({ onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Identical logout behaviour to the former NavBar.
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userData');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  return (
    <header className="mi-topbar">
      <button className="mi-topbar__toggle" onClick={onToggle} title="Toggle menu" aria-label="Toggle menu">
        <i className="bi bi-list"></i>
      </button>
      <div className="mi-topbar__title">{titleFor(location.pathname)}</div>
      <div className="mi-topbar__spacer"></div>
      <div className="mi-topbar__util">
        <SystemHealthIndicator />
        <NotificationBell />
        <UserProfile onLogout={handleLogout} />
      </div>
    </header>
  );
}

export default Topbar;
