import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from './Pages/Login';
import Sidebar from './Components/Sidebar';
import Navbar from './Components/Navbar';
import Dashboard from './Pages/Dashboard';
import Report from './Pages/Report';
import ChatAssistant from './Components/ChatAssistant';

function App() {
  return (
    <Router>
      
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
              <Navbar />
              <div style={{ display: "flex", flex: 1 }}>
                <Sidebar />
                <Dashboard />
              </div>
              <ChatAssistant />
            </div>} />
          <Route path="/reports" element={<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
              <Navbar />
              <div style={{ display: "flex", flex: 1 }}>
                <Sidebar />
                <Report />
              </div>
              <ChatAssistant />
            </div>} />
        </Routes>
      
    </Router>
  );
}

export default App;
