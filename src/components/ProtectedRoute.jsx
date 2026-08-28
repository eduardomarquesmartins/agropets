import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const getDefaultPathForUser = (user) => {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'vet') return '/vet';
  return '/';
};

const buildRedirectPath = (location) => `${location.pathname}${location.search}${location.hash}`;

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isReady } = useAuthStore();
  const location = useLocation();

  if (!isReady) return null;

  if (!user) {
    const redirect = encodeURIComponent(buildRedirectPath(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultPathForUser(user)} replace />;
  }

  return children;
};

export default ProtectedRoute;
