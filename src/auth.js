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

// Get user info from localStorage
export const getUserInfo = () => {
    try {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
        console.error('Error parsing user info:', error);
        return null;
    }
};

// Check if user is staff (admin)
export const isUserStaff = () => {
    const userInfo = getUserInfo();
    return userInfo?.is_staff || false;
};

// Check if user is superuser
export const isUserSuperuser = () => {
    const userInfo = getUserInfo();
    return userInfo?.is_superuser || false;
};

// Check if user has admin privileges (staff or superuser)
export const hasAdminPrivileges = () => {
    return isUserStaff() || isUserSuperuser();
};