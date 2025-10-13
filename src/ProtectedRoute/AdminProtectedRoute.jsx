import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { isAuthenticated, getToken } from '../auth';

const AdminProtectedRoute = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasAdminAccess, setHasAdminAccess] = useState(false);

    useEffect(() => {
        const checkAdminAccess = async () => {
            if (!isAuthenticated()) {
                setIsLoading(false);
                return;
            }

            try {
                const token = getToken();
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/users/info/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const userData = await response.json();
                    // Store user info in localStorage for other components
                    localStorage.setItem('userInfo', JSON.stringify(userData));
                    
                    // Check if user has admin privileges (staff or superuser)
                    const isAdmin = userData.is_staff || userData.is_superuser;
                    setHasAdminAccess(isAdmin);
                } else {
                    setHasAdminAccess(false);
                }
            } catch (error) {
                console.error('Error checking admin access:', error);
                setHasAdminAccess(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAdminAccess();
    }, []);

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated()) {
        return <Navigate to="/" />;
    }

    if (!hasAdminAccess) {
        // Redirect to events page if not admin
        return <Navigate to="/events" />;
    }

    return <Outlet />;
};

export default AdminProtectedRoute;
