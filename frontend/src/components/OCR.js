import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './OCR.css';

const OCR = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('eng');
  const [confidence, setConfidence] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const { token } = useAuth();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);

      // Clean up the URL when component unmounts
      return () => URL.revokeObjectURL(url);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setError('Please select an image to scan');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCopyStatus('');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('language', language);

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
      setExtractedText(data.text);
      setConfidence(data.confidence);

      // Focus the textarea after text is extracted
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
        }
      }, 100);
    } catch (err) {
      setError(err.message);
      console.error('OCR error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;

    try {
      await navigator.clipboard.writeText(extractedText);
      setCopyStatus('Copied!');

      // Reset copy status after 2 seconds
      setTimeout(() => {
        setCopyStatus('');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setCopyStatus('Failed to copy');
    }
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
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
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
        {previewUrl ? (
          <div className="file-preview-container">
            <img src={previewUrl} alt="Preview" className="file-preview-image" />
            <p className="file-name">{selectedFile?.name}</p>
          </div>
        ) : (
          <>
            <span className="tool-icon">📷</span>
            <p>Click or drag an image here to scan</p>
          </>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="ocr-actions">
        <button
          onClick={handleScan}
          disabled={loading || !selectedFile}
          className="scan-button"
        >
          {loading ? (
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

        {extractedText && (
          <button
            onClick={handleCopy}
            className={`copy-button ${copyStatus === 'Copied!' ? 'copied' : ''}`}
          >
            <span className="tool-icon">📋</span>
            {copyStatus || 'Copy Text'}
          </button>
        )}
      </div>

      {extractedText && (
        <div className="ocr-result">
          {confidence > 0 && (
            <div className="confidence-indicator">
              Confidence: {confidence.toFixed(1)}%
            </div>
          )}
          <textarea
            ref={textAreaRef}
            value={extractedText}
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
