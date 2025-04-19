import React from 'react';

const Navigation = ({ onFeatureSelect, activeFeature }) => {
  const features = [
    { id: 'notes', label: 'Notes' },
    { id: 'mindmap', label: 'Mindmap' },
    { id: 'ocr', label: 'OCR' },
    { id: 'tts', label: 'Text to Speech' },
    { id: 'summarizer', label: 'Summarizer' },
    { id: 'youtube', label: 'YouTube' }
  ];

  return (
    <nav className="main-nav">
      {features.map(feature => (
        <button
          key={feature.id}
          className={`nav-button ${activeFeature === feature.id ? 'active' : ''}`}
          onClick={() => onFeatureSelect(feature.id)}
        >
          {feature.label}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
