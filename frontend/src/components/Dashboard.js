import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from './Navigation';
import MindmapList from './MindmapList';
import Mindmap from './mindmap';
import CreateMindmap from './CreateMindmap';
import Notes from './Notes';
import OCR from './OCR';
import TextToSpeech from './TextToSpeech';
import Summarizer from './Summarizer';
import YouTube from './YouTube';
import OcrProcessor from './OcrProcessor';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [activeFeature, setActiveFeature] = useState('notes');
  const [selectedMindmapId, setSelectedMindmapId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [activeTab, setActiveTab] = useState('mindmaps'); // 'mindmaps' or 'ocr'

  useEffect(() => {
    document.body.classList.toggle('dark-theme', isDarkTheme);
  }, [isDarkTheme]);

  const renderFeatureContent = () => {
    switch (activeFeature) {
      case 'notes':
        return <Notes />;
      case 'mindmap':
        return (
          <div className="dashboard-content">
            <div className="dashboard-sidebar">
              <button className="create-button" onClick={() => setShowCreateForm(true)}>
                Create New Mindmap
              </button>
              <MindmapList onSelectMindmap={setSelectedMindmapId} />
            </div>
            <div className="dashboard-main">
              {showCreateForm ? (
                <CreateMindmap onSuccess={(id) => {
                  setSelectedMindmapId(id);
                  setShowCreateForm(false);
                }} />
              ) : (
                <Mindmap mindmapId={selectedMindmapId} />
              )}
            </div>
          </div>
        );
      case 'ocr':
        return <OcrProcessor />;
      case 'tts':
        return <TextToSpeech />;
      case 'summarizer':
        return <Summarizer />;
      case 'youtube':
        return <YouTube />;
      default:
        return <Notes />;
    }
  };

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
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'mindmaps') {
      setShowCreateForm(false);
    }
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
      />
      
      <div className="feature-content">
        {renderFeatureContent()}
      </div>
    </div>
  );
};

export default Dashboard; 