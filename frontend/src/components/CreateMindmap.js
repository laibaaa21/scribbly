import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAITools } from '../contexts/AIToolsContext';
import { apiRequest, createMindmap } from '../utils/api';
import './CreateMindmap.css';

const CreateMindmap = ({ onClose }) => {
  const { token } = useAuth();
  const {
    mindmapState,
    setMindmapState,
    resetMindmap
  } = useAITools();

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
    
    if (!mindmapState.title) {
      setMindmapState(prev => ({
        ...prev,
        error: 'Title is required'
      }));
      return;
    }
    
    try {
      setMindmapState(prev => ({
        ...prev,
        isProcessing: true,
        error: ''
      }));
      
      // Generate a more complex mindmap structure from inputs
      const rootNode = generateMindmapStructure(
        mindmapState.title,
        mindmapState.mainText,
        mindmapState.keywords
      );
      
      const tagArray = mindmapState.tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
      
      const mindmapData = {
        title: mindmapState.title,
        description: mindmapState.description,
        rootNode,
        tags: tagArray,
        isPublic: false
      };
      
      const newMindmap = await createMindmap(mindmapData, token);
      
      // Reset form
      resetMindmap();
      
      if (onClose) {
        onClose(newMindmap._id);
      }
    } catch (error) {
      setMindmapState(prev => ({
        ...prev,
        error: error.message || 'Failed to create mindmap',
        isProcessing: false
      }));
    }
  };

  // Add this function to call the backend API for auto-generation
  const generateMindmapFromText = async () => {
    if (!mindmapState.mainText?.trim()) {
      setMindmapState(prev => ({
        ...prev,
        generationError: 'Please enter text content to generate the mindmap from.'
      }));
      return;
    }

    if (mindmapState.mainText.trim().length < 100) {
      setMindmapState(prev => ({
        ...prev,
        generationError: 'Text is too short. Please provide at least a few sentences for better results.'
      }));
      return;
    }

    setMindmapState(prev => ({
      ...prev,
      isGenerating: true,
      generationError: ''
    }));

    try {
      const data = await apiRequest('/Mindmap-gen', 'POST', {
        text: mindmapState.mainText,
        max_depth: 3,
        min_keywords: 5,
        max_keywords: 8
      }, token, true);

      if (data.status === 'success' && data.mindmap) {
        // Update title if it's empty
        const title = mindmapState.title.trim() || 'Generated Mindmap';
        const description = mindmapState.description.trim() || 'Mindmap automatically generated from text content';
        const tags = mindmapState.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        // Create a proper mindmap structure and save it
        const mindmapToSave = {
          title,
          description,
          rootNode: data.mindmap,
          tags
        };

        await createMindmap(mindmapToSave, token);
        resetMindmap();
        if (onClose) {
          onClose();
        }
      } else {
        throw new Error('Failed to generate mindmap structure');
      }
    } catch (err) {
      console.error('Error generating mindmap:', err);
      setMindmapState(prev => ({
        ...prev,
        generationError: `Failed to generate mindmap: ${err.message}`,
        isGenerating: false
      }));
    }
  };

  const handleInputChange = (field) => (e) => {
    setMindmapState(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <div className="create-mindmap-container">
      <div className="mindmap-header">
        <h2>Create New Mindmap</h2>
        <button onClick={resetMindmap} className="reset-button">
          <span className="tool-icon">🔄</span>
          Reset
        </button>
      </div>
      
      {mindmapState.error && (
        <div className="error-message">{mindmapState.error}</div>
      )}
      
      <div className="generation-method-selector">
        <div className="method-label">Generation Method:</div>
        <div className="method-options">
          <label className="method-option">
            <input
              type="radio"
              name="generationMethod"
              value="manual"
              checked={mindmapState.generationMethod === 'manual'}
              onChange={() => setMindmapState(prev => ({
                ...prev,
                generationMethod: 'manual'
              }))}
            />
            <span>Manual</span>
            <small>(provide keywords)</small>
          </label>
          
          <label className="method-option">
            <input
              type="radio"
              name="generationMethod"
              value="auto"
              checked={mindmapState.generationMethod === 'auto'}
              onChange={() => setMindmapState(prev => ({
                ...prev,
                generationMethod: 'auto'
              }))}
            />
            <span>Automatic</span>
            <small>(generate from text)</small>
          </label>
        </div>
      </div>

      {mindmapState.generationError && (
        <div className="error-message">{mindmapState.generationError}</div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title (Required)</label>
          <input
            type="text"
            id="title"
            value={mindmapState.title || ''}
            onChange={handleInputChange('title')}
            placeholder="Enter mindmap title"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            value={mindmapState.description || ''}
            onChange={handleInputChange('description')}
            placeholder="Brief description of your mindmap"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="mainText">Main Text Content</label>
          <textarea
            id="mainText"
            value={mindmapState.mainText || ''}
            onChange={handleInputChange('mainText')}
            placeholder="Paste the main text you want to visualize in the mindmap"
            rows={5}
          />
        </div>
        
        {mindmapState.generationMethod === 'manual' && (
          <div className="form-group">
            <label htmlFor="keywords">Keywords (comma-separated)</label>
            <input
              type="text"
              id="keywords"
              value={mindmapState.keywords || ''}
              onChange={handleInputChange('keywords')}
              placeholder="e.g., machine learning, algorithms, data science"
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            type="text"
            id="tags"
            value={mindmapState.tags || ''}
            onChange={handleInputChange('tags')}
            placeholder="e.g., study, work, important"
          />
        </div>
        
        <div className="form-actions">
          {mindmapState.generationMethod === 'manual' ? (
            <button 
              type="submit"
              className="primary-button"
              disabled={mindmapState.isProcessing}
            >
              {mindmapState.isProcessing ? (
                <>
                  <span className="spinner"></span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="tool-icon">📝</span>
                  Create Mindmap
                </>
              )}
            </button>
          ) : (
            <button 
              type="button"
              onClick={generateMindmapFromText} 
              className="primary-button auto-generate"
              disabled={mindmapState.isGenerating || !mindmapState.mainText?.trim()}
            >
              {mindmapState.isGenerating ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="tool-icon">🤖</span>
                  Generate Mindmap from Text
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateMindmap; 