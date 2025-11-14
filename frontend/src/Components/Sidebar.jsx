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
        {[
          { to: "/dashboard", icon: <FaTachometerAlt />, label: "Dashboard" },
          { to: "/inventory", icon: <FaBoxes />, label: "Inventory" },
          { to: "/purchase-order", icon: <FaShoppingCart />, label: "Purchase Order" },
          { to: "/good-received", icon: <FaClipboardList />, label: "Good Received" },
          { to: "/issue-note", icon: <FaClipboardList />, label: "Issue Note" },
          { to: "/low-stock", icon: <FaExclamationTriangle />, label: "Low Stock" },
          { to: "/branches", icon: <FaBuilding />, label: "Branches" },
          { to: "/categories", icon: <FaListAlt />, label: "Categories" },
          { to: "/users", icon: <FaUsers />, label: "Users" },
          { to: "/reports", icon: <FaChartBar />, label: "Reports" },
        ].map((item) => (
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
