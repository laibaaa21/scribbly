import React, { useState } from 'react';

const Summarizer = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSummarize = async () => {
    if (!text) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="summarizer-container">
      <h2>Text Summarizer</h2>
      <div className="input-container">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to summarize..."
          className="text-input"
        />
        <button 
          onClick={handleSummarize}
          disabled={isLoading || !text}
          className="summarize-button"
        >
          {isLoading ? 'Summarizing...' : 'Summarize'}
        </button>
      </div>
      {summary && (
        <div className="summary-container">
          <h3>Summary:</h3>
          <div className="summary-text">{summary}</div>
        </div>
      )}
    </div>
  );
};

export default Summarizer;
