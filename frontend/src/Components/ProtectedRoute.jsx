import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasPermission, getUserPermissions } from '../utils/permissionUtils';

// Route path to required permission mapping
const ROUTE_PERMISSION_MAP = {
  '/dashboard': 'DASHBOARD',
  '/inventory': 'INVENTORY',
  '/purchase-order': 'PURCHASE_ORDERS',
  '/good-received': 'GOODS_RECEIVED',
  '/issue-note': 'ISSUE_NOTES',
  '/low-stock': 'LOW_STOCK',
  '/lowstock': 'LOW_STOCK',
  '/branches': 'BRANCHES',
  '/categories': 'CATEGORIES',
  '/units': 'CATEGORIES',
  '/users': 'USERS',
  '/report': 'REPORTS',
  '/reports': 'REPORTS'
};

export default function ProtectedRoute({ children, path }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const userPerms = getUserPermissions();

  // 'ALL' permission grants master access
  if (userPerms.includes('ALL')) {
    return children;
  }

  const requiredPerm = ROUTE_PERMISSION_MAP[path];

  let isAllowed = false;
  if (!requiredPerm) {
    isAllowed = true;
  } else if (requiredPerm === 'LOW_STOCK') {
    isAllowed = hasPermission('LOW_STOCK') || hasPermission('INVENTORY');
  } else if (requiredPerm === 'DASHBOARD') {
    isAllowed = hasPermission('DASHBOARD') || userPerms.length > 0;
  } else {
    isAllowed = hasPermission(requiredPerm);
  }

  if (!isAllowed) {
    // If user lacks dashboard permission, redirect to login, else redirect to dashboard
    if (path === '/dashboard') {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
