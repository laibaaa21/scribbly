import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { summarizeText } from '../utils/api';
import './Summarizer.css';

const Summarizer = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(0.5);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [copyStatus, setCopyStatus] = useState('');
  const { token, currentUser } = useAuth();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthesisRef = useRef(null);

  useEffect(() => {
    if (token && currentUser) {
      fetchAvailableModels();
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
    if (!token) {
      console.error('No authentication token available');
      setError('Please log in to access the summarizer');
      return;
    }

    try {
      const requestConfig = {
        method: 'GET',
        headers: {
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'include'
      };

      const response = await fetch('http://localhost:8000/models/available', requestConfig);
      
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Authentication failed. Server response:', errorData);
        setError('Your session has expired. Please log in again.');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Failed to fetch available models');
      }
      
      const models = await response.json();
      console.log('Available models:', models);
      
      if (!Array.isArray(models) || models.length === 0) {
        console.warn('No models available for your subscription tier');
        setError('No summarization models are available for your subscription tier');
        return;
      }
      
      setAvailableModels(models);
      setSelectedModel(models[0].id);
      setError('');
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err.message || 'Failed to load available models');
    }
  };

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
        selectedModel,
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

  const handleSpeak = async () => {
    if (!summary) return;

    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(summary);
      speechSynthesisRef.current = utterance;

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setError('Failed to play speech. Please try again.');
        setIsSpeaking(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        speechSynthesisRef.current = null;
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Text-to-speech error:', err);
      setError('Failed to initialize speech synthesis');
      setIsSpeaking(false);
    }
  };

  return (
    <div className="summarizer-container">
      <h2>AI Text Summarizer</h2>
      <p className="model-info">
        {currentUser?.subscription_tier === 'corporate' 
          ? 'Corporate tier - Access to all models'
          : 'Personal tier - Access to basic models'}
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
          <div className="model-control">
            <label className="model-label">Select Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="model-select"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
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
            <div className="summary-actions">
              <button
                onClick={handleSpeak}
                disabled={isSpeaking}
                className="summarizer-button secondary"
                title={isSpeaking ? 'Speaking...' : 'Listen to summary'}
              >
                {isSpeaking ? 'Speaking...' : '🔊 Listen'}
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
