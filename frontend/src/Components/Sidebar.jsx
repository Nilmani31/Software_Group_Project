import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBoxes,
  FaShoppingCart,
  FaClipboardList,
  FaExclamationTriangle,
  FaBuilding,
  FaListAlt,
  FaUsers,
  FaChartBar
} from "react-icons/fa";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('cbbs_sidebar_collapsed') === 'true';
  });
  const [hovered, setHovered] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('cbbs_sidebar_collapsed', String(next));
      return next;
    });
  };

  const roleId = localStorage.getItem('roleId');
  const userRole = roleId ? roleId.replace('ROLE_', '') : '';

  const pagePermissions = {
    '/users': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'],
    '/categories': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'],
    '/branches': ['ADMIN', 'DIRECTOR', 'MANAGER'],
    '/dashboard': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
    '/inventory': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
    '/good-received': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
    '/purchase-order': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
    '/issue-note': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'],
    '/lowstock': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER', 'STAFF'],
    '/reports': ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER']
  };

  const navItems = [
    { to: "/dashboard", icon: <FaTachometerAlt />, label: "Dashboard" },
    { to: "/inventory", icon: <FaBoxes />, label: "Inventory" },
    { to: "/purchase-order", icon: <FaShoppingCart />, label: "Purchase Order" },
    { to: "/good-received", icon: <FaClipboardList />, label: "Good Received" },
    { to: "/issue-note", icon: <FaClipboardList />, label: "Issue Note" },
    { to: "/lowstock", icon: <FaExclamationTriangle />, label: "Low Stock" },
    { to: "/branches", icon: <FaBuilding />, label: "Branches" },
    { to: "/categories", icon: <FaListAlt />, label: "Categories" },
    { to: "/users", icon: <FaUsers />, label: "Users" },
    { to: "/reports", icon: <FaChartBar />, label: "Reports" }
  ];

  // Filter items based on permissions
  const filteredNavItems = navItems.filter(item => {
    const allowedRoles = pagePermissions[item.to];
    return !allowedRoles || allowedRoles.includes(userRole);
  });

  const effectiveCollapsed = isCollapsed && !hovered;

  return (
    <aside
      className={`sidebar ${effectiveCollapsed ? "collapsed" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-header">
        <div
          className={`sidebar-logo ${effectiveCollapsed ? "collapsed-logo" : ""}`}
          onClick={effectiveCollapsed ? toggleCollapse : undefined}
          style={{ cursor: effectiveCollapsed ? 'pointer' : 'default' }}
          title={effectiveCollapsed ? "Click to expand navigation" : undefined}
          role={effectiveCollapsed ? "button" : undefined}
          tabIndex={effectiveCollapsed ? 0 : undefined}
        >
          <img src="/logo.jpg" alt="CBBS Logo" className="logo-image" />
        </div>
        {!effectiveCollapsed && (
          <div className="sidebar-brand-info">
            <span className="sidebar-brand-title">CBBS</span>
            <span className="sidebar-brand-subtitle">Inventory System</span>
          </div>
        )}
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={toggleCollapse}
          title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {effectiveCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav" role="navigation">
        <div className="sidebar-nav-group-label">
          {!effectiveCollapsed ? "Main Navigation" : "•••"}
        </div>
        {filteredNavItems.map((item) => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            title={effectiveCollapsed ? item.label : undefined}
          >
            <span className="nav-item-icon-wrap">{item.icon}</span>
            <span className="nav-item-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Role Tag at bottom */}
      {!effectiveCollapsed && userRole && (
        <div className="sidebar-bottom-info">
          <div className="sidebar-role-indicator">
            <span className="role-dot"></span>
            <span className="role-text">Role: {userRole}</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
