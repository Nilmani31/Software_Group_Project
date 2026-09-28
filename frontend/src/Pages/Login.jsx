import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

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
        localStorage.setItem('branchName', data.user.branchName || 'Colombo Main Branch');
        localStorage.setItem('email', data.user.email);
        localStorage.setItem('allowedBranches', JSON.stringify(data.user.allowedBranches || []));
        localStorage.setItem('permissions', JSON.stringify(data.user.permissions || []));

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
              <img src="/logo.jpg" alt="CBBS Logo" className="logo-image-login" />
            </div>
          </div>
          <div className="logo-badge">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Enterprise Secure</span>
          </div>
        </div>

        <div className="form-section">
          <div className="login-header-group">
            <h1 className="system-title">CBBS Inventory System</h1>
            <h2 className="school-name">Colombo Bartender & Barista School</h2>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <AlertCircle size={18} className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              {!loading && <ArrowRight size={16} className="btn-arrow-icon" />}
            </button>
          </form>

          <div className="login-footer">
            <span>CBBS Operations & Inventory Control v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
