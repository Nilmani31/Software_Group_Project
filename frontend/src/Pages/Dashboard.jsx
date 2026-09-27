import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Package, AlertTriangle, AlertOctagon, ShoppingCart, Inbox, TrendingUp, Layers, ArrowUpRight } from "lucide-react";
import { getAuthHeaders } from "../utils/authHeaders";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

const COLORS = ['#4f46e5', '#f59e0b']; // In Stock (Indigo), Low Stock (Amber)

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers: getAuthHeaders()
      });
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
    const interval = setInterval(fetchStats, 15005);
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
    return <div className="dashboard-wrapper"><div className="dashboard-error-banner">Error loading dashboard: {error}</div></div>;
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
        <div className="dashboard-header-strip">
          <div>
            <h2 className="dashboard-welcome-heading">Inventory Overview</h2>
            <p className="dashboard-welcome-sub">Real-time status across stock items, pending orders, and demand.</p>
          </div>
          <div className="dashboard-live-pill">
            <span className="live-dot-pulse"></span>
            <span>Live Sync Active</span>
          </div>
        </div>

        <div className="dashboard-cards">
          <div className="card dashboard-kpi-card card-total-items">
            <div className="card-icon total-items">
              <Package size={22} />
            </div>
            <div className="card-content">
              <h3>Total Items</h3>
              <p className="kpi-value">{stats.totalItems}</p>
              <span className="kpi-meta">Catalog items</span>
            </div>
          </div>

          <div className="card dashboard-kpi-card card-low-stock">
            <div className="card-icon low-stock">
              <AlertTriangle size={22} />
            </div>
            <div className="card-content">
              <h3>Low Stock</h3>
              <p className="kpi-value warning">{stats.lowStock}</p>
              <span className="kpi-meta text-amber-600">Requires attention</span>
            </div>
          </div>

          <div className="card dashboard-kpi-card card-out-stock">
            <div className="card-icon out-of-stock">
              <AlertOctagon size={22} />
            </div>
            <div className="card-content">
              <h3>Out of Stock</h3>
              <p className="kpi-value danger">{stats.outOfStock}</p>
              <span className="kpi-meta text-rose-600">Depleted items</span>
            </div>
          </div>

          <div className="card dashboard-kpi-card card-po">
            <div className="card-icon purchase-order">
              <ShoppingCart size={22} />
            </div>
            <div className="card-content">
              <h3>Pending POs</h3>
              <p className="kpi-value info">{stats.purchaseOrders}</p>
              <span className="kpi-meta text-emerald-600">Active purchases</span>
            </div>
          </div>

          <div className="card dashboard-kpi-card card-requests">
            <div className="card-icon request-orders">
              <Inbox size={22} />
            </div>
            <div className="card-content">
              <h3>Pending Requests</h3>
              <p className="kpi-value purple">{stats.requestOrders}</p>
              <span className="kpi-meta text-purple-600">Branch requisitions</span>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="chart-section">
            <div className="section-title-wrap">
              <div className="section-title-icon"><Layers size={18} /></div>
              <h3>Inventory Valuation Breakdown</h3>
            </div>
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
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', background: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="total-value-center">
                  <div className="value">{formatCurrency(stats.inventoryValue)}</div>
                  <div className="label">Total Stock Value</div>
                </div>
              </div>

              <div className="chart-legend-custom">
                <div className="legend-item">
                  <span className="legend-dot in-stock"></span>
                  <span className="legend-label">In Stock Value</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot low-stock"></span>
                  <span className="legend-label">Low Stock Value</span>
                </div>
              </div>
            </div>
          </div>

          <div className="list-section">
            <div className="list-header">
              <div className="section-title-wrap">
                <div className="section-title-icon"><TrendingUp size={18} /></div>
                <h3>Top High Demand Products</h3>
              </div>
            </div>
            <ul className="product-list">
              {stats.topProducts.map((product, i) => (
                <li key={i} className="product-item">
                  <div className="product-rank">#{i + 1}</div>
                  <div className="product-details-wrap">
                    <div className="product-item-info">
                      <span className="product-name">{product.name}</span>
                      <span className="product-units">{product.value} Units Issued</span>
                    </div>
                    <div className="product-bar-bg">
                      <div
                        className="product-bar-fill"
                        style={{ width: `${(product.value / maxIssued) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </li>
              ))}
              {stats.topProducts.length === 0 && (
                <div className="empty-demand-state">No product issue data recorded yet</div>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
