import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import "./Dashboard.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

const COLORS = ['#4f46e5', '#f59e0b']; // In Stock (Blue), Low Stock (Amber)

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const json = await response.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll every 15 seconds for real-time updates
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading Live Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return <div className="dashboard-wrapper">Error loading dashboard: {error}</div>;
  }

  const pieData = [
    { name: 'In Stock Value', value: stats.inStockValue || 0 },
    { name: 'Low Stock Value', value: stats.lowStockValue || 0 }
  ];

  // Calculate max issued for progress bar scaling
  const maxIssued = stats.topProducts.length > 0 
    ? Math.max(...stats.topProducts.map(p => p.value)) 
    : 1;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <div className="dashboard-cards">
          <div className="card">
            <div className="card-icon total-items">📦</div>
            <div className="card-content">
              <h3>Total Items</h3>
              <p>{stats.totalItems}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon low-stock">⚠️</div>
            <div className="card-content">
              <h3>Low Stock</h3>
              <p>{stats.lowStock}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon out-of-stock">📋</div>
            <div className="card-content">
              <h3>Out of Stock</h3>
              <p>{stats.outOfStock}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon purchase-order">🛒</div>
            <div className="card-content">
              <h3>Pending POs</h3>
              <p>{stats.purchaseOrders}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon request-orders">📨</div>
            <div className="card-content">
              <h3>Pending Requests</h3>
              <p>{stats.requestOrders}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="chart-section">
            <h3>Inventory Values</h3>
            <div className="chart-container">
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="total-value-center">
                  <div className="value">{formatCurrency(stats.inventoryValue)}</div>
                  <div className="label">Total Value</div>
                </div>
              </div>
            </div>
          </div>

          <div className="list-section">
            <div className="list-header">
              <h3>Top 10 High Demand Products</h3>
            </div>
            <ul className="product-list">
              {stats.topProducts.map((product, i) => (
                <li key={i} className="product-item">
                  <div className="product-item-info">
                    <span>{product.name}</span>
                    <span>{product.value} Units</span>
                  </div>
                  <div className="product-bar-bg">
                    <div 
                      className="product-bar-fill" 
                      style={{ width: `${(product.value / maxIssued) * 100}%` }}
                    ></div>
                  </div>
                </li>
              ))}
              {stats.topProducts.length === 0 && (
                <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '40px' }}>No issue data available yet</div>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
