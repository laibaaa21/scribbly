import React from 'react';

const Navigation = ({ onFeatureSelect, activeFeature }) => {
  const features = [
    { id: 'notes', label: 'Notes' }
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
