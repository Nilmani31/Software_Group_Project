import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple authentication - you can replace with your actual credentials
    if (username === 'admin' && password === 'admin123') {
      // Store login status in localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);
      
      // Navigate to dashboard
      navigate('/dashboard');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="logo-section">
          <div className="logo-circle">
            <div className="logo-placeholder">
              
              <img src="/logo.jpg" alt="CBBS Logo" className='logo-placeholder'/>
              
            </div>
          </div>
        </div>
        
       
        <div className="form-section">
          <h1 className="system-title">CBBS Inventory System</h1>
          <h2 className="school-name">Colombo Bartender & Barista School</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="login-button">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;