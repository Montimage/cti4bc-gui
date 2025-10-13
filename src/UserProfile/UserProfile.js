import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import './UserProfile.css';

const SERVER_URL = process.env.REACT_APP_API_URL;

function UserProfile({ onLogout }) {
  const [userInfo, setUserInfo] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme, themePreference, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${SERVER_URL}/api/users/info/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUserInfo(userData);
        } else {
          console.error('Failed to fetch user info', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = () => {
    setShowDropdown(false);
    onLogout();
  };

  const handleSettingsClick = () => {
    setShowDropdown(false);
    navigate('/settings');
  };

  const handleMyFormAnswersClick = () => {
    setShowDropdown(false);
    navigate('/my-form-answers');
  };

  const getThemeIcon = () => {
    switch (themePreference) {
      case 'light':
        return <i className="bi bi-sun-fill"></i>;
      case 'dark': 
        return <i className="bi bi-moon-stars-fill"></i>;
      case 'system':
        return <i className="bi bi-display"></i>; // Computer/display icon for system theme
      default:
        return <i className="bi bi-display"></i>;
    }
  };

  const getThemeTitle = () => {
    switch (themePreference) {
      case 'light':
        return 'Switch to Dark theme';
      case 'dark': 
        return 'Switch to System theme';
      case 'system':
        return 'Switch to Light theme';
      default:
        return 'Toggle theme';
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const getUserInitials = (username) => {
    if (!username) return 'U';
    return username.charAt(0).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center">
        <div className="spinner-border spinner-border-sm me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span>Loading...</span>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <div className="user-profile-container" ref={dropdownRef}>
      <div 
        className={`user-profile-trigger ${theme}`}
        onClick={toggleDropdown}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && toggleDropdown()}
      >
        <span className="user-name me-2">{userInfo.username}</span>
        <div className={`user-avatar ${theme}`}>
          {getUserInitials(userInfo.username)}
        </div>
      </div>

      {showDropdown && (
        <div className={`user-dropdown ${theme}`}>
          <div className="dropdown-header">
            <button 
              className={`btn btn-outline-${theme === 'dark' ? 'light' : 'dark'} btn-sm theme-toggle-header`}
              onClick={handleThemeToggle}
              title={getThemeTitle()}
            >
              {getThemeIcon()}
            </button>
            <div className={`user-avatar-large ${theme}`}>
              {getUserInitials(userInfo.username)}
            </div>
            <div className="user-details">
              <h6 className="mb-1">{userInfo.username}</h6>
              <small className={`text-${theme === 'dark' ? 'light' : 'muted'}`}>
                {userInfo.email || 'No email'}
              </small>
            </div>
          </div>

          <hr className="dropdown-divider" />

          <div className="dropdown-body">
            <div className="info-row">
              <i className="bi bi-person-badge me-2"></i>
              <span>
                <strong>Status:</strong> {userInfo.is_staff ? 'Administrator' : 'User'}
              </span>
            </div>
            
            <div className="info-row">
              <i className="bi bi-shield-check me-2"></i>
              <span>
                <strong>Superuser:</strong> {userInfo.is_superuser ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="info-row">
              <i className="bi bi-check-circle me-2"></i>
              <span>
                <strong>Active:</strong> {userInfo.is_active ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="info-row">
              <i className="bi bi-calendar-plus me-2"></i>
              <span>
                <strong>Joined on:</strong> {formatDate(userInfo.date_joined)}
              </span>
            </div>

            <div className="info-row">
              <i className="bi bi-clock me-2"></i>
              <span>
                <strong>Last login:</strong> {formatDate(userInfo.last_login)}
              </span>
            </div>
          </div>

          <hr className="dropdown-divider" />

          <div className="dropdown-footer">
            <button 
              className={`btn btn-outline-${theme === 'dark' ? 'light' : 'dark'} btn-sm`}
              onClick={handleMyFormAnswersClick}
            >
              <i className="bi bi-file-earmark-text me-1"></i>
              My Form Answers
            </button>
            <button 
              className={`btn btn-outline-${theme === 'dark' ? 'light' : 'dark'} btn-sm`}
              onClick={handleSettingsClick}
            >
              <i className="bi bi-gear me-1"></i>
              Settings
            </button>
            <button 
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
