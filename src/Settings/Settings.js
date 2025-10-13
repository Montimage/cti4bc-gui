import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { useToast } from '../components/Toast';
import { useNotifications } from '../components/Notifications/NotificationContext';
import './Settings.css';

const SERVER_URL = process.env.REACT_APP_API_URL;

function Settings() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Load active module from localStorage or default to 'info'
  const getStoredActiveModule = () => {
    try {
      return localStorage.getItem('cti4bc_settings_active_module') || 'info';
    } catch (error) {
      return 'info';
    }
  };
  
  const [activeModule, setActiveModule] = useState(getStoredActiveModule());
  const [activeTab, setActiveTab] = useState('profile');

  // Save active module to localStorage when it changes
  const handleModuleChange = (moduleId) => {
    setActiveModule(moduleId);
    try {
      localStorage.setItem('cti4bc_settings_active_module', moduleId);
    } catch (error) {
      console.error('Error saving active module to localStorage:', error);
    }
  };

  const { theme, themePreference, setTheme, getSystemTheme } = useTheme();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const { addNotification } = useNotifications();

  // Load preferences from localStorage or use defaults
  const getStoredPreferences = () => {
    try {
      const stored = localStorage.getItem('cti4bc_user_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          theme: themePreference, // Use themePreference instead of theme
          notifications: parsed.notifications ?? true
        };
      }
    } catch (error) {
      console.error('Error loading preferences from localStorage:', error);
    }
    return {
      theme: themePreference,
      notifications: true
    };
  };

  // Preferences state
  const [preferences, setPreferences] = useState(getStoredPreferences());

  // Save preferences to localStorage whenever they change
  const savePreferencesToStorage = (newPreferences) => {
    try {
      const toStore = {
        notifications: newPreferences.notifications
        // Don't store theme as it's managed by ThemeContext
      };
      localStorage.setItem('cti4bc_user_preferences', JSON.stringify(toStore));
    } catch (error) {
      console.error('Error saving preferences to localStorage:', error);
    }
  };

  // Update preferences when theme changes externally
  useEffect(() => {
    setPreferences(prev => ({ ...prev, theme: themePreference }));
  }, [themePreference]);

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const storedPrefs = getStoredPreferences();
    setPreferences(storedPrefs);
  }, [themePreference]);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Module configuration
  const modules = [
    {
      id: 'info',
      name: 'Info',
      icon: 'bi-info-circle',
      description: 'View and edit your profile information'
    },
    {
      id: 'security',
      name: 'Security',
      icon: 'bi-shield-lock',
      description: 'Manage password and security settings'
    },
    {
      id: 'preferences',
      name: 'Preferences',
      icon: 'bi-gear',
      description: 'Customize your experience and notifications'
    }
  ];

  const fetchUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/');
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
        setProfileForm({
          username: userData.username || '',
          email: userData.email || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || ''
        });
      } else {
        showError('Failed to fetch user information');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      showError('Error loading user information');
    } finally {
      setLoading(false);
    }
  }, [navigate, setUserInfo, setProfileForm, setLoading, showError]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${SERVER_URL}/api/users/update-profile/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUserInfo(updatedUser);
        showSuccess('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        showError(errorData.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showError('New passwords do not match');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${SERVER_URL}/api/users/change-password/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      if (response.ok) {
        showSuccess('Password changed successfully!');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        const errorData = await response.json();
        showError(errorData.detail || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Error changing password');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Save preferences to localStorage immediately
      savePreferencesToStorage(preferences);
      
      // Apply theme change if needed
      if (preferences.theme !== themePreference) {
        setTheme(preferences.theme);
      }
      
      // Simulate API call for future backend integration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      showSuccess('Preferences updated successfully!');
    } catch (error) {
      console.error('Error updating preferences:', error);
      showError('Error updating preferences');
    } finally {
      setSaving(false);
    }
  };

  // Handle preference changes with immediate local storage
  const handlePreferenceChange = (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    
    setPreferences(newPreferences);
    savePreferencesToStorage(newPreferences);
    
    // Apply theme change immediately if theme is changed
    if (key === 'theme' && value !== themePreference) {
      setTheme(value);
    }
    
    // Show immediate feedback for non-theme changes
    if (key !== 'theme') {
      showSuccess('Preference updated!');
    }
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
      return 'N/A';
    }
  };

  const getUserInitials = (username) => {
    if (!username) return 'U';
    return username.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`settings-container ${theme}`}>
      <div className="settings-header">
        <button 
          className={`btn btn-outline-${theme === 'dark' ? 'light' : 'dark'} me-3`}
          onClick={() => navigate(-1)}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back
        </button>
        <h2 className="mb-0">
          <i className="bi bi-gear me-2"></i>
          Settings
        </h2>
      </div>

      <div className="row">
        {/* Module Directory */}
        <div className="col-lg-3 mb-4">
          <div className={`settings-directory ${theme}`}>
            <h5 className="directory-title">
              <i className="bi bi-list me-2"></i>
              Modules
            </h5>
            <div className="directory-modules">
              {modules.map((module) => (
                <button
                  key={module.id}
                  className={`directory-module ${activeModule === module.id ? 'active' : ''} ${theme}`}
                  onClick={() => handleModuleChange(module.id)}
                >
                  <div className="module-icon">
                    <i className={`bi ${module.icon}`}></i>
                  </div>
                  <div className="module-info">
                    <div className="module-name">{module.name}</div>
                    <div className="module-description">{module.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Profile Card - Only show in Info module */}
        {activeModule === 'info' && (
          <div className="col-lg-4 mb-4">
            <div className={`settings-profile-card ${theme}`}>
              <div className="profile-header">
                <div className={`profile-avatar-large ${theme}`}>
                  {getUserInitials(userInfo?.username)}
                </div>
                <h4 className="profile-name">{userInfo?.username}</h4>
                <p className="profile-email">{userInfo?.email || 'No email set'}</p>
              </div>
              
              <div className="profile-details">
                <div className="detail-row">
                  <i className="bi bi-person-badge"></i>
                  <span>
                    <strong>Status:</strong> {userInfo?.is_staff ? 'Administrator' : 'User'}
                  </span>
                </div>
                
                <div className="detail-row">
                  <i className="bi bi-shield-check"></i>
                  <span>
                    <strong>Superuser:</strong> {userInfo?.is_superuser ? 'Yes' : 'No'}
                  </span>
                </div>

                <div className="detail-row">
                  <i className="bi bi-check-circle"></i>
                  <span>
                    <strong>Active:</strong> {userInfo?.is_active ? 'Yes' : 'No'}
                  </span>
                </div>

                <div className="detail-row">
                  <i className="bi bi-calendar-plus"></i>
                  <span>
                    <strong>Joined:</strong> {formatDate(userInfo?.date_joined)}
                  </span>
                </div>

                <div className="detail-row">
                  <i className="bi bi-clock"></i>
                  <span>
                    <strong>Last login:</strong> {formatDate(userInfo?.last_login)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={activeModule === 'info' ? 'col-lg-5' : 'col-lg-9'}>
          {/* Info Module */}
          {activeModule === 'info' && (
            <div className={`settings-forms-card ${theme}`}>
              <div className="settings-tabs">
                <button 
                  className={`tab-button ${activeTab === 'profile' ? 'active' : ''} ${theme}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <i className="bi bi-person me-2"></i>
                  Profile Information
                </button>
              </div>

              <div className="tab-content">
                <form onSubmit={handleProfileSubmit}>
                  <h5 className="mb-4">
                    <i className="bi bi-person me-2"></i>
                    Profile Information
                  </h5>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="username" className="form-label">Username</label>
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="email" className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="first_name" className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        id="first_name"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      />
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="last_name" className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        id="last_name"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check me-2"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Security Module */}
          {activeModule === 'security' && (
            <div className={`settings-forms-card ${theme}`}>
              <div className="settings-tabs">
                <button 
                  className={`tab-button active ${theme}`}
                >
                  <i className="bi bi-shield-lock me-2"></i>
                  Change Password
                </button>
              </div>

              <div className="tab-content">
                <form onSubmit={handlePasswordSubmit}>
                  <h5 className="mb-4">
                    <i className="bi bi-shield-lock me-2"></i>
                    Change Password
                  </h5>
                  
                  <div className="mb-3">
                    <label htmlFor="current_password" className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="current_password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="new_password" className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="new_password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="confirm_password" className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirm_password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-warning"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Changing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-check me-2"></i>
                        Change Password
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Preferences Module */}
          {activeModule === 'preferences' && (
            <div className={`settings-forms-card ${theme}`}>
              <div className="settings-tabs">
                <button 
                  className={`tab-button active ${theme}`}
                >
                  <i className="bi bi-gear me-2"></i>
                  Preferences
                </button>
              </div>

              <div className="tab-content">
                <form onSubmit={handlePreferencesSubmit}>
                  <h5 className="mb-4">
                    <i className="bi bi-gear me-2"></i>
                    Application Preferences
                  </h5>
                  
                  {/* Theme Settings */}
                  <div className="preference-section">
                    <h6 className="preference-section-title">
                      <i className="bi bi-palette me-2"></i>
                      Appearance
                    </h6>
                    <div className="mb-4">
                      <label className="form-label">Theme</label>
                      <div className="theme-options">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="theme"
                            id="theme-light"
                            value="light"
                            checked={preferences.theme === 'light'}
                            onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="theme-light">
                            <i className="bi bi-sun me-2"></i>
                            Light Mode
                          </label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="theme"
                            id="theme-dark"
                            value="dark"
                            checked={preferences.theme === 'dark'}
                            onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="theme-dark">
                            <i className="bi bi-moon me-2"></i>
                            Dark Mode
                          </label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="theme"
                            id="theme-system"
                            value="system"
                            checked={preferences.theme === 'system'}
                            onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="theme-system">
                            <i className="bi bi-display me-2"></i>
                            System Theme
                            <div className="theme-system-info">
                              Currently: {getSystemTheme() === 'dark' ? 'Dark' : 'Light'}
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="preference-section">
                    <h6 className="preference-section-title">
                      <i className="bi bi-bell me-2"></i>
                      Notifications
                    </h6>
                    
                    <div className="mb-3">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="notifications"
                          checked={preferences.notifications}
                          onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="notifications">
                          <strong>Enable Notifications</strong>
                          <div className="preference-description">
                            Receive general notifications from the application
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Test Notifications Section */}
                    {preferences.notifications && (
                      <div className="mt-4 p-3 border rounded">
                        <h6 className="mb-3">
                          <i className="bi bi-gear-fill me-2"></i>
                          Test Notifications
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              showSuccess('Profile updated successfully!', 4000, true);
                              addNotification('Your profile changes have been saved successfully.', 'success', 'Profile Updated');
                            }}
                          >
                            <i className="bi bi-check-circle me-1"></i>
                            Test Success
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              showError('Failed to connect to server!', 6000, true);
                              addNotification('Unable to establish connection with the server. Please check your internet connection.', 'error', 'Connection Error');
                            }}
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            Test Error
                          </button>
                          <button
                            type="button"
                            className="btn btn-warning btn-sm"
                            onClick={() => {
                              showWarning('Session will expire soon!', 5000, true);
                              addNotification('Your current session will expire in 5 minutes. Please save your work.', 'warning', 'Session Warning');
                            }}
                          >
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            Test Warning
                          </button>
                          <button
                            type="button"
                            className="btn btn-info btn-sm"
                            onClick={() => {
                              showInfo('New feature available!', 4000, true);
                              addNotification('A new notification system has been added to enhance your experience.', 'info', 'New Feature');
                            }}
                          >
                            <i className="bi bi-info-circle me-1"></i>
                            Test Info
                          </button>
                        </div>
                        <small className="text-muted d-block mt-2">
                          <i className="bi bi-lightbulb me-1"></i>
                          These buttons will create test notifications to demonstrate the notification system.
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Notification Test Section */}
                  {preferences.notifications && (
                    <div className="preference-section">
                      <h6 className="preference-section-title">
                        <i className="bi bi-bell-fill me-2"></i>
                        Test Notifications
                      </h6>
                      <div className="notification-test-buttons d-flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => showSuccess('This is a test success notification!')}
                        >
                          <i className="bi bi-check-circle me-1"></i>
                          Test Success
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => showError('This is a test error notification!')}
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Test Error
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => showWarning('This is a test warning notification!')}
                        >
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          Test Warning
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info"
                          onClick={() => showInfo('This is a test info notification!')}
                        >
                          <i className="bi bi-info-circle me-1"></i>
                          Test Info
                        </button>
                      </div>
                      <small className="text-muted mt-2 d-block">
                        These buttons will create both toast notifications and stored notifications that appear in the notification bell.
                      </small>
                    </div>
                  )}

                  <div className="preferences-actions">
                    <div className="auto-save-notice">
                      <i className="bi bi-check-circle me-2"></i>
                      <small className="text-muted">Preferences are saved automatically</small>
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-outline-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Syncing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cloud-upload me-2"></i>
                          Sync with Server
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
