import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [username, setUsername] = useState("");
  const popupRef = useRef(null);

  // Function to get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/inventory':
        return 'Inventory';
      case '/purchase-order':
        return 'Purchase Order';
      case '/good-received':
        return 'Good Received';
      case '/issue-note':
        return 'Issue Note';
      case '/low-stock':
        return 'Low Stock';
      case '/branches':
        return 'Branches';
      case '/categories':
        return 'Categories';
      case '/users':
        return 'Users';
      case '/reports':
        return 'Reports';
      default:
        return 'Dashboard';
    }
  };

  // Function to determine if we should show "Welcome" text
  const shouldShowWelcome = () => {
    return location.pathname === '/dashboard';
  };

  useEffect(() => {
    // Get username from localStorage
    const storedUsername = localStorage.getItem('username') || 'admin';
    setUsername(storedUsername);
  }, []);

  useEffect(() => {
    // Close popup when clicking outside
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowUserPopup(false);
      }
    };

    if (showUserPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserPopup]);

  const handleLogout = () => {
    // Clear login data from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    // Navigate to login page
    navigate('/');
  };

  const toggleUserPopup = () => {
    setShowUserPopup(!showUserPopup);
  };

  return (
    <div className="navbar">
      <span className="navbar-title">{getPageTitle()}</span>
      <div className="user-section">
        <span className="welcome-text">
          {shouldShowWelcome() ? `Welcome ${username}` : username}
        </span>
        <div className="user-popup-container" ref={popupRef}>
          <button className="user-icon" onClick={toggleUserPopup}>👤</button>
          {showUserPopup && (
            <div className="user-popup">
              <div className="popup-header">
                <h4>User Information</h4>
                <button 
                  className="close-popup" 
                  onClick={() => setShowUserPopup(false)}
                >
                  ×
                </button>
              </div>
              <div className="popup-content">
                <div className="user-info">
                  <div className="info-item">
                    <label>Username:</label>
                    <span>{username}</span>
                  </div>
                  <div className="info-item">
                    <label>Password:</label>
                    <span>admin123</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <button className="logout-icon" onClick={handleLogout}>⎋</button>
      </div>
    </div>
  );
};

export default Navbar;
