import React from "react";
import "./Navbar.css";
import { Bell, User } from "lucide-react"; 

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="navbar-left">
        <h2 className="navbar-title">Dashboard</h2>
      </div>

      <div className="navbar-center">
        <input
          type="text"
          placeholder="Search..."
          className="navbar-search"
        />
      </div>

      <div className="navbar-right">
        <Bell className="navbar-icon" />
        <User className="navbar-icon" />
      </div>
    </div>
  );
};

export default Navbar;
