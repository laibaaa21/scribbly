import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAITools } from '../contexts/AIToolsContext';
import './Summarizer.css';

const Summarizer = () => {
  const { token, currentUser } = useAuth();
  const {
    summarizerState,
    setSummarizerState,
    resetSummarizer
  } = useAITools();

  const speechSynthesisRef = useRef(null);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (token && currentUser) {
      fetchAvailableModels();
    } else {
      setSummarizerState(prev => ({
        ...prev,
        isLoadingModels: false,
        availableModels: [],
        selectedModel: ''
      }));
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
    setSummarizerState(prev => ({
      ...prev,
      isLoadingModels: true,
      error: ''
    }));

    if (!token) {
      console.error('No authentication token available');
      setSummarizerState(prev => ({
        ...prev,
        error: 'Please log in to access the summarizer',
        isLoadingModels: false
      }));
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
        setSummarizerState(prev => ({
          ...prev,
          error: 'Your session has expired. Please log in again.',
          isLoadingModels: false
        }));
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch available models');
      }
      
      const models = await response.json();
      
      if (!Array.isArray(models) || models.length === 0) {
        console.warn('No models available for your subscription tier');
        setSummarizerState(prev => ({
          ...prev,
          error: 'No summarization models are available for your subscription tier',
          availableModels: [],
          isLoadingModels: false
        }));
      } else {
        setSummarizerState(prev => ({
          ...prev,
          availableModels: models,
          selectedModel: models[0].id,
          error: '',
          isLoadingModels: false
        }));
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setSummarizerState(prev => ({
        ...prev,
        error: err.message || 'Failed to load available models',
        availableModels: [],
        isLoadingModels: false
      }));
    }
  };

  const handleSummarize = async () => {
    if (!summarizerState.inputText.trim() || !summarizerState.selectedModel) {
      setSummarizerState(prev => ({
        ...prev,
        error: 'Please enter text and select a model to summarize.'
      }));
      return;
    }

    setSummarizerState(prev => ({
      ...prev,
      error: '',
      isProcessing: true,
      summary: ''
    }));

    try {
      const response = await fetch('http://localhost:8000/summarizer/', {
        method: 'POST',
        headers: {
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: summarizerState.inputText.trim(),
          compression_ratio: summarizerState.compressionLevel || 0.5,
          model: summarizerState.selectedModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate summary');
      }

      const result = await response.json();
      setSummarizerState(prev => ({
        ...prev,
        summary: result.summary,
        isProcessing: false
      }));
    } catch (err) {
      console.error('Summarization error:', err);
      setSummarizerState(prev => ({
        ...prev,
        error: err.message || 'Failed to summarize text. Please try again.',
        isProcessing: false
      }));
    }
  };

  const handleCopy = async () => {
    if (!summarizerState.summary) return;

    try {
      await navigator.clipboard.writeText(summarizerState.summary);
      setSummarizerState(prev => ({ ...prev, copyStatus: 'Copied!' }));
      setTimeout(() => {
        setSummarizerState(prev => ({ ...prev, copyStatus: '' }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setSummarizerState(prev => ({ ...prev, copyStatus: 'Failed to copy' }));
    }
  };

  const handleSpeak = async () => {
    if (!summarizerState.summary) return;

    try {
      if (summarizerState.isSpeaking && summarizerState.isPaused) {
        // Resume paused speech
        window.speechSynthesis.resume();
        setSummarizerState(prev => ({ ...prev, isPaused: false }));
        return;
      }

      if (summarizerState.isSpeaking) {
        // Pause ongoing speech
        window.speechSynthesis.pause();
        setSummarizerState(prev => ({ ...prev, isPaused: true }));
        return;
      }

      // Start new speech
      window.speechSynthesis.cancel(); // Cancel any previous speech
      const utterance = new SpeechSynthesisUtterance(summarizerState.summary);
      utteranceRef.current = utterance;
      speechSynthesisRef.current = window.speechSynthesis;

      utterance.onend = () => {
        setSummarizerState(prev => ({
          ...prev,
          isSpeaking: false,
          isPaused: false
        }));
        speechSynthesisRef.current = null;
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setSummarizerState(prev => ({
          ...prev,
          error: 'Failed to play speech. Please try again.',
          isSpeaking: false,
          isPaused: false
        }));
        speechSynthesisRef.current = null;
        utteranceRef.current = null;
      };

      setSummarizerState(prev => ({
        ...prev,
        isSpeaking: true,
        isPaused: false
      }));
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Text-to-speech error:', err);
      setSummarizerState(prev => ({
        ...prev,
        error: 'Failed to initialize speech synthesis',
        isSpeaking: false,
        isPaused: false
      }));
    }
  };

  const handleInputChange = (e) => {
    setSummarizerState(prev => ({ ...prev, inputText: e.target.value }));
  };

  const handleModelChange = (e) => {
    setSummarizerState(prev => ({ ...prev, selectedModel: e.target.value }));
  };

  const handleCompressionChange = (e) => {
    setSummarizerState(prev => ({
      ...prev,
      compressionLevel: parseFloat(e.target.value)
    }));
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

      {summarizerState.error && (
        <div className="summarizer-error">{summarizerState.error}</div>
      )}

      <div className="summarizer-input-container">
        <textarea
          value={summarizerState.inputText}
          onChange={handleInputChange}
          placeholder="Enter text to summarize..."
          className="summarizer-textarea"
          rows={8}
        />

        <div className="summarizer-controls">
          <div className="model-control">
            <label className="model-label">Select Model:</label>
            {summarizerState.isLoadingModels ? (
              <div className="model-loading">
                <span className="spinner"></span>
                Loading models...
              </div>
            ) : (
              <>
                <select
                  value={summarizerState.selectedModel}
                  onChange={handleModelChange}
                  className="model-select"
                  disabled={summarizerState.isLoadingModels}
                >
                  <option value="">Select a model</option>
                  {summarizerState.availableModels?.map((model) => (
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
            <label>
              Compression Level:
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={summarizerState.compressionLevel || 0.5}
                onChange={handleCompressionChange}
                className="compression-slider"
              />
              <span>{(summarizerState.compressionLevel || 0.5) * 100}%</span>
            </label>
          </div>

          <div className="action-buttons">
            <button
              onClick={handleSummarize}
              disabled={summarizerState.isProcessing || !summarizerState.inputText.trim()}
              className="summarize-button"
            >
              {summarizerState.isProcessing ? (
                <>
                  <span className="spinner"></span>
                  Summarizing...
                </>
              ) : (
                <>
                  <span className="tool-icon">📝</span>
                  Summarize
                </>
              )}
            </button>

            <button onClick={resetSummarizer} className="reset-button">
              <span className="tool-icon">🔄</span>
              Reset
            </button>
          </div>
        </div>

        {summarizerState.summary && (
          <div className="summary-result">
            <div className="summary-header">
              <h3>Summary</h3>
              <div className="summary-actions">
                <button
                  onClick={handleCopy}
                  className={`copy-button ${summarizerState.copyStatus === 'Copied!' ? 'copied' : ''}`}
                >
                  <span className="tool-icon">📋</span>
                  {summarizerState.copyStatus || 'Copy'}
                </button>
                <button
                  onClick={handleSpeak}
                  className="speak-button"
                >
                  <span className="tool-icon">
                    {summarizerState.isSpeaking
                      ? summarizerState.isPaused ? '▶️' : '⏸️'
                      : '🔊'}
                  </span>
                  {summarizerState.isSpeaking
                    ? summarizerState.isPaused ? 'Resume' : 'Pause'
                    : 'Speak'}
                </button>
              </div>
            </div>
            <div className="summary-text">
              {summarizerState.summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summarizer;
