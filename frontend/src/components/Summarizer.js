import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Summarizer.css';

const Summarizer = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [error, setError] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(0.5);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [copyStatus, setCopyStatus] = useState('');
  const { token, currentUser } = useAuth();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const speechSynthesisRef = useRef(null);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (token && currentUser) {
      fetchAvailableModels();
    } else {
      setIsLoadingModels(false);
      setAvailableModels([]);
      setSelectedModel('');
    }
  }, [token, currentUser]);

  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchAvailableModels = async () => {
    setIsLoadingModels(true);
    setError('');

    if (!token) {
      console.error('No authentication token available');
      setError('Please log in to access the summarizer');
      setIsLoadingModels(false);
      return;
    }

    try {
      const requestConfig = {
        method: 'GET',
        headers: {
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const response = await fetch('http://localhost:8000/summarizer/models', requestConfig);
      
      if (response.status === 401) {
        setError('Your session has expired. Please log in again.');
        setIsLoadingModels(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch available models');
      }
      
      const models = await response.json();
      
      if (!Array.isArray(models) || models.length === 0) {
        console.warn('No models available for your subscription tier');
        setError('No summarization models are available for your subscription tier');
        setAvailableModels([]);
      } else {
        setAvailableModels(models);
        setSelectedModel(models[0].id);
        setError('');
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err.message || 'Failed to load available models');
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSummarize = async () => {
    if (!text.trim() || !selectedModel) {
      setError('Please enter text and select a model to summarize.');
      return;
    }

    setError('');
    setIsLoading(true);
    setSummary('');

    try {
      const response = await fetch('http://localhost:8000/summarizer/', {
        method: 'POST',
        headers: {
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: text.trim(),
          compression_ratio: compressionLevel,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate summary');
      }

      const result = await response.json();
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

  const handleSpeak = async () => {
    if (!summary) return;

    try {
      if (isSpeaking && isPaused) {
        // Resume paused speech
        window.speechSynthesis.resume();
        setIsPaused(false);
        return;
      }

      if (isSpeaking) {
        // Pause ongoing speech
        window.speechSynthesis.pause();
        setIsPaused(true);
        return;
      }

      // Start new speech
      window.speechSynthesis.cancel(); // Cancel any previous speech
      const utterance = new SpeechSynthesisUtterance(summary);
      utteranceRef.current = utterance;
      speechSynthesisRef.current = window.speechSynthesis;

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        speechSynthesisRef.current = null;
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setError('Failed to play speech. Please try again.');
        setIsSpeaking(false);
        setIsPaused(false);
        speechSynthesisRef.current = null;
        utteranceRef.current = null;
      };

      setIsSpeaking(true);
      setIsPaused(false);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Text-to-speech error:', err);
      setError('Failed to initialize speech synthesis');
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  return (
    <div className="summarizer-container">
      <div className="summarizer-header">
        <h2>AI Text Summarizer</h2>
        <div className="subscription-badge">
          <span className={`tier-badge ${currentUser?.subscription_tier}`}>
            {currentUser?.subscription_tier === 'corporate' ? '💼 Corporate' : '👤 Personal'} Tier
          </span>
        </div>
      </div>

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
          <div className="model-control">
            <label className="model-label">Select Model:</label>
            {isLoadingModels ? (
              <div className="model-loading">
                <span className="spinner"></span>
                Loading models...
              </div>
            ) : (
              <>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="model-select"
                  disabled={isLoadingModels}
                >
                  <option value="">Select a model</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
                <small className="model-info">
                  {currentUser?.subscription_tier === 'corporate' 
                    ? 'You have access to all advanced AI models'
                    : 'Upgrade to corporate tier for access to advanced models'}
                </small>
              </>
            )}
          </div>

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
            disabled={isLoading || !text.trim() || !selectedModel || isLoadingModels}
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
            <div className="summary-actions">
              <button
                onClick={handleSpeak}
                disabled={!summary}
                className="summarizer-button secondary"
                title={isSpeaking ? (isPaused ? 'Resume' : 'Pause') : 'Listen to summary'}
              >
                {isSpeaking ? (
                  isPaused ? '▶️ Resume' : '⏸️ Pause'
                ) : '🔊 Listen'}
              </button>
              <button
                onClick={handleCopy}
                className={`summarizer-button secondary ${copyStatus ? 'copied' : ''}`}
              >
                {copyStatus || 'Copy'}
              </button>
            </div>
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
