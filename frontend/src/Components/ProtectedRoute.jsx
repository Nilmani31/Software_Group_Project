import React from 'react';
import { Navigate } from 'react-router-dom';

// Define which roles can access which pages
const pagePermissions = {
  '/users': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'],
  '/categories': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'],
  '/branches': ['ADMIN', 'DIRECTOR', 'MANAGER'],
  '/dashboard': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
  '/inventory': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
  '/good-received': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
  '/purchase-order': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'],
  '/issue-note': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'],
  '/low-stock': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
  '/report': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER']
};

export default function ProtectedRoute({ children, path }) {
  const roleId = localStorage.getItem('roleId');
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Extract the role name (e.g., 'ROLE_ADMIN' -> 'ADMIN')
  const userRole = roleId ? roleId.replace('ROLE_', '') : '';

  // Get allowed roles for this page
  const allowedRoles = pagePermissions[path] || [];

  // If user role is not in allowed roles, redirect
  if (!allowedRoles.includes(userRole)) {
    // Prevent infinite redirect loop if they don't even have dashboard access
    if (path === '/dashboard') {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
