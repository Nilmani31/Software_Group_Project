import React from "react";
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
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo"></div>
        <h2>Dashboard</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className="nav-item">
          <FaTachometerAlt /> Dashboard
        </NavLink>
        <NavLink to="/inventory" className="nav-item">
          <FaBoxes /> Inventory
        </NavLink>
        <NavLink to="/purchase-order" className="nav-item">
          <FaShoppingCart /> Purchase Order
        </NavLink>
        <NavLink to="/good-received" className="nav-item">
          <FaClipboardList /> Good Received
        </NavLink>
        <NavLink to="/issue-note" className="nav-item">
          <FaClipboardList /> Issue Note
        </NavLink>
        <NavLink to="/low-stock" className="nav-item">
          <FaExclamationTriangle /> Low Stock
        </NavLink>
        <NavLink to="/branches" className="nav-item">
          <FaBuilding /> Branches
        </NavLink>
        <NavLink to="/categories" className="nav-item">
          <FaListAlt /> Categories
        </NavLink>
        <NavLink to="/users" className="nav-item">
          <FaUsers /> Users
        </NavLink>
        <NavLink to="/reports" className="nav-item">
          <FaChartBar /> Reports
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
