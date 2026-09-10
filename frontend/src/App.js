import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import Report from './Pages/Report';
import MainLayout from './Components/MainLayout';
import LowStock from './Pages/LowStock';
import IssueNote from './Pages/IssueNote';
import Inventory from './Pages/Inventory';
import PurchaseOrder from './Pages/PurchaseOrder';
import Branches from './Pages/Branches';
import Users from './Pages/Users';
import Categories from './Pages/Categories';
import GoodReceived from './Pages/GoodReceived';
import ProtectedRoute from './Components/ProtectedRoute';
import './Pages/SharedModals.css';

function App() {
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = () => {};

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/dashboard" element={<ProtectedRoute path="/dashboard"><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute path="/report"><MainLayout><Report /></MainLayout></ProtectedRoute>} />
        <Route path="/lowstock" element={<ProtectedRoute path="/low-stock"><LowStock /></ProtectedRoute>} />
        <Route path="/issue-note" element={<ProtectedRoute path="/issue-note"><IssueNote /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute path="/inventory"><Inventory /></ProtectedRoute>} />
        <Route path="/purchase-order" element={<ProtectedRoute path="/purchase-order"><PurchaseOrder/></ProtectedRoute>} />
        <Route path="/branches" element={<ProtectedRoute path="/branches"><Branches /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute path="/users"><Users /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute path="/categories"><Categories /></ProtectedRoute>} />
        <Route path="/good-received" element={<ProtectedRoute path="/good-received"><GoodReceived /></ProtectedRoute>} />
        
        {/* Redirect common typos to correct routes */}
        <Route path="/dashbord" element={<Navigate to="/dashboard" replace />} />
        <Route path="/inventöry" element={<Navigate to="/inventory" replace />} />
        <Route path="/report" element={<Navigate to="/reports" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
