import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useNotifications } from './NotificationContext';
import EmptyState from '../EmptyState/EmptyState';
import './NotificationsPage.css';

// Per-type presentation (icon + charter badge class + label).
const TYPE_META = {
  success: { icon: 'bi-check-circle-fill', badge: 'mi-success', label: 'Success' },
  error:   { icon: 'bi-x-circle-fill',     badge: 'mi-danger',  label: 'Error' },
  warning: { icon: 'bi-exclamation-triangle-fill', badge: 'mi-warning', label: 'Warning' },
  info:    { icon: 'bi-info-circle-fill',  badge: 'mi-info',    label: 'Info' },
};

function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // all | unread | success | error | warning | info
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | type

  // Relative "x ago" label; the full date is exposed via the title attribute.
  const formatTime = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const formatFullDate = (timestamp) =>
    new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    success: notifications.filter((n) => n.type === 'success').length,
    error: notifications.filter((n) => n.type === 'error').length,
    warning: notifications.filter((n) => n.type === 'warning').length,
    info: notifications.filter((n) => n.type === 'info').length,
  };

  const filtered = notifications
    .filter((n) => {
      if (filter === 'unread') return !n.read;
      if (['success', 'error', 'warning', 'info'].includes(filter)) return n.type === filter;
      return true;
    })
    .filter((n) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return a.timestamp - b.timestamp;
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      return b.timestamp - a.timestamp;
    });

  // The stat cards double as the primary filter (all / unread / by type),
  // replacing the previous redundant rows of filter buttons.
  const filterCards = [
    { key: 'all', label: 'Total', value: stats.total },
    { key: 'unread', label: 'Unread', value: stats.unread, accent: 'amber' },
    { key: 'success', label: 'Success', value: stats.success, accent: 'success' },
    { key: 'error', label: 'Errors', value: stats.error, accent: 'danger' },
    { key: 'warning', label: 'Warnings', value: stats.warning, accent: 'warning' },
    { key: 'info', label: 'Info', value: stats.info, accent: 'info' },
  ];

  return (
    <div className="mi-notif-page">
      {/* Header */}
      <div className="mi-page-head">
        <div>
          <h1>Notifications</h1>
          <div className="mi-sub">Stay updated with your latest activity across CTI4BC.</div>
        </div>
        <div className="mi-page-head__actions">
          {unreadCount > 0 && (
            <Button variant="outline-primary" onClick={markAllAsRead}>
              <i className="bi bi-check2-all me-2"></i>Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline-danger" onClick={clearAllNotifications}>
              <i className="bi bi-trash me-2"></i>Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Clickable filter cards */}
      <div className="mi-notif-stats">
        {filterCards.map((c) => (
          <div
            key={c.key}
            role="button"
            tabIndex={0}
            className={`mi-stat mi-clickable${filter === c.key ? ' mi-active' : ''}`}
            onClick={() => setFilter(c.key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilter(c.key); } }}
          >
            <div className="mi-stat__label">{c.label}</div>
            <div className={`mi-stat__value${c.accent ? ` mi-notif-val--${c.accent}` : ''}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mi-toolbar">
        <div className="mi-field" style={{ flex: '1 1 260px' }}>
          <label>Search</label>
          <div className="mi-search">
            <i className="bi bi-search"></i>
            <Form.Control
              type="search"
              placeholder="Search notifications…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="mi-field">
          <label>Sort</label>
          <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="type">By type</option>
          </Form.Select>
        </div>
        <div className="mi-toolbar__spacer"></div>
        <span className="mi-help">Showing {filtered.length} of {notifications.length}</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="mi-card">
          <EmptyState
            icon={searchTerm ? 'bi-search' : filter === 'unread' ? 'bi-check2-circle' : 'bi-bell-slash'}
            title={
              searchTerm ? 'No matching notifications'
                : filter === 'unread' ? 'All caught up!'
                : filter === 'all' ? 'No notifications yet'
                : 'Nothing here'
            }
            description={
              searchTerm ? `Nothing matches “${searchTerm}”.`
                : filter === 'unread' ? 'You have read everything — nice work.'
                : filter === 'all' ? 'Notifications about your activity will appear here.'
                : `No ${filter} notifications at the moment.`
            }
            action={
              searchTerm ? (
                <Button variant="outline-primary" onClick={() => setSearchTerm('')}>
                  <i className="bi bi-arrow-counterclockwise me-2"></i>Clear search
                </Button>
              ) : filter !== 'all' ? (
                <Button variant="outline-primary" onClick={() => setFilter('all')}>
                  <i className="bi bi-list-ul me-2"></i>Show all
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mi-notif-list">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.info;
            return (
              <div
                key={n.id}
                className={`mi-notif mi-notif--${n.type}${n.read ? '' : ' unread'}`}
                onClick={() => !n.read && markAsRead(n.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter') && !n.read && markAsRead(n.id)}
              >
                <div className="mi-notif__icon"><i className={`bi ${meta.icon}`}></i></div>
                <div className="mi-notif__body">
                  <div className="mi-notif__head">
                    <div className="mi-notif__title">
                      {!n.read && <span className="mi-notif__dot" aria-label="unread"></span>}
                      {n.title}
                    </div>
                    <div className="mi-notif__meta">
                      <span className={`mi-badge ${meta.badge}`}><span className="mi-led"></span> {meta.label}</span>
                      <span className="mi-notif__time" title={formatFullDate(n.timestamp)}>{formatTime(n.timestamp)}</span>
                    </div>
                  </div>
                  <div className="mi-notif__msg">{n.message}</div>
                  <div className="mi-notif__actions">
                    {!n.read && (
                      <button
                        type="button"
                        className="mi-notif__act"
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                      >
                        <i className="bi bi-check2 me-1"></i>Mark as read
                      </button>
                    )}
                    <button
                      type="button"
                      className="mi-notif__act mi-notif__act--danger"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    >
                      <i className="bi bi-trash me-1"></i>Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
