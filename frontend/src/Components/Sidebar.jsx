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
import "./Sidebar.css";

const Sidebar = () => {
  const [hovered, setHovered] = useState(false);

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
    // If no permission array defined, default to show. Otherwise, check role.
    const allowedRoles = pagePermissions[item.to];
    return !allowedRoles || allowedRoles.includes(userRole);
  });

  return (
    <div
      className={`sidebar ${!hovered ? "collapsed" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo */}
      <div className="sidebar-header">
        <div className={`sidebar-logo ${!hovered ? "collapsed-logo" : ""}`}>
          <img src="/logo.jpg" alt="CBBS Logo" className="logo-image" />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {filteredNavItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-item">
            {item.icon}
            <span className="nav-item-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
