import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { isAuthenticated } from '../auth';

const ProtectedRoute = () => {
    return isAuthenticated() ? <Outlet /> : <Navigate to="/" />;
};

export default ProtectedRoute;
