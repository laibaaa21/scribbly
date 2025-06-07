import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './YouTube.css';

const YouTube = () => {
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();

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
    if (!keywords.trim()) {
      setError('Please enter keywords to search');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/YtSuggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: keywords,
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

      setResults(videoResults);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message || 'Failed to fetch videos. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock YouTube results for development testing
  const generateMockResults = (query) => {
    const mockVideos = [
      {
        title: `${query} Tutorial - Comprehensive Guide`,
        url: "https://www.youtube.com/watch?v=example1",
        thumbnail: "https://i.ytimg.com/vi/Y_B6VADhY84/hqdefault.jpg",
        channelName: "Tech Tutorials"
      },
      {
        title: `Learn ${query} in 30 Minutes`,
        url: "https://www.youtube.com/watch?v=example2",
        thumbnail: "https://i.ytimg.com/vi/Unzc731iCUY/hqdefault.jpg",
        channelName: "Quick Learner"
      },
      {
        title: `${query} for Beginners - Step by Step`,
        url: "https://www.youtube.com/watch?v=example3",
        thumbnail: "https://i.ytimg.com/vi/IlU-zDU6aQ0/hqdefault.jpg",
        channelName: "Coding Masters"
      }
    ];
    return mockVideos;
  };

  // Helper function to extract video ID from YouTube URL
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : "";
  };

  return (
    <div className="youtube-container">
      <h2>YouTube Video Recommender</h2>

      {error && <div className="youtube-error">{error}</div>}

      <form onSubmit={handleSubmit} className="youtube-search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Enter keywords (e.g., 'JavaScript tutorials', 'machine learning basics')"
            className="youtube-search-input"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="youtube-search-button"
          >
            {isLoading ? 'Searching...' : 'Search Videos'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="youtube-results">
          <h3>Top Videos for "{keywords || 'Your Search'}"</h3>
          <div className="youtube-results-list">
            {results.map((video, index) => (
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
