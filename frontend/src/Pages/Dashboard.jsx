import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ModernDropdown from "../Components/ModernDropdown";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  ShoppingCart,
  Inbox,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Boxes,
  DollarSign,
  Building2,
  RefreshCw,
  PlusCircle,
  FileText,
  Truck,
  CheckCircle2,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Calendar,
  Warehouse,
  PieChart as PieChartIcon
} from "lucide-react";
import { getAuthHeaders } from "../utils/authHeaders";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

const DONUT_PALETTE = ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#14b8a6'];
const CATEGORY_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [donutView, setDonutView] = useState('branch'); // 'branch' | 'category'
  const [activeTab, setActiveTab] = useState('topProducts'); // 'topProducts' | 'recentPOs' | 'recentIssues'

  const fetchStats = async (branchId = selectedBranch, isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const url = branchId && branchId !== 'all'
        ? `${API_BASE_URL}/dashboard/stats?branchId=${branchId}`
        : `${API_BASE_URL}/dashboard/stats`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const json = await response.json();
      if (json.success) {
        setStats(json.data);
        setError(null);
      }
    } catch (err) {
      console.error('Dashboard stats fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  useEffect(() => {
    fetchStats(selectedBranch);
    // Poll every 15 seconds for live real-time updates
    const interval = setInterval(() => {
      fetchStats(selectedBranch);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedBranch]);

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setSelectedBranch(val);
    fetchStats(val, true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading && !stats) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading Inventory Management Overview...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-error-banner">
          <AlertOctagon size={20} />
          <span>Error loading dashboard metrics: {error}</span>
          <button className="dashboard-refresh-btn" onClick={() => fetchStats(selectedBranch, true)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Branch share donut data
  const branchDonutData = (stats?.branchBreakdown || []).map(b => ({
    name: b.code || b.name,
    fullName: b.name,
    value: b.totalValue || 0,
    units: b.totalUnits || 0,
  })).filter(b => b.value > 0);

  // Category share donut data
  const categoryDonutData = (stats?.categoryBreakdown || []).map(c => ({
    name: c.name,
    fullName: c.name,
    value: c.value || 0,
    units: c.units || 0,
  })).filter(c => c.value > 0);

  const isBranchMode = donutView === 'branch' && branchDonutData.length > 1;
  const activeDonutData = isBranchMode ? branchDonutData : categoryDonutData;
  const activeDonutTotal = activeDonutData.reduce((sum, item) => sum + (item.value || 0), 0) || (stats?.inventoryValue || 1);

  // Category data for BarChart
  const categoryBarData = (stats?.categoryBreakdown || []).map(cat => ({
    name: cat.name,
    value: cat.value || 0,
    units: cat.units || 0,
    items: cat.count || 0
  }));

  // Max issued calculation for progress bar
  const maxIssued = (stats?.topProducts && stats.topProducts.length > 0)
    ? Math.max(...stats.topProducts.map(p => p.value || 1))
    : 1;

  // Max branch stock for relative progress bar
  const maxBranchStock = (stats?.branchBreakdown && stats.branchBreakdown.length > 0)
    ? Math.max(...stats.branchBreakdown.map(b => b.totalUnits || 1))
    : 1;

  const totalBranchesCount = stats?.totalBranches || (stats?.branchBreakdown ? stats.branchBreakdown.length : 0);
  const healthyPercent = stats?.totalItems > 0
    ? Math.round(((stats.inStockCount || 0) / stats.totalItems) * 100)
    : 100;

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">

        {/* Header Controls & Quick Navigation Strip */}
        <div className="dashboard-header-strip">
          <div className="dashboard-scope-tag">
            <Building2 size={16} className="text-primary-600" />
            <span>Scope: <strong>{selectedBranch === 'all' ? 'All Branches (Company-wide Overview)' : (stats?.branchesList?.find(b => b._id === selectedBranch)?.branchName || 'Selected Branch')}</strong></span>
          </div>

          <div className="dashboard-header-controls">
            {/* Branch Selector Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Filter dashboard by branch">
              <ModernDropdown
                value={selectedBranch}
                onChange={(val) => {
                  setSelectedBranch(val);
                  fetchStats(val, true);
                }}
                searchable={true}
                placeholder="All Branches (Global Summary)"
                minWidth="230px"
                options={[
                  { value: "all", label: "All Branches (Global Summary)" },
                  ...(stats?.branchesList ? stats.branchesList.map(b => ({
                    value: b._id,
                    label: `${b.branchName} (${b.branchCode})`
                  })) : [])
                ]}
              />
            </div>

            {/* Live Indicator */}
            <div className="dashboard-live-pill" title="Live real-time background sync active">
              <span className="live-dot-pulse"></span>
              <span>Live Sync</span>
            </div>

            {/* Manual Refresh Button */}
            <button
              className={`dashboard-refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={() => fetchStats(selectedBranch, true)}
              title="Refresh statistics now"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 3. Executive KPI Cards (6 Key Operational Metrics - Single Line) */}
        <div className="dashboard-kpi-grid">
          {/* KPI 1: Total Catalog Items */}
          <div className="dashboard-kpi-card card-items">
            <div className="kpi-card-header">
              <div className="kpi-icon-wrap items">
                <Package size={18} />
              </div>
              <span className="kpi-badge badge-info">{stats?.totalCategories || 0} Categories</span>
            </div>
            <div className="kpi-card-body">
              <h3>Catalog Items</h3>
              <div className="kpi-main-value">{stats?.totalItems || 0}</div>
              <div className="kpi-subtext">
                <span>Unique registered SKUs</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Total Physical Stock In Hand */}
          <div className="dashboard-kpi-card card-units">
            <div className="kpi-card-header">
              <div className="kpi-icon-wrap units">
                <Boxes size={18} />
              </div>
              <span className="kpi-badge badge-purple">{totalBranchesCount} Locations</span>
            </div>
            <div className="kpi-card-body">
              <h3>Stock Units</h3>
              <div className="kpi-main-value">
                {(stats?.totalStockUnits || 0).toLocaleString()}
              </div>
              <div className="kpi-subtext">
                <span>Physical units on hand</span>
              </div>
            </div>
          </div>

          {/* KPI 3: Total Inventory Valuation */}
          <div className="dashboard-kpi-card card-value">
            <div className="kpi-card-header">
              <div className="kpi-icon-wrap value">
                <DollarSign size={18} />
              </div>
              <span className="kpi-badge badge-success">Asset Value</span>
            </div>
            <div className="kpi-card-body">
              <h3>Total Valuation</h3>
              <div className="kpi-main-value success">
                {formatCurrency(stats?.inventoryValue)}
              </div>
              <div className="kpi-subtext">
                <span>{formatCurrency(stats?.inStockValue)} active</span>
              </div>
            </div>
          </div>

          {/* KPI 4: Inventory Health Index */}
          <div className="dashboard-kpi-card card-health">
            <div className="kpi-card-header">
              <div className={`kpi-icon-wrap ${stats?.outOfStock > 0 ? 'health-danger' : stats?.lowStock > 0 ? 'health-warning' : 'health-optimal'}`}>
                {stats?.outOfStock > 0 ? <AlertOctagon size={18} /> : <ShieldCheck size={18} />}
              </div>
              <span className={`kpi-badge ${stats?.outOfStock > 0 ? 'badge-danger' : stats?.lowStock > 0 ? 'badge-warning' : 'badge-success'}`}>
                {healthyPercent}% Healthy
              </span>
            </div>
            <div className="kpi-card-body">
              <h3>Stock Health</h3>
              <div className={`kpi-main-value ${(stats?.outOfStock > 0 || stats?.lowStock > 0) ? 'warning' : 'success'}`}>
                {stats?.inStockCount || 0} / {stats?.totalItems || 0}
              </div>
              <div className="kpi-subtext">
                <span className="text-rose-600 font-semibold">{stats?.outOfStock || 0} out</span>
                <span>•</span>
                <span className="text-amber-600 font-semibold">{stats?.lowStock || 0} low</span>
              </div>
            </div>
          </div>

          {/* KPI 5: Pending Purchase Orders */}
          <div className="dashboard-kpi-card card-po">
            <div className="kpi-card-header">
              <div className="kpi-icon-wrap po">
                <ShoppingCart size={18} />
              </div>
              <span className="kpi-badge badge-info">Procurement</span>
            </div>
            <div className="kpi-card-body">
              <h3>Pending POs</h3>
              <div className="kpi-main-value">
                {stats?.purchaseOrders || 0}
              </div>
              <div className="kpi-subtext">
                <span>{stats?.totalPurchaseOrders || 0} total orders</span>
              </div>
            </div>
          </div>

          {/* KPI 6: Pending Requisitions / Issue Notes */}
          <div className="dashboard-kpi-card card-issues">
            <div className="kpi-card-header">
              <div className="kpi-icon-wrap issues">
                <Inbox size={18} />
              </div>
              <span className="kpi-badge badge-purple">Dispatches</span>
            </div>
            <div className="kpi-card-body">
              <h3>Pending Requests</h3>
              <div className="kpi-main-value">
                {stats?.requestOrders || 0}
              </div>
              <div className="kpi-subtext">
                <span>{stats?.totalIssueNotes || 0} total dispatches</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Analytical Charts Section */}
        <div className="dashboard-analytics-grid">
          {/* Chart 1: Category Stock Valuation & Breakdown */}
          <div className="dashboard-panel">
            <div className="panel-header-row">
              <div className="panel-title-wrap">
                <div className="panel-icon-box">
                  <Layers size={18} />
                </div>
                <div className="panel-title-text">
                  <h3>Stock Valuation by Category</h3>
                  <p>Inventory monetary value and unit distribution across product categories</p>
                </div>
              </div>
              <Link to="/categories" className="panel-link-btn">
                <span>Manage Categories</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryBarData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `Rs.${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value, name, item) => [
                      formatCurrency(value),
                      `Valuation (${item.payload.units} units)`
                    ]}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      background: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {categoryBarData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Inventory Asset Allocation Donut */}
          <div className="dashboard-panel">
            <div className="panel-header-row">
              <div className="panel-title-wrap">
                <div className="panel-icon-box">
                  <PieChartIcon size={18} />
                </div>
                <div className="panel-title-text">
                  <h3>Asset Valuation Allocation</h3>
                  <p>Value distribution across {isBranchMode ? 'branch locations' : 'categories'}</p>
                </div>
              </div>

              {/* View Toggle */}
              {branchDonutData.length > 1 && (
                <div className="donut-toggle-group">
                  <button
                    className={`donut-toggle-btn ${donutView === 'branch' ? 'active' : ''}`}
                    onClick={() => setDonutView('branch')}
                  >
                    Branches
                  </button>
                  <button
                    className={`donut-toggle-btn ${donutView === 'category' ? 'active' : ''}`}
                    onClick={() => setDonutView('category')}
                  >
                    Categories
                  </button>
                </div>
              )}
            </div>

            <div className="chart-container">
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={102}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {activeDonutData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={DONUT_PALETTE[index % DONUT_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, item) => [
                        formatCurrency(value),
                        `${item.payload.fullName} (${(item.payload.units || 0).toLocaleString()} units)`
                      ]}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                        background: '#fff',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="total-value-center">
                  <div className="value">{formatCurrency(stats?.inventoryValue)}</div>
                  <div className="label">Total Stock Value</div>
                </div>
              </div>

              <div className="chart-legend-grid">
                {activeDonutData.map((entry, index) => {
                  const pct = Math.round((entry.value / activeDonutTotal) * 100);
                  return (
                    <div
                      key={index}
                      className="legend-badge"
                      title={`${entry.fullName}: ${formatCurrency(entry.value)}`}
                    >
                      <span
                        className="legend-dot"
                        style={{ background: DONUT_PALETTE[index % DONUT_PALETTE.length] }}
                      ></span>
                      <span>{entry.name}</span>
                      <span className="legend-badge-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Branch Network Inventory Distribution */}
        <div className="dashboard-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <div className="panel-icon-box">
                <Building2 size={18} />
              </div>
              <div className="panel-title-text">
                <h3>Branch Network Inventory Distribution</h3>
                <p>Stock quantities, valuation, and health status across all active company branches</p>
              </div>
            </div>
            <Link to="/branches" className="panel-link-btn">
              <span>View All Branches</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="branch-grid-container">
            {stats?.branchBreakdown && stats.branchBreakdown.map((branch) => {
              const isSelected = String(selectedBranch) === String(branch.branchId);
              const branchShare = stats.totalStockUnits > 0
                ? Math.round((branch.totalUnits / stats.totalStockUnits) * 100)
                : 0;

              return (
                <div
                  key={branch.branchId}
                  className={`branch-summary-card ${isSelected ? 'active-selected' : ''}`}
                  onClick={() => {
                    const newId = isSelected ? 'all' : branch.branchId;
                    setSelectedBranch(newId);
                    fetchStats(newId, true);
                  }}
                  title={`Click to filter dashboard by ${branch.name}`}
                >
                  <div className="branch-card-top">
                    <div className="branch-name-wrap">
                      <span className="branch-code-badge">{branch.code}</span>
                      <span className="branch-card-title">{branch.name}</span>
                    </div>
                    {branch.lowStockCount > 0 ? (
                      <span className="kpi-badge badge-warning" title={`${branch.lowStockCount} items below threshold`}>
                        {branch.lowStockCount} alerts
                      </span>
                    ) : (
                      <span className="kpi-badge badge-success">Healthy</span>
                    )}
                  </div>

                  <div className="branch-stat-row">
                    <div>
                      <div className="branch-stat-val">{(branch.totalUnits || 0).toLocaleString()}</div>
                      <div className="branch-stat-label">Units in store</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="branch-stat-val text-emerald-600">{formatCurrency(branch.totalValue)}</div>
                      <div className="branch-stat-label">{branchShare}% of total stock</div>
                    </div>
                  </div>

                  <div className="branch-bar-wrap">
                    <div
                      className="branch-bar-fill"
                      style={{ width: `${(branch.totalUnits / maxBranchStock) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Operations Bottom Grid: Critical Alerts & Activity/Demand */}
        <div className="dashboard-bottom-grid">
          {/* Column A: Critical Stock Watchlist & Replenishment Alerts */}
          <div className="dashboard-panel">
            <div className="panel-header-row">
              <div className="panel-title-wrap">
                <div className="panel-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
                  <AlertTriangle size={18} />
                </div>
                <div className="panel-title-text">
                  <h3>Critical Stock Watchlist</h3>
                  <p>Items requiring immediate replenishment or purchase order creation</p>
                </div>
              </div>
              <Link to="/lowstock" className="panel-link-btn">
                <span>View Low Stock Page</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="critical-alerts-list">
              {stats?.criticalAlerts && stats.criticalAlerts.length > 0 ? (
                stats.criticalAlerts.map((item) => (
                  <div
                    key={item._id}
                    className={`critical-alert-card status-${item.status}`}
                  >
                    <div className="alert-item-left">
                      <div className="alert-item-name">{item.name}</div>
                      <div className="alert-item-meta">
                        <span className="alert-sku-chip">{item.sku}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                      </div>
                    </div>

                    <div className="alert-item-right">
                      <div className="alert-qty-box">
                        <div className={`alert-qty-val ${item.status}`}>
                          {item.currentStock} {item.unit}
                        </div>
                        <div className="alert-qty-min">Min: {item.minStock} {item.unit}</div>
                      </div>
                      <Link
                        to="/purchase-order"
                        className="alert-action-btn"
                        title="Create Purchase Order for this item"
                      >
                        <ShoppingCart size={13} />
                        <span>Reorder</span>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="all-healthy-state">
                  <div className="all-healthy-icon">
                    <CheckCircle2 size={26} />
                  </div>
                  <div className="all-healthy-title">Stock Levels Optimal</div>
                  <div className="all-healthy-sub">
                    All catalog items are currently stocked above their minimum safety thresholds.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column B: Activity Stream & High Movement Items */}
          <div className="dashboard-panel">
            <div className="panel-header-row">
              <div className="panel-title-wrap">
                <div className="panel-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  <TrendingUp size={18} />
                </div>
                <div className="panel-title-text">
                  <h3>Movement & Operations Hub</h3>
                  <p>High velocity items and recent warehouse transactions</p>
                </div>
              </div>
            </div>

            {/* Tab Selectors */}
            <div className="activity-tabs-header">
              <button
                className={`activity-tab-btn ${activeTab === 'topProducts' ? 'active' : ''}`}
                onClick={() => setActiveTab('topProducts')}
              >
                Top Moving Products
              </button>
              <button
                className={`activity-tab-btn ${activeTab === 'recentPOs' ? 'active' : ''}`}
                onClick={() => setActiveTab('recentPOs')}
              >
                Recent POs ({stats?.recentPOs ? stats.recentPOs.length : 0})
              </button>
              <button
                className={`activity-tab-btn ${activeTab === 'recentIssues' ? 'active' : ''}`}
                onClick={() => setActiveTab('recentIssues')}
              >
                Recent Issues ({stats?.recentIssues ? stats.recentIssues.length : 0})
              </button>
            </div>

            {/* Tab 1: Top Moving Products */}
            {activeTab === 'topProducts' && (
              <ul className="product-list">
                {stats?.topProducts && stats.topProducts.map((product, i) => (
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
                {(!stats?.topProducts || stats.topProducts.length === 0) && (
                  <div className="empty-demand-state">No product issue data recorded yet</div>
                )}
              </ul>
            )}

            {/* Tab 2: Recent Purchase Orders */}
            {activeTab === 'recentPOs' && (
              <div className="activity-feed-list">
                {stats?.recentPOs && stats.recentPOs.length > 0 ? (
                  stats.recentPOs.map(po => (
                    <div key={po._id} className="activity-feed-item">
                      <div className="activity-feed-left">
                        <ShoppingCart size={16} className="text-cyan-600" />
                        <div>
                          <div className="activity-code">{po.poNumber}</div>
                          <div className="activity-desc">
                            {po.supplier} • {po.branch}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`kpi-badge ${po.status === 'Received' ? 'badge-success' : 'badge-warning'}`}>
                          {po.status}
                        </span>
                        <div className="activity-date">{formatDate(po.orderDate)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-demand-state">No purchase orders recorded yet</div>
                )}
              </div>
            )}

            {/* Tab 3: Recent Issue Notes */}
            {activeTab === 'recentIssues' && (
              <div className="activity-feed-list">
                {stats?.recentIssues && stats.recentIssues.length > 0 ? (
                  stats.recentIssues.map(issue => (
                    <div key={issue._id} className="activity-feed-item">
                      <div className="activity-feed-left">
                        <Inbox size={16} className="text-purple-600" />
                        <div>
                          <div className="activity-code">{issue.issueNoteNumber}</div>
                          <div className="activity-desc">
                            {issue.fromBranch} → {issue.toBranch}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`kpi-badge ${issue.status === 'issued' ? 'badge-success' : 'badge-info'}`}>
                          {issue.status}
                        </span>
                        <div className="activity-date">{formatDate(issue.issueDate)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-demand-state">No issue notes recorded yet</div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

