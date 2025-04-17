import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createMindmap } from '../utils/api';

const CreateMindmap = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title) {
      setError('Title is required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Create a basic mindmap structure
      const rootNode = {
        id: 'root',
        text: title,
        children: [
          {
            id: 'child1',
            text: 'Topic 1',
            children: []
          },
          {
            id: 'child2',
            text: 'Topic 2',
            children: []
          }
        ]
      };
      
      const tagArray = tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
      
      const mindmapData = {
        title,
        description,
        rootNode,
        tags: tagArray,
        isPublic: false
      };
      
      const newMindmap = await createMindmap(mindmapData, token);
      
      // Reset form
      setTitle('');
      setDescription('');
      setTags('');
      
      if (onSuccess) {
        onSuccess(newMindmap._id);
      }
    } catch (error) {
      setError(error.message || 'Failed to create mindmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-mindmap-container">
      <h2>Create New Mindmap</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tags">Tags (comma separated)</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. work, project, ideas"
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Mindmap'}
        </button>
      </form>
    </div>
  );
};

export default CreateMindmap; 