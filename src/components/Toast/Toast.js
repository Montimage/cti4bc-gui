import React, { useEffect, useState } from 'react';
import { useTheme } from '../../ThemeContext';
import { useToast } from './ToastContext';
import './Toast.css';

const Toast = ({ toast }) => {
  const { theme } = useTheme();
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-x-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'info':
      default:
        return 'bi-info-circle-fill';
    }
  };

  const getProgressColor = () => {
    switch (toast.type) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
      default:
        return '#17a2b8';
    }
  };

  return (
    <div 
      className={`toast-item toast-${toast.type} ${theme} ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-content">
        <div className="toast-icon">
          <i className={`bi ${getIcon()}`}></i>
        </div>
        <div className="toast-message">
          {toast.message}
        </div>
        <button 
          className="toast-close"
          onClick={handleClose}
          aria-label="Close notification"
        >
          <i className="bi bi-x"></i>
        </button>
      </div>
      {toast.duration > 0 && (
        <div 
          className="toast-progress"
          style={{
            '--progress-color': getProgressColor(),
            '--duration': `${toast.duration}ms`
          }}
        />
      )}
    </div>
  );
};

export default Toast;
