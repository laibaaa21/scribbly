import React, { useState } from 'react';

const YouTube = () => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      setVideoInfo(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="feature-container">
      <div className="feature-main">
        <h2>YouTube Video Processor</h2>
        <div className="input-group">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter YouTube URL..."
            className="input-field"
          />
          <button 
            onClick={handleSubmit}
            disabled={isLoading || !url}
            className="primary-button"
          >
            {isLoading ? 'Processing...' : 'Process Video'}
          </button>
        </div>
        {videoInfo && (
          <div className="feature-card">
            <h3>{videoInfo.title}</h3>
            <div className="card-details">
              <p><strong>Duration:</strong> {videoInfo.duration}</p>
              <p><strong>Views:</strong> {videoInfo.views}</p>
            </div>
            <div className="card-content">
              <h4>Transcript:</h4>
              <p>{videoInfo.transcript}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTube;
