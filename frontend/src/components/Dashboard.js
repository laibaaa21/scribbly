import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Notes from './Notes';
import Navigation from './Navigation';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeFeature, setActiveFeature] = useState('notes');
  const [activeAITool, setActiveAITool] = useState(null);

  useEffect(() => {
    document.body.classList.toggle('dark-theme', isDarkTheme);
  }, [isDarkTheme]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleAIToolSelect = (toolId) => {
    setActiveAITool(activeAITool === toolId ? null : toolId);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Scribbly Dashboard</h1>
        <div className="user-info">
          <div className="username">Welcome, {currentUser?.username || 'User'}</div>
          <button onClick={logout} className="logout-btn">Logout</button>
          <button
            className="theme-toggle"
            onClick={() => setIsDarkTheme(!isDarkTheme)}
          >
            {isDarkTheme ? '🌞' : '🌙'}
          </button>
        </div>
      </div>

      <Navigation 
        onFeatureSelect={setActiveFeature}
        activeFeature={activeFeature}
        onAIToolSelect={handleAIToolSelect}
        activeAITool={activeAITool}
      />

      {/* Sidebar Toggle Button */}
      <button
        className={`sidebar-toggle ${!sidebarVisible ? 'collapsed' : ''}`}
        onClick={toggleSidebar}
        aria-label={sidebarVisible ? 'Hide Notes' : 'Show Notes'}
      >
        {sidebarVisible ? '←' : '→'}
      </button>

      <div className="feature-content">
        <Notes 
          sidebarVisible={sidebarVisible} 
          activeAITool={activeAITool}
          onAIToolSelect={handleAIToolSelect}
        />
      </div>
    </div>
  );
};

export default Dashboard; 