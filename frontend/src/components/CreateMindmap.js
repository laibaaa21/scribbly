import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest, createMindmap } from '../utils/api';

const CreateMindmap = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mainText, setMainText] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationMethod, setGenerationMethod] = useState('manual'); // 'manual' or 'auto'
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  
  const { token } = useAuth();

  const saveMindmap = async (mindmapData) => {
    try {
      await createMindmap(mindmapData, token);
      onSuccess();
    } catch (err) {
      console.error('Error saving mindmap:', err);
      setGenerationError(`Failed to save mindmap: ${err.message}`);
    }
  };

  // Generate color based on keyword/text 
  const generateColor = (text) => {
    // Simple hash function for string to generate a consistent color for the same text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate vibrant colors by setting high saturation and reasonable lightness
    const h = Math.abs(hash) % 360; // Hue: 0-360
    const s = 70 + (Math.abs(hash) % 20); // Saturation: 70-90%
    const l = 45 + (Math.abs(hash) % 15); // Lightness: 45-60%
    
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  // Create a more detailed mind map from the input text and keywords
  const generateMindmapStructure = (title, mainText, keywordsString) => {
    // Extract keywords from the comma-separated list
    const keywordsList = keywordsString.split(',')
      .map(k => k.trim())
      .filter(k => k !== '');
    
    // If no keywords provided, extract some from the text
    const extractedKeywords = keywordsList.length > 0 ? keywordsList : extractKeywords(mainText);
    
    // Create the root node with the title
    const rootNode = {
      id: 'root',
      text: title,
      color: generateColor(title),
      children: []
    };
    
    // If we have main text, create a central node for it
    if (mainText.trim()) {
      // Extract key sentences from the main text (simplified extraction)
      const sentences = mainText.match(/[^.!?]+[.!?]+/g) || [];
      const keySentences = sentences.slice(0, Math.min(sentences.length, 3));
      
      // Add main text as a primary branch with key sentences
      const mainTextNode = {
        id: 'main-text',
        text: 'Main Content',
        color: generateColor('Main Content'),
        children: keySentences.map((sentence, idx) => ({
          id: `sentence-${idx}`,
          text: sentence.trim(),
          color: generateColor(sentence.substring(0, 10)),
          children: []
        }))
      };
      
      rootNode.children.push(mainTextNode);
    }
    
    // Add keywords as primary branches with potential sub-branches
    extractedKeywords.forEach((keyword, idx) => {
      // For each keyword, generate 2-3 related concepts
      const relatedConcepts = generateRelatedConcepts(keyword, mainText);
      
      const keywordNode = {
        id: `keyword-${idx}`,
        text: keyword,
        color: generateColor(keyword),
        children: relatedConcepts.map((concept, cIdx) => ({
          id: `concept-${idx}-${cIdx}`,
          text: concept,
          color: generateColor(concept),
          children: []
        }))
      };
      
      rootNode.children.push(keywordNode);
    });
    
    return rootNode;
  };
  
  // Extract keywords from text (simplified version)
  const extractKeywords = (text) => {
    if (!text.trim()) return [];
    
    // Remove common words and split text into words
    const commonWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'for', 'with', 'on', 'by'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4 && !commonWords.includes(word)); // Words longer than 4 chars
    
    // Count word frequencies
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Sort by frequency and take top 5
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]); // Get just the words
  };
  
  // Generate related concepts for a keyword (simplified)
  const generateRelatedConcepts = (keyword, text) => {
    // In a real app, you would use a more sophisticated NLP approach
    // Here we're just generating some related concepts based on context
    
    // Look for sentences containing the keyword
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const relevantSentences = sentences.filter(s => 
      s.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (relevantSentences.length > 0) {
      // Extract some words from these sentences
      const words = relevantSentences.join(' ')
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => 
          word.length > 3 && 
          word.toLowerCase() !== keyword.toLowerCase()
        );
      
      // Get unique words
      const uniqueWords = [...new Set(words)];
      // Take random sampling of 2-3 words
      const numConcepts = Math.floor(Math.random() * 2) + 2; // 2-3 concepts
      
      if (uniqueWords.length >= numConcepts) {
        return uniqueWords
          .sort(() => 0.5 - Math.random()) // Shuffle
          .slice(0, numConcepts);
      }
    }
    
    // Fallback: generate generic related concepts
    const genericConcepts = [
      'Examples', 'Definition', 'Applications',
      'History', 'Components', 'Benefits',
      'Types', 'Analysis', 'Methods'
    ];
    
    return genericConcepts
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, 3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title) {
      setError('Title is required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Generate a more complex mindmap structure from inputs
      const rootNode = generateMindmapStructure(title, mainText, keywords);
      
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
      setMainText('');
      setKeywords('');
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

  // Add this function to call the backend API for auto-generation
  const generateMindmapFromText = async () => {
    if (!mainText.trim()) {
      setGenerationError('Please enter text content to generate the mindmap from.');
      return;
    }

    if (mainText.trim().length < 100) {
      setGenerationError('Text is too short. Please provide at least a few sentences for better results.');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');

    try {
      const data = await apiRequest('/Mindmap-gen', 'POST', {
        text: mainText,
        max_depth: 3,
        min_keywords: 5,
        max_keywords: 8
      }, token, true);

      if (data.status === 'success' && data.mindmap) {
        // Update title if it's empty
        if (!title.trim()) {
          setTitle('Generated Mindmap');
        }

        // Create a proper mindmap structure and save it
        const mindmapToSave = {
          title: title.trim() || 'Generated Mindmap',
          description: description.trim() || 'Mindmap automatically generated from text content',
          rootNode: data.mindmap,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
        };

        saveMindmap(mindmapToSave);
      } else {
        throw new Error('Failed to generate mindmap structure');
      }
    } catch (err) {
      console.error('Error generating mindmap:', err);
      setGenerationError(`Failed to generate mindmap: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="create-mindmap-container">
      <h2>Create New Mindmap</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="generation-method-selector">
        <div className="method-label">Generation Method:</div>
        <div className="method-options">
          <label className="method-option">
            <input
              type="radio"
              name="generationMethod"
              value="manual"
              checked={generationMethod === 'manual'}
              onChange={() => setGenerationMethod('manual')}
            />
            <span>Manual</span>
            <small>(provide keywords)</small>
          </label>
          
          <label className="method-option">
            <input
              type="radio"
              name="generationMethod"
              value="auto"
              checked={generationMethod === 'auto'}
              onChange={() => setGenerationMethod('auto')}
            />
            <span>Automatic</span>
            <small>(generate from text)</small>
          </label>
        </div>
      </div>

      {generationError && <div className="error-message">{generationError}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title (Required)</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter mindmap title"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of your mindmap"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="mainText">Main Text Content</label>
          <textarea
            id="mainText"
            value={mainText}
            onChange={(e) => setMainText(e.target.value)}
            placeholder="Paste the main text you want to visualize in the mindmap"
            rows={5}
          />
        </div>
        
        {generationMethod === 'manual' && (
          <div className="form-group">
            <label htmlFor="keywords">Keywords (comma-separated)</label>
            <input
              type="text"
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., machine learning, algorithms, data science"
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., study, work, important"
          />
        </div>
        
        <div className="form-actions">
          {generationMethod === 'manual' ? (
            <button 
              onClick={handleSubmit} 
              className="primary-button"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Mindmap'}
            </button>
          ) : (
            <button 
              onClick={generateMindmapFromText} 
              className="primary-button auto-generate"
              disabled={isGenerating || !mainText.trim()}
            >
              {isGenerating ? 'Generating...' : 'Generate Mindmap from Text'}
            </button>
          )}
        </div>
      </form>
      
      <style jsx>{`
        .create-mindmap-container {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        h2 {
          margin-top: 0;
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #555;
        }
        
        input, textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        input:focus, textarea:focus {
          outline: none;
          border-color: #61dafb;
          box-shadow: 0 0 0 2px rgba(97, 218, 251, 0.2);
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }
        
        .create-button {
          background-color: #61dafb;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .create-button:hover:not(:disabled) {
          background-color: #21a1c7;
        }
        
        .create-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .generation-method-selector {
          margin-bottom: 20px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
        }

        .method-label {
          font-weight: 600;
          margin-bottom: 10px;
          color: #444;
        }

        .method-options {
          display: flex;
          gap: 20px;
        }

        .method-option {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }

        .method-option input {
          margin: 0;
        }

        .method-option span {
          font-weight: 500;
        }

        .method-option small {
          color: #777;
          margin-left: 4px;
        }

        .form-actions {
          margin-top: 20px;
        }

        .auto-generate {
          background-color: #4caf50;
        }

        .auto-generate:hover:not(:disabled) {
          background-color: #45a049;
        }
      `}</style>
    </div>
  );
};

export default CreateMindmap; 