import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAITools } from '../contexts/AIToolsContext';
import './YouTube.css';

const YouTube = () => {
  const { token } = useAuth();
  const {
    youtubeState,
    setYoutubeState,
    resetYoutube
  } = useAITools();

  // Fallback videos in case API fails
  const fallbackVideos = [
    {
      title: "How to Learn Anything Fast",
      url: "https://www.youtube.com/watch?v=Y_B6VADhY84",
      thumbnail: "https://i.ytimg.com/vi/Y_B6VADhY84/hqdefault.jpg",
      channelName: "Thomas Frank"
    },
    {
      title: "How To Speak by Patrick Winston",
      url: "https://www.youtube.com/watch?v=Unzc731iCUY",
      thumbnail: "https://i.ytimg.com/vi/Unzc731iCUY/hqdefault.jpg",
      channelName: "MIT OpenCourseWare"
    },
    {
      title: "How to Study Effectively for School or College",
      url: "https://www.youtube.com/watch?v=IlU-zDU6aQ0",
      thumbnail: "https://i.ytimg.com/vi/IlU-zDU6aQ0/hqdefault.jpg",
      channelName: "Mariana's Corner"
    },
    {
      title: "How to Be More Productive",
      url: "https://www.youtube.com/watch?v=4aYVLpY5FYU",
      thumbnail: "https://i.ytimg.com/vi/4aYVLpY5FYU/hqdefault.jpg",
      channelName: "MedSchoolInsiders"
    },
    {
      title: "Learning how to learn | Barbara Oakley | TEDxOaklandUniversity",
      url: "https://www.youtube.com/watch?v=O96fE1E-rf8",
      thumbnail: "https://i.ytimg.com/vi/O96fE1E-rf8/hqdefault.jpg",
      channelName: "TEDx Talks"
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!youtubeState.keywords?.trim()) {
      setYoutubeState(prev => ({
        ...prev,
        error: 'Please enter keywords to search'
      }));
      return;
    }

    setYoutubeState(prev => ({
      ...prev,
      isProcessing: true,
      error: ''
    }));

    try {
      const response = await fetch('http://localhost:8000/YtSuggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: youtubeState.keywords,
          max_results: 5
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Transform the response data into our expected format
      const videoResults = data.video_titles.map((title, index) => ({
        title: title,
        url: data.video_links[index],
        channelName: data.channel_names[index],
        thumbnail: `https://i.ytimg.com/vi/${data.video_links[index].split('v=')[1]}/hqdefault.jpg`
      }));

      setYoutubeState(prev => ({
        ...prev,
        results: videoResults,
        isProcessing: false
      }));
    } catch (err) {
      console.error('Error fetching videos:', err);
      setYoutubeState(prev => ({
        ...prev,
        error: err.message || 'Failed to fetch videos. Please try again.',
        results: [],
        isProcessing: false
      }));
    }
  };

  const handleKeywordsChange = (e) => {
    setYoutubeState(prev => ({
      ...prev,
      keywords: e.target.value
    }));
  };

  return (
    <div className="youtube-container">
      <div className="youtube-header">
        <h2>YouTube Video Recommender</h2>
        <button onClick={resetYoutube} className="reset-button">
          <span className="tool-icon">🔄</span>
          Reset
        </button>
      </div>

      {youtubeState.error && (
        <div className="youtube-error">{youtubeState.error}</div>
      )}

      <form onSubmit={handleSubmit} className="youtube-search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={youtubeState.keywords || ''}
            onChange={handleKeywordsChange}
            placeholder="Enter keywords (e.g., 'JavaScript tutorials', 'machine learning basics')"
            className="youtube-search-input"
          />
          <button
            type="submit"
            disabled={youtubeState.isProcessing}
            className="youtube-search-button"
          >
            {youtubeState.isProcessing ? (
              <>
                <span className="spinner"></span>
                Searching...
              </>
            ) : (
              <>
                <span className="tool-icon">🔍</span>
                Search Videos
              </>
            )}
          </button>
        </div>
      </form>

      {youtubeState.results?.length > 0 && (
        <div className="youtube-results">
          <h3>Top Videos for "{youtubeState.keywords || 'Your Search'}"</h3>
          <div className="youtube-results-list">
            {youtubeState.results.map((video, index) => (
              <div key={index} className="youtube-result-item">
                <div className="youtube-thumbnail">
                  <a href={video.url} target="_blank" rel="noopener noreferrer">
                    <img src={video.thumbnail} alt={video.title} />
                  </a>
                </div>
                <div className="youtube-video-info">
                  <h4>
                    <a href={video.url} target="_blank" rel="noopener noreferrer">
                      {video.title}
                    </a>
                  </h4>
                  <p className="youtube-channel">{video.channelName}</p>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="watch-button"
                  >
                    Watch Now
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="video-disclaimer">
            <p>All videos are sourced from YouTube and open in a new tab. These are real, publicly available videos selected for educational purposes.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTube;
