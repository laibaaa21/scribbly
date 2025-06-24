import React, { useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAITools } from '../contexts/AIToolsContext';
import './OCR.css';

const OCR = ({ onClose }) => {
  const { token } = useAuth();
  const {
    ocrState,
    setOcrState,
    resetOcr
  } = useAITools();

  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setOcrState(prev => ({ ...prev, error: 'Please select an image file' }));
        return;
      }
      const url = URL.createObjectURL(file);
      setOcrState(prev => ({
        ...prev,
        image: file,
        imagePreview: url,
        error: null
      }));

      // Clean up the URL when component unmounts
      return () => URL.revokeObjectURL(url);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setOcrState(prev => ({ ...prev, error: 'Please select an image file' }));
        return;
      }
      const url = URL.createObjectURL(file);
      setOcrState(prev => ({
        ...prev,
        image: file,
        imagePreview: url,
        error: null
      }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleScan = async () => {
    if (!ocrState.image) {
      setOcrState(prev => ({ ...prev, error: 'Please select an image to scan' }));
      return;
    }

    try {
      setOcrState(prev => ({
        ...prev,
        isProcessing: true,
        error: null,
        copyStatus: ''
      }));

      const formData = new FormData();
      formData.append('file', ocrState.image);
      formData.append('language', ocrState.language || 'eng');

      const response = await fetch('http://localhost:5000/api/ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process image');
      }

      const data = await response.json();
      setOcrState(prev => ({
        ...prev,
        extractedText: data.text,
        confidence: data.confidence,
        isProcessing: false
      }));

      // Focus the textarea after text is extracted
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
        }
      }, 100);
    } catch (err) {
      setOcrState(prev => ({
        ...prev,
        error: err.message,
        isProcessing: false
      }));
      console.error('OCR error:', err);
    }
  };

  const handleCopy = async () => {
    if (!ocrState.extractedText) return;

    try {
      await navigator.clipboard.writeText(ocrState.extractedText);
      setOcrState(prev => ({ ...prev, copyStatus: 'Copied!' }));

      // Reset copy status after 2 seconds
      setTimeout(() => {
        setOcrState(prev => ({ ...prev, copyStatus: '' }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setOcrState(prev => ({ ...prev, copyStatus: 'Failed to copy' }));
    }
  };

  const handleLanguageChange = (e) => {
    setOcrState(prev => ({ ...prev, language: e.target.value }));
  };

  return (
    <div className="tool-form">
      <div className="language-selector">
        <div className="language-hint">
          Select the language of text in your image for better recognition
        </div>
        <div className="language-select-container">
          <label htmlFor="language">OCR Language:</label>
          <select
            id="language"
            value={ocrState.language || 'eng'}
            onChange={handleLanguageChange}
            className="language-select"
          >
            <option value="eng">English</option>
            <option value="fra">French</option>
            <option value="deu">German</option>
            <option value="spa">Spanish</option>
            <option value="ita">Italian</option>
          </select>
        </div>
      </div>

      <div
        className="file-upload-area"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        {ocrState.imagePreview ? (
          <div className="file-preview-container">
            <img src={ocrState.imagePreview} alt="Preview" className="file-preview-image" />
            <p className="file-name">{ocrState.image?.name}</p>
          </div>
        ) : (
          <>
            <span className="tool-icon">📷</span>
            <p>Click or drag an image here to scan</p>
          </>
        )}
      </div>

      {ocrState.error && <div className="error-message">{ocrState.error}</div>}

      <div className="ocr-actions">
        <button
          onClick={handleScan}
          disabled={ocrState.isProcessing || !ocrState.image}
          className="scan-button"
        >
          {ocrState.isProcessing ? (
            <>
              <span className="spinner"></span>
              Scanning...
            </>
          ) : (
            <>
              <span className="tool-icon">🔍</span>
              Extract Text
            </>
          )}
        </button>

        {ocrState.extractedText && (
          <>
            <button
              onClick={handleCopy}
              className={`copy-button ${ocrState.copyStatus === 'Copied!' ? 'copied' : ''}`}
            >
              <span className="tool-icon">📋</span>
              {ocrState.copyStatus || 'Copy Text'}
            </button>

            <button
              onClick={resetOcr}
              className="reset-button"
            >
              <span className="tool-icon">🔄</span>
              Reset
            </button>
          </>
        )}
      </div>

      {ocrState.extractedText && (
        <div className="ocr-result">
          {ocrState.confidence > 0 && (
            <div className="confidence-indicator">
              Confidence: {ocrState.confidence.toFixed(1)}%
            </div>
          )}
          <textarea
            ref={textAreaRef}
            value={ocrState.extractedText}
            readOnly
            placeholder="Extracted text will appear here..."
            className="extracted-text"
          />
        </div>
      )}
    </div>
  );
};

export default OCR;
