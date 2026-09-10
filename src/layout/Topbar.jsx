import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import SystemHealthIndicator from '../components/SystemHealth';
import NotificationBell from '../components/Notifications/NotificationBell';
import UserProfile from '../UserProfile/UserProfile';
import { clearAuth } from '../auth';

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
  const { themePreference, toggleTheme } = useTheme();

  // Icon reflects the NEXT state in the light → dark → system cycle.
  const themeIcon =
    themePreference === 'light' ? 'bi-moon-stars'
    : themePreference === 'dark' ? 'bi-sun'
    : 'bi-display';

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <header className="mi-topbar">
      <button className="mi-topbar__toggle" onClick={onToggle} title="Toggle menu" aria-label="Toggle menu">
        <i className="bi bi-list"></i>
      </button>
      <div className="mi-topbar__crumbs">
        <span>CTI</span>
        <i className="bi bi-chevron-right" style={{ fontSize: '.7rem' }}></i>
        <b>{titleFor(location.pathname)}</b>
      </div>
      <div className="mi-topbar__spacer"></div>
      <div className="mi-topbar__util">
        <button className="mi-theme-toggle" onClick={toggleTheme} title="Toggle theme" type="button">
          <i className={`bi ${themeIcon}`}></i> Theme
        </button>
        <SystemHealthIndicator />
        <NotificationBell />
        <UserProfile onLogout={handleLogout} />
      </div>
    </header>
  );
}

export default Topbar;
