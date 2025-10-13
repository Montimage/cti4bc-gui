import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Dropdown, InputGroup, FormControl } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from './NotificationContext';
import { useTheme } from '../../ThemeContext';
import NavBar from '../../NavBar/NavBar';
import './NotificationsPage.css';

function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications 
  } = useNotifications();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read', 'success', 'error', 'warning', 'info'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'type'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isThemeChanging, setIsThemeChanging] = useState(false);

  // Handle theme change with temporary transition disable
  useEffect(() => {
    setIsThemeChanging(true);
    const timer = setTimeout(() => {
      setIsThemeChanging(false);
    }, 50); // Very short delay to allow theme change to complete
    
    return () => clearTimeout(timer);
  }, [theme]);

  const handleStatsCardClick = (filterType) => {
    setFilter(filterType);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill text-white';
      case 'error':
        return 'bi-x-circle-fill text-white';
      case 'warning':
        return 'bi-exclamation-triangle-fill text-white';
      default:
        return 'bi-info-circle-fill text-white';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const formatFullDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications
    .filter(notification => {
      if (filter === 'unread') return !notification.read;
      if (filter === 'read') return notification.read;
      if (filter === 'success' || filter === 'error' || filter === 'warning' || filter === 'info') {
        return notification.type === filter;
      }
      return true;
    })
    .filter(notification => {
      if (!searchTerm) return true;
      return notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'type':
          return a.type.localeCompare(b.type);
        case 'newest':
        default:
          return b.timestamp - a.timestamp;
      }
    });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const getBadgeVariant = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getNotificationStats = () => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const success = notifications.filter(n => n.type === 'success').length;
    const error = notifications.filter(n => n.type === 'error').length;
    const warning = notifications.filter(n => n.type === 'warning').length;
    const info = notifications.filter(n => n.type === 'info').length;
    
    return { total, unread, success, error, warning, info };
  };

  const stats = getNotificationStats();

  return (
    <div className={`notifications-page ${theme} ${isThemeChanging ? 'theme-changing' : ''}`}>
      <div className="notifications-wrapper mt-4 px-4">
        <NavBar />
        
        {/* Header Section */}
        <div className="notifications-header">
          <div className="header-content">
            <div className="header-title">
              <div className="icon-wrapper">
                <i className="bi bi-bell-fill"></i>
              </div>
              <div>
                <h1 className="page-title">Notifications</h1>
                <p className="page-subtitle">
                  Stay updated with your latest activities
                  {filter !== 'all' && (
                    <Badge bg="secondary" className="ms-2">
                      Showing: {filter === 'unread' ? 'Unread' : 
                                filter === 'read' ? 'Read' :
                                filter.charAt(0).toUpperCase() + filter.slice(1)} 
                      ({filteredNotifications.length})
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <div className="unread-summary">
                <Badge bg="primary" className="unread-badge">
                  <i className="bi bi-dot me-1"></i>
                  {unreadCount} unread
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <Row className="stats-row mb-4">
          <Col md={2} sm={6} className="mb-3">
            <Card 
              className={`stats-card total ${theme} ${filter === 'all' ? 'active' : ''}`}
              onClick={() => handleStatsCardClick('all')}
              style={{ cursor: 'pointer' }}
            >
              <Card.Body className="text-center">
                <i className="bi bi-collection stats-icon"></i>
                <h3>{stats.total}</h3>
                <p>Total</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2} sm={6} className="mb-3">
            <Card 
              className={`stats-card unread ${theme} ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => handleStatsCardClick('unread')}
              style={{ cursor: 'pointer' }}
            >
              <Card.Body className="text-center">
                <i className="bi bi-circle-fill stats-icon text-primary"></i>
                <h3>{stats.unread}</h3>
                <p>Unread</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2} sm={6} className="mb-3">
            <Card 
              className={`stats-card success ${theme} ${filter === 'success' ? 'active' : ''}`}
              onClick={() => handleStatsCardClick('success')}
              style={{ cursor: 'pointer' }}
            >
              <Card.Body className="text-center">
                <i className="bi bi-check-circle-fill stats-icon text-success"></i>
                <h3>{stats.success}</h3>
                <p>Success</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2} sm={6} className="mb-3">
            <Card 
              className={`stats-card error ${theme} ${filter === 'error' ? 'active' : ''}`}
              onClick={() => handleStatsCardClick('error')}
              style={{ cursor: 'pointer' }}
            >
              <Card.Body className="text-center">
                <i className="bi bi-x-circle-fill stats-icon text-danger"></i>
                <h3>{stats.error}</h3>
                <p>Errors</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2} sm={6} className="mb-3">
            <Card 
              className={`stats-card warning ${theme} ${filter === 'warning' ? 'active' : ''}`}
              onClick={() => handleStatsCardClick('warning')}
              style={{ cursor: 'pointer' }}
            >
              <Card.Body className="text-center">
                <i className="bi bi-exclamation-triangle-fill stats-icon text-warning"></i>
                <h3>{stats.warning}</h3>
                <p>Warnings</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2} sm={6} className="mb-3">
            <Card 
              className={`stats-card info ${theme} ${filter === 'info' ? 'active' : ''}`}
              onClick={() => handleStatsCardClick('info')}
              style={{ cursor: 'pointer' }}
            >
              <Card.Body className="text-center">
                <i className="bi bi-info-circle-fill stats-icon text-info"></i>
                <h3>{stats.info}</h3>
                <p>Info</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Controls Section */}
        <Card className={`controls-card mb-4 ${theme}`}>
          <Card.Body>
            <Row className="align-items-center">
              <Col lg={4} md={6} className="mb-3 mb-lg-0">
                <InputGroup>
                  <InputGroup.Text>
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <FormControl
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setSearchTerm('')}
                      className="clear-search-btn"
                    >
                      <i className="bi bi-x-lg"></i>
                    </Button>
                  )}
                </InputGroup>
              </Col>
              
              <Col lg={4} md={6} className="mb-3 mb-lg-0">
                <div className="filter-buttons">
                  <Button
                    variant={filter === 'all' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="filter-btn"
                  >
                    <i className="bi bi-list-ul me-1"></i>
                    All ({notifications.length})
                  </Button>
                  <Button
                    variant={filter === 'unread' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setFilter('unread')}
                    className="filter-btn"
                  >
                    <i className="bi bi-circle-fill me-1"></i>
                    Unread ({stats.unread})
                  </Button>
                  <Button
                    variant={filter === 'read' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setFilter('read')}
                    className="filter-btn"
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    Read ({stats.total - stats.unread})
                  </Button>
                </div>
                
                {/* Type Filter Buttons */}
                <div className="filter-buttons mt-2">
                  <Button
                    variant={filter === 'success' ? 'success' : 'outline-success'}
                    size="sm"
                    onClick={() => setFilter('success')}
                    className="filter-btn"
                  >
                    <i className="bi bi-check-circle-fill me-1"></i>
                    Success ({stats.success})
                  </Button>
                  <Button
                    variant={filter === 'error' ? 'danger' : 'outline-danger'}
                    size="sm"
                    onClick={() => setFilter('error')}
                    className="filter-btn"
                  >
                    <i className="bi bi-x-circle-fill me-1"></i>
                    Errors ({stats.error})
                  </Button>
                  <Button
                    variant={filter === 'warning' ? 'warning' : 'outline-warning'}
                    size="sm"
                    onClick={() => setFilter('warning')}
                    className="filter-btn"
                  >
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    Warnings ({stats.warning})
                  </Button>
                  <Button
                    variant={filter === 'info' ? 'info' : 'outline-info'}
                    size="sm"
                    onClick={() => setFilter('info')}
                    className="filter-btn"
                  >
                    <i className="bi bi-info-circle-fill me-1"></i>
                    Info ({stats.info})
                  </Button>
                </div>
              </Col>
              
              <Col lg={4} className="text-end">
                <div className="action-buttons">
                  <Dropdown className="me-2">
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      <i className="bi bi-sort-down me-1"></i>
                      Sort by {sortBy}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => setSortBy('newest')}>
                        <i className="bi bi-sort-numeric-down me-2"></i>Newest first
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setSortBy('oldest')}>
                        <i className="bi bi-sort-numeric-up me-2"></i>Oldest first
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setSortBy('type')}>
                        <i className="bi bi-sort-alpha-down me-2"></i>By type
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                  
                  {unreadCount > 0 && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={markAllAsRead}
                      className="me-2"
                    >
                      <i className="bi bi-check-all me-1"></i>
                      Mark All Read
                    </Button>
                  )}
                  
                  {notifications.length > 0 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={clearAllNotifications}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Clear All
                    </Button>
                  )}
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Notifications List */}
        <div className="notifications-container">
          {filteredNotifications.length === 0 ? (
            <Card className={`empty-state ${theme}`}>
              <Card.Body className="text-center py-5">
                <div className="empty-icon">
                  <i className={`bi ${searchTerm ? 'bi-search' : filter === 'all' ? 'bi-bell-slash' : filter === 'unread' ? 'bi-check-circle' : 'bi-list-check'}`}></i>
                </div>
                <h3 className="empty-title">
                  {searchTerm 
                    ? 'No matching notifications' 
                    : filter === 'all' 
                      ? 'No notifications yet' 
                      : filter === 'unread' 
                        ? 'All caught up!' 
                        : 'No read notifications'
                  }
                </h3>
                <p className="empty-description">
                  {searchTerm 
                    ? `No notifications match "${searchTerm}"` 
                    : filter === 'all' 
                      ? 'You have no notifications at the moment.' 
                      : filter === 'unread' 
                        ? 'All your notifications have been read.' 
                        : 'You have no read notifications.'
                  }
                </p>
                {searchTerm && (
                  <Button variant="outline-primary" onClick={() => setSearchTerm('')}>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Clear Search
                  </Button>
                )}
              </Card.Body>
            </Card>
          ) : (
            <div className="notifications-list">
              {filteredNotifications.map((notification, index) => (
                <Card 
                  key={notification.id} 
                  className={`notification-card ${notification.read ? 'read' : 'unread'} ${theme}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Card.Body>
                    <div className="notification-content">
                      <div className="notification-icon-wrapper">
                        <div className={`notification-icon ${notification.type}`}>
                          <i className={getIcon(notification.type)}></i>
                        </div>
                        {!notification.read && <div className="unread-dot"></div>}
                      </div>
                      
                      <div className="notification-body">
                        <div className="notification-header">
                          <h6 className="notification-title">{notification.title}</h6>
                          <div className="notification-meta">
                            <Badge bg={getBadgeVariant(notification.type)} className="type-badge">
                              {notification.type}
                            </Badge>
                            <span className="timestamp" title={formatFullDate(notification.timestamp)}>
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="notification-message">{notification.message}</p>
                        
                        <div className="notification-actions">
                          {!notification.read && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="action-btn mark-read"
                            >
                              <i className="bi bi-check me-1"></i>
                              Mark as read
                            </Button>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="action-btn delete"
                          >
                            <i className="bi bi-trash me-1"></i>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
