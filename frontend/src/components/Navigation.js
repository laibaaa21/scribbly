import React from 'react';

const Navigation = ({ onFeatureSelect, activeFeature, onAIToolSelect, activeAITool }) => {
  const features = [
    { id: 'notes', label: 'Notes' }
  ];

  const aiTools = [
    { id: 'mindmap', label: 'Mind Map', icon: '🗺️' },
    { id: 'ocr', label: 'OCR Scanner', icon: '📷' },
    { id: 'tts', label: 'Text to Speech', icon: '🔊' },
    { id: 'summarizer', label: 'Summarizer', icon: '📝' },
    { id: 'youtube', label: 'YouTube', icon: '▶️' }
  ];

  return (
    <nav className="main-nav">
      <div className="nav-section">
        {features.map(feature => (
          <button
            key={feature.id}
            className={`nav-button ${activeFeature === feature.id ? 'active' : ''}`}
            onClick={() => onFeatureSelect(feature.id)}
          >
            {feature.label}
          </button>
        ))}
      </div>

      <div className="nav-divider" />

      <div className="nav-section ai-tools">
        {aiTools.map(tool => (
          <button
            key={tool.id}
            className={`nav-button ai-tool ${activeAITool === tool.id ? 'active' : ''}`}
            onClick={() => onAIToolSelect(tool.id)}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
