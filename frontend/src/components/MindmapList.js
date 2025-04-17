import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMindmaps, deleteMindmap } from '../utils/api';

const MindmapList = ({ onSelectMindmap }) => {
  const [mindmaps, setMindmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { token } = useAuth();

  useEffect(() => {
    fetchMindmaps();
  }, [token]);

  const fetchMindmaps = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await getMindmaps(token);
      setMindmaps(data);
      setError('');
    } catch (error) {
      setError('Failed to fetch mindmaps');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this mindmap?')) {
      try {
        await deleteMindmap(id, token);
        setMindmaps(mindmaps.filter(mindmap => mindmap._id !== id));
      } catch (error) {
        setError('Failed to delete mindmap');
        console.error(error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading mindmaps...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (mindmaps.length === 0) {
    return <div className="empty-list">No mindmaps found. Create your first mindmap!</div>;
  }

  return (
    <div className="mindmap-list">
      <h2>Your Mindmaps</h2>
      <ul>
        {mindmaps.map((mindmap) => (
          <li key={mindmap._id} className="mindmap-item">
            <div className="mindmap-info">
              <h3>{mindmap.title}</h3>
              <p>{mindmap.description || 'No description'}</p>
              <div className="mindmap-meta">
                <span>Created: {new Date(mindmap.createdAt).toLocaleDateString()}</span>
                {mindmap.tags && mindmap.tags.length > 0 && (
                  <div className="mindmap-tags">
                    {mindmap.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mindmap-actions">
              <button onClick={() => onSelectMindmap(mindmap._id)} className="btn btn-view">
                View
              </button>
              <button onClick={() => handleDelete(mindmap._id)} className="btn btn-delete">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MindmapList; 