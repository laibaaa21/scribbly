import React, { useState } from 'react';

const YouTube = () => {
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      // First try with direct API call
      let response;
      
      try {
        // Try the FastAPI backend running at port 8000
        response = await fetch('http://localhost:8000/YtSuggestion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            query: keywords,
            max_results: 5 // Request 5 videos
          })
        });
      } catch (connectionError) {
        console.error('Direct API connection failed:', connectionError);
        
        // Try with /api proxy if direct connection fails
        response = await fetch('/api/youtube/suggest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            query: keywords,
            max_results: 5
          })
        });
      }
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we got valid results
      if (data.video_titles && data.video_links && 
          data.video_titles.length > 0 && data.video_links.length > 0) {
        
        // Transform the response data into our expected format
        const videoResults = data.video_titles.map((title, index) => {
          const videoId = extractVideoId(data.video_links[index]);
          return {
            title: title,
            url: data.video_links[index],
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            channelName: "YouTube" // API doesn't return channel name
          };
        });
        
        setResults(videoResults);
      } else {
        // If no results or empty results, use fallbacks
        console.log('No videos found in API response, using fallbacks.');
        setError('No videos found for your search. Showing recommended selections instead.');
        setResults(fallbackVideos);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      
      // If we're in development mode, use mock data for testing
      if (process.env.NODE_ENV === 'development') {
        const mockResults = generateMockResults(keywords);
        setResults(mockResults);
        setError('Using mock data for development (API not available)');
      } else {
        setError('Failed to fetch videos from YouTube. Using our recommended selections instead.');
        setResults(fallbackVideos);
      }
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
      
      <style jsx>{`
        .youtube-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        
        .youtube-container h2 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
          text-align: center;
        }
        
        .youtube-error {
          background-color: #ffebee;
          color: #c62828;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }
        
        .youtube-search-form {
          margin-bottom: 20px;
        }
        
        .search-input-container {
          display: flex;
          gap: 10px;
        }
        
        .youtube-search-input {
          flex: 1;
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 30px;
          font-size: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .youtube-search-input:focus {
          outline: none;
          border-color: #ff0000;
          box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.1);
        }
        
        .youtube-search-button {
          padding: 0 20px;
          background-color: #ff0000;
          color: white;
          border: none;
          border-radius: 30px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .youtube-search-button:hover:not(:disabled) {
          background-color: #cc0000;
        }
        
        .youtube-search-button:disabled {
          background-color: #ffcccc;
          cursor: not-allowed;
        }
        
        .youtube-results h3 {
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .youtube-results-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .youtube-result-item {
          display: flex;
          gap: 15px;
          padding: 15px;
          border-radius: 8px;
          transition: background-color 0.2s;
          border: 1px solid #eee;
        }
        
        .youtube-result-item:hover {
          background-color: #f9f9f9;
        }
        
        .youtube-thumbnail {
          flex-shrink: 0;
        }
        
        .youtube-thumbnail img {
          width: 160px;
          height: 90px;
          border-radius: 4px;
          object-fit: cover;
          display: block;
        }
        
        .youtube-video-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .youtube-video-info h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          line-height: 1.4;
        }
        
        .youtube-video-info a {
          color: #0F0F0F;
          text-decoration: none;
        }
        
        .youtube-video-info a:hover {
          text-decoration: underline;
        }
        
        .youtube-channel {
          margin: 0 0 10px 0;
          color: #606060;
          font-size: 14px;
        }
        
        .watch-button {
          display: inline-block;
          margin-top: auto;
          background-color: #ff0000;
          color: white !important;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          text-decoration: none !important;
          align-self: flex-start;
          transition: background-color 0.2s;
        }
        
        .watch-button:hover {
          background-color: #cc0000;
        }
        
        .video-disclaimer {
          margin-top: 20px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        
        @media (max-width: 600px) {
          .youtube-result-item {
            flex-direction: column;
          }
          
          .youtube-thumbnail img {
            width: 100%;
            height: auto;
            max-height: 180px;
          }
        }
      `}</style>
    </div>
  );
};

export default YouTube;
