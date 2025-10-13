import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000, saveAsNotification = true) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      timestamp: Date.now()
    };

    setToasts(prev => [...prev, toast]);

    // Save as notification if enabled
    if (saveAsNotification) {
      try {
        // Get notification preferences
        const preferences = localStorage.getItem('cti4bc_user_preferences');
        if (preferences) {
          const parsed = JSON.parse(preferences);
          if (parsed.notifications) {
            // Add to notifications storage
            const notifications = JSON.parse(localStorage.getItem('cti4bc_notifications') || '[]');
            const notification = {
              id: Date.now() + Math.random(),
              title: type.charAt(0).toUpperCase() + type.slice(1),
              message,
              type,
              timestamp: Date.now(),
              read: false
            };
            notifications.unshift(notification);
            localStorage.setItem('cti4bc_notifications', JSON.stringify(notifications));
            
            // Trigger a custom event to notify the notification system
            window.dispatchEvent(new CustomEvent('notificationAdded', { detail: notification }));
          }
        }
      } catch (error) {
        console.error('Error saving notification:', error);
      }
    }

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message, duration = 4000, saveAsNotification = true) => {
    return addToast(message, 'success', duration, saveAsNotification);
  }, [addToast]);

  const showError = useCallback((message, duration = 6000, saveAsNotification = true) => {
    return addToast(message, 'error', duration, saveAsNotification);
  }, [addToast]);

  const showWarning = useCallback((message, duration = 5000, saveAsNotification = true) => {
    return addToast(message, 'warning', duration, saveAsNotification);
  }, [addToast]);

  const showInfo = useCallback((message, duration = 4000, saveAsNotification = true) => {
    return addToast(message, 'info', duration, saveAsNotification);
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};
