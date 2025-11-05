import React from "react";
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <div className="welcome-text">Welcome, username 👋</div>
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Total Items</h3>
          <p>263</p>
        </div>
        <div className="card">
          <h3>Low Stock</h3>
          <p>10</p>
        </div>
        <div className="card">
          <h3>Out of Stock</h3>
          <p>6</p>
        </div>
        <div className="card">
          <h3>Purchase Order</h3>
          <p>3</p>
        </div>
        <div className="card">
          <h3>Request Orders</h3>
          <p>3</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="chart-section">
          <h3>Inventory Values</h3>
          <div className="chart-placeholder">📊 Chart Area</div>
        </div>
        <div className="list-section">
          <h3>Top 10 Product Issues</h3>
          <ul>
            {Array.from({ length: 10 }).map((_, i) => (
              <li key={i}>Name of product</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
