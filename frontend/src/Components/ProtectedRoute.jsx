import React from 'react';
import { Navigate } from 'react-router-dom';
import { PAGE_PERMISSIONS } from '../utils/rolePermissions';

export default function ProtectedRoute({ children, path }) {
  const roleId = localStorage.getItem('roleId');
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const accessToken = localStorage.getItem('accessToken');

  let tokenIsValid = false;
  if (accessToken) {
    try {
      const payload = JSON.parse(window.atob(accessToken.split('.')[1]));
      tokenIsValid = typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      tokenIsValid = false;
    }
  }

  // Do not render protected pages for missing, malformed, or expired sessions.
  if (isLoggedIn !== 'true' || !tokenIsValid) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isLoggedIn');
    return <Navigate to="/login" replace />;
  }

  // Extract the role name (e.g., 'ROLE_ADMIN' -> 'ADMIN')
  let userPermissions = [];
  try {
    userPermissions = JSON.parse(localStorage.getItem('permissions') || '[]');
  } catch {
    userPermissions = [];
  }

  const requiredPermission = PAGE_PERMISSIONS[path];
  const hasAccess = !requiredPermission ||
    userPermissions.includes('ALL') ||
    userPermissions.includes(requiredPermission);

  if (!hasAccess) {
    // Prevent infinite redirect loop if they don't even have dashboard access
    if (path === '/dashboard') {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
