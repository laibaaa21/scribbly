import React, { useState } from 'react';
import './Summarizer.css';

const Summarizer = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(0.5);

  // Client-side algorithm to summarize text
  const summarizeText = (text, compressionRatio = 0.5) => {
    // Validate input
    if (!text || text.trim().length === 0) {
      return '';
    }

    // Basic text cleaning
    const cleanText = text
      .replace(/(\r\n|\n|\r)/gm, ' ') // Replace line breaks with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .trim();

    // Split text into sentences
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
    
    if (sentences.length <= 3) {
      return cleanText; // Text is already short enough
    }

    // Score sentences based on several factors
    const sentenceScores = sentences.map((sentence, index) => {
      // 1. Position score - sentences at the beginning and end are often more important
      const positionScore = 
        index < sentences.length * 0.2 || index > sentences.length * 0.8
          ? 1.5 
          : 1.0;
      
      // 2. Length score - penalize very short sentences
      const words = sentence.split(' ').filter(w => w.length > 0);
      const lengthScore = words.length > 5 ? 1.0 : 0.5;
      
      // 3. Word importance score - look for important signal words
      const importantWords = ['important', 'significant', 'crucial', 'essential', 'key', 
                             'major', 'primary', 'critical', 'fundamental', 'main',
                             'therefore', 'thus', 'consequently', 'hence', 'in conclusion',
                             'summary', 'ultimately', 'finally'];
      
      const lowerSentence = sentence.toLowerCase();
      const wordScore = importantWords.some(word => lowerSentence.includes(word)) ? 1.5 : 1.0;
      
      return {
        text: sentence.trim(),
        score: positionScore * lengthScore * wordScore,
        index
      };
    });
    
    // Sort sentences by score (highest first)
    const sortedSentences = [...sentenceScores].sort((a, b) => b.score - a.score);
    
    // Calculate how many sentences to keep based on compression ratio
    const sentencesToKeep = Math.max(1, Math.floor(sentences.length * compressionRatio));
    
    // Select the highest scoring sentences
    const selectedSentences = sortedSentences
      .slice(0, sentencesToKeep)
      // Sort back by original position
      .sort((a, b) => a.index - b.index)
      .map(s => s.text);
    
    // Join sentences back into a coherent summary
    return selectedSentences.join(' ');
  };

  const handleSummarize = () => {
    if (!text.trim()) {
      setError('Please enter some text to summarize.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    // Simulate API delay for better UX (optional)
    setTimeout(() => {
      try {
        const result = summarizeText(text, compressionLevel);
        setSummary(result);
      } catch (err) {
        console.error('Summarization error:', err);
        setError('Failed to summarize text. Please try again with different content.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleCopy = () => {
    if (!summary) return;
    
    navigator.clipboard.writeText(summary)
      .then(() => {
        // Show temporary "Copied!" message (could use a toast or other UI element)
        const copyBtn = document.getElementById('copy-summary-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
      });
  };

  return (
    <div className="summarizer-container">
      <h2>Text Summarizer</h2>
      
      {error && <div className="summarizer-error">{error}</div>}
      
      <div className="summarizer-input-container">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to summarize..."
          className="summarizer-textarea"
          rows={8}
        />
        
        <div className="summarizer-controls">
          <div className="compression-control">
            <label htmlFor="compression-range">
              Summary Length: {Math.round(compressionLevel * 100)}%
            </label>
            <input
              id="compression-range"
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={compressionLevel}
              onChange={(e) => setCompressionLevel(parseFloat(e.target.value))}
              className="summarizer-range"
            />
          </div>
          
          <button 
            onClick={handleSummarize}
            disabled={isLoading || !text.trim()}
            className="summarizer-button primary"
          >
            {isLoading ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
      </div>
      
      {summary && (
        <div className="summary-result">
          <div className="summary-header">
            <h3>Summary</h3>
            <button 
              id="copy-summary-btn"
              onClick={handleCopy}
              className="summarizer-button secondary"
            >
              Copy
            </button>
          </div>
          <div className="summary-content">
            {summary}
          </div>
        </div>
      )}
    </div>
  );
};

export default Summarizer;
