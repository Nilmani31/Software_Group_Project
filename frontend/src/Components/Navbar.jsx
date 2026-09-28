import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, LogOut, X, Shield, Building, ChevronDown } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userBranch, setUserBranch] = useState("");
  const popupRef = useRef(null);

  // Function to get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/inventory':
        return 'Inventory Management';
      case '/purchase-order':
        return 'Purchase Orders';
      case '/good-received':
        return 'Goods Received Notes';
      case '/issue-note':
        return 'Issue Notes & Requests';
      case '/lowstock':
        return 'Low Stock Alerts';
      case '/branches':
        return 'Branch Locations';
      case '/categories':
        return 'Categories & Roles';
      case '/users':
        return 'User Management';
      case '/reports':
        return 'Analytics & Reports';
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
    const roleId = localStorage.getItem('roleId') || '';
    const cleanRole = roleId ? roleId.replace('ROLE_', '') : 'STAFF';
    const storedBranchName = localStorage.getItem('branchName') || (cleanRole === 'ADMIN' || cleanRole === 'DIRECTOR' ? 'All Branches' : 'Main Branch');
    setUsername(storedUsername);
    setUserRole(cleanRole);
    setUserBranch(storedBranchName);
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

  const userInitial = username ? username.charAt(0).toUpperCase() : 'U';

  return (
    <header className="navbar" role="banner">
      <div className="navbar-left">
        <div className="navbar-context">
          <span className="navbar-breadcrumb">CBBS Portal</span>
          <span className="navbar-breadcrumb-separator">/</span>
          <h1 className="navbar-title">{getPageTitle()}</h1>
        </div>
      </div>

      <div className="user-section">
        <div className="user-status-pill" title={`Active Branch: ${userBranch}`}>
          <span className="status-indicator-dot"></span>
          <Building size={13} style={{ marginRight: 5, opacity: 0.7 }} />
          <span className="status-indicator-text">{userBranch}</span>
        </div>

        <div className="user-popup-container" ref={popupRef}>
          <button 
            className="user-profile-btn" 
            onClick={toggleUserPopup}
            aria-expanded={showUserPopup}
            aria-label="User menu"
            type="button"
          >
            <div className="user-avatar-circle">
              <span>{userInitial}</span>
            </div>
            <div className="user-profile-details">
              <span className="user-display-name">
                {shouldShowWelcome() ? `Welcome, ${username}` : username}
              </span>
              <span className="user-role-badge">{userRole}</span>
            </div>
            <ChevronDown size={14} className={`dropdown-chevron ${showUserPopup ? 'rotated' : ''}`} />
          </button>

          {showUserPopup && (
            <div className="user-popup" role="dialog" aria-label="User account menu">
              <div className="popup-header">
                <div className="popup-header-user">
                  <div className="popup-avatar">{userInitial}</div>
                  <div>
                    <h4>{username}</h4>
                    <span className="popup-role-pill">{userRole}</span>
                  </div>
                </div>
                <button 
                  className="close-popup" 
                  onClick={() => setShowUserPopup(false)}
                  aria-label="Close menu"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="popup-content">
                <div className="user-info">
                  <div className="info-item">
                    <span className="info-icon-wrap"><User size={14} /></span>
                    <div className="info-text-group">
                      <label>Username</label>
                      <span>{username}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="info-icon-wrap"><Shield size={14} /></span>
                    <div className="info-text-group">
                      <label>Permission Level</label>
                      <span>{userRole}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="info-icon-wrap"><Building size={14} /></span>
                    <div className="info-text-group">
                      <label>Assigned Branch</label>
                      <span>{userBranch}</span>
                    </div>
                  </div>
                </div>

                <div className="popup-actions">
                  <button 
                    className="popup-logout-btn" 
                    onClick={handleLogout}
                    type="button"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          className="logout-icon" 
          onClick={handleLogout} 
          title="Sign out of system"
          aria-label="Sign out"
          type="button"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;