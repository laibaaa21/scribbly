import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MindmapList from './MindmapList';
import Mindmap from './mindmap';
import CreateMindmap from './CreateMindmap';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [selectedMindmapId, setSelectedMindmapId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const handleSelectMindmap = (id) => {
    setSelectedMindmapId(id);
    setShowCreateForm(false);
  };
  
  const handleCreateClick = () => {
    setSelectedMindmapId(null);
    setShowCreateForm(true);
  };
  
  const handleMindmapCreated = (id) => {
    setSelectedMindmapId(id);
    setShowCreateForm(false);
  };
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Scribbly Dashboard</h1>
        
        <div className="user-info">
          <div className="username">Welcome, {currentUser?.username || 'User'}</div>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-sidebar">
          <button 
            className="create-button" 
            onClick={handleCreateClick}
          >
            Create New Mindmap
          </button>
          
          <MindmapList onSelectMindmap={handleSelectMindmap} />
        </div>
        
        <div className="dashboard-main">
          {showCreateForm ? (
            <CreateMindmap onSuccess={handleMindmapCreated} />
          ) : (
            <Mindmap 
              mindmapId={selectedMindmapId} 
              onMindmapCreated={handleMindmapCreated} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 