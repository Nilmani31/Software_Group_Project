import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import Report from './Pages/Report';
import MainLayout from './Components/MainLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/reports" element={<MainLayout><Report /></MainLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
