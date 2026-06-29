import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './layout.css';

// Persistent application shell: left sidebar + top utility bar + routed content.
// Wraps all authenticated routes (see App.js). The Login route stays outside.
function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={'mi-app' + (collapsed ? ' collapsed' : '')}>
      <Sidebar />
      <Topbar onToggle={() => setCollapsed((c) => !c)} />
      <main className="mi-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
