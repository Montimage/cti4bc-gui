export const isAuthenticated = () => {
    const token = localStorage.getItem('accessToken'); // or sessionStorage/cookies if used
    return !!token;
};

export const getToken = () => {
    // Try to get token from localStorage first, then sessionStorage
    return localStorage.getItem('accessToken') || 
           sessionStorage.getItem('accessToken') || 
           localStorage.getItem('authToken') || 
           sessionStorage.getItem('authToken');
};

// Every key that can hold session state. Keep in sync with getToken() above.
// 'userInfo' is legacy: nothing writes it any more, but it is cleared here so
// values already sitting in returning users' browsers get removed on logout.
const AUTH_STORAGE_KEYS = ['accessToken', 'refreshToken', 'authToken', 'userInfo'];

// Wipe the session from both storages. Single source of truth for logout.
export const clearAuth = () => {
    AUTH_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
};