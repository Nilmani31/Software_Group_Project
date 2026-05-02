import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Send login request to backend
      const response = await fetch('http://localhost:5005/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store login status and user data in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('userId', data.user.userId);
        localStorage.setItem('roleId', data.user.roleId);
        localStorage.setItem('branchId', data.user.branchId);
        localStorage.setItem('email', data.user.email);
        localStorage.setItem('allowedBranches', JSON.stringify(data.user.allowedBranches || []));

        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">

        <div className="logo-section">
          <div className="logo-circle">
            <div className="logo-placeholder">

              <img src="/logo.jpg" alt="CBBS Logo" className='logo-placeholder' />

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

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
