import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const SERVER_URL = process.env.REACT_APP_API_URL;

// Main navigation. `admin: true` items are gated behind userIsStaff,
// mirroring the previous NavBar behaviour (Kafka / Forms were staff-only).
const NAV_MAIN = [
  { to: '/events', label: 'Events', icon: 'bi-shield-exclamation' },
  { to: '/aggregation', label: 'Aggregation', icon: 'bi-diagram-3' },
  { to: '/analytics', label: 'Analytics', icon: 'bi-graph-up' },
  { to: '/reports', label: 'Reports', icon: 'bi-file-earmark-text' },
  { to: '/share-logs', label: 'Shared Logs', icon: 'bi-clock-history' },
];
const NAV_ADMIN = [
  { to: '/admin/kafka', label: 'Kafka', icon: 'bi-hdd-network' },
  { to: '/admin/forms', label: 'Forms', icon: 'bi-ui-checks' },
  { to: '/health', label: 'System Health', icon: 'bi-heart-pulse' },
];

function Item({ to, label, icon }) {
  return (
    <NavLink to={to} className={({ isActive }) => 'mi-rail__link' + (isActive ? ' active' : '')}>
      <i className={`bi ${icon}`}></i><span>{label}</span>
    </NavLink>
  );
}

function Sidebar() {
  const [userIsStaff, setUserIsStaff] = useState(false);

  // Same staff check as the former NavBar (GET /api/users/info/).
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const response = await fetch(`${SERVER_URL}/api/users/info/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const userData = await response.json();
          setUserIsStaff(userData.is_staff || false);
        }
      } catch (error) {
        setUserIsStaff(false);
      }
    };
    fetchUserInfo();
  }, []);

  return (
    <aside className="mi-rail">
      <NavLink to="/events" className="mi-rail__brand">
        <img
          src={`${process.env.PUBLIC_URL}/cti4bc-logo-dark.svg`}
          alt="CTI4BC"
          className="mi-rail__logo mi-rail__logo--full"
        />
        <img
          src={`${process.env.PUBLIC_URL}/cti4bc-favicon.svg`}
          alt="CTI4BC"
          className="mi-rail__logo mi-rail__logo--mark"
        />
      </NavLink>
      <nav className="mi-rail__nav">
        {NAV_MAIN.map((it) => <Item key={it.to} {...it} />)}
        {userIsStaff && <div className="mi-rail__group-label">Admin</div>}
        {userIsStaff && NAV_ADMIN.map((it) => <Item key={it.to} {...it} />)}
      </nav>
      <div className="mi-rail__foot">Montimage · CTI4BC</div>
    </aside>
  );
}

export default Sidebar;
