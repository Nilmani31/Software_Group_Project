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

  // Get allowed roles for this page
  const allowedRoles = pagePermissions[path] || [];

  // If user role is not in allowed roles, redirect to dashboard
  if (!allowedRoles.includes(roleId)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
