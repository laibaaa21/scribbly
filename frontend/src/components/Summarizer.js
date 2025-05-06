import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { summarizeText } from '../utils/api';
import './Summarizer.css';

const Summarizer = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(0.5);
  const [summaryMethod, setSummaryMethod] = useState('abstractive');
  const [copyStatus, setCopyStatus] = useState('');
  const { token } = useAuth();

  const handleSummarize = async () => {
    if (!text.trim()) {
      setError('Please enter some text to summarize.');
      return;
    }

    setError('');
    setIsLoading(true);
    setSummary('');

    try {
      const result = await summarizeText(
        text.trim(),
        compressionLevel,
        summaryMethod,
        token
      );

      setSummary(result.summary);
    } catch (err) {
      console.error('Summarization error:', err);
      setError(err.message || 'Failed to summarize text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setCopyStatus('Failed to copy');
    }
  };

  return (
    <div className="summarizer-container">
      <h2>AI Text Summarizer</h2>
      <p className="model-info">
        Powered by BART Large CNN - State-of-the-art text summarization model
      </p>

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

          <div className="method-control">
            <label className="method-label">Summarization Method:</label>
            <div className="method-options">
              <label className="method-option">
                <input
                  type="radio"
                  name="summaryMethod"
                  value="extractive"
                  checked={summaryMethod === 'extractive'}
                  onChange={() => setSummaryMethod('extractive')}
                />
                <span>Extractive</span>
                <small>(selects key sentences)</small>
              </label>

              <label className="method-option">
                <input
                  type="radio"
                  name="summaryMethod"
                  value="abstractive"
                  checked={summaryMethod === 'abstractive'}
                  onChange={() => setSummaryMethod('abstractive')}
                />
                <span>Abstractive</span>
                <small>(generates new text)</small>
              </label>
            </div>
          </div>

          <button
            onClick={handleSummarize}
            disabled={isLoading || !text.trim()}
            className="summarizer-button primary"
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Summarizing...
              </>
            ) : (
              'Summarize'
            )}
          </button>
        </div>
      </div>

      {summary && (
        <div className="summary-result">
          <div className="summary-header">
            <h3>Summary</h3>
            <button
              onClick={handleCopy}
              className={`summarizer-button secondary ${copyStatus ? 'copied' : ''}`}
            >
              {copyStatus || 'Copy'}
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
