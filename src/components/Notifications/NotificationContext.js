import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Load notifications from localStorage on init
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cti4bc_notifications');
      if (stored) {
        const parsedNotifications = JSON.parse(stored);
        setNotifications(parsedNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }

    // Listen for new notifications from toasts
    const handleNotificationAdded = (event) => {
      setNotifications(prev => [event.detail, ...prev]);
    };

    window.addEventListener('notificationAdded', handleNotificationAdded);
    
    return () => {
      window.removeEventListener('notificationAdded', handleNotificationAdded);
    };
  }, []);

  // Save notifications to localStorage whenever they change
  const saveNotificationsToStorage = useCallback((notifs) => {
    try {
      localStorage.setItem('cti4bc_notifications', JSON.stringify(notifs));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, []);

  const addNotification = useCallback((message, type = 'info', title = null) => {
    // Check if notifications are enabled
    try {
      const preferences = localStorage.getItem('cti4bc_user_preferences');
      if (preferences) {
        const parsed = JSON.parse(preferences);
        if (!parsed.notifications) {
          return; // Don't add notification if disabled
        }
      }
    } catch (error) {
      console.error('Error checking notification preferences:', error);
    }

    const notification = {
      id: Date.now() + Math.random(),
      title: title || 'Notification',
      message,
      type, // 'success', 'error', 'warning', 'info'
      timestamp: Date.now(),
      read: false
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      saveNotificationsToStorage(newNotifications);
      return newNotifications;
    });

    return notification.id;
  }, [saveNotificationsToStorage]);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      );
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, [saveNotificationsToStorage]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(notif => ({ ...notif, read: true }));
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, [saveNotificationsToStorage]);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.filter(notif => notif.id !== id);
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, [saveNotificationsToStorage]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    saveNotificationsToStorage([]);
  }, [saveNotificationsToStorage]);

  // Convenience methods
  const addSuccessNotification = useCallback((message, title = 'Success') => {
    return addNotification(message, 'success', title);
  }, [addNotification]);

  const addErrorNotification = useCallback((message, title = 'Error') => {
    return addNotification(message, 'error', title);
  }, [addNotification]);

  const addWarningNotification = useCallback((message, title = 'Warning') => {
    return addNotification(message, 'warning', title);
  }, [addNotification]);

  const addInfoNotification = useCallback((message, title = 'Information') => {
    return addNotification(message, 'info', title);
  }, [addNotification]);

  // Get unread count
  const unreadCount = notifications.filter(notif => !notif.read).length;

  const value = {
    notifications,
    unreadCount,
    addNotification,
    addSuccessNotification,
    addErrorNotification,
    addWarningNotification,
    addInfoNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
