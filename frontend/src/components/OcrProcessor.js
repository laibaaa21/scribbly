import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { processOcrImage } from '../utils/api';
import './OCR.css';

const OcrProcessor = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('eng');
  const [copyStatus, setCopyStatus] = useState('');
  
  const { token } = useAuth();
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }
    
    // Create a preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
    
    setSelectedFile(file);
    setResult(null);
    setError('');
  };
  
  const handleProcessImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Starting OCR processing with:', {
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        fileName: selectedFile.name,
        language
      });
      
      const data = await processOcrImage(selectedFile, language, token);
      setResult(data);
      
    } catch (error) {
      console.error('OCR processing error details:', error);
      const errorMessage = error.message || 'Error processing image';
      setError(`Error processing image: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopy = async () => {
    if (!result?.text) return;
    
    try {
      // Use a fallback method if navigator.clipboard is not available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(result.text);
        setCopyStatus('Copied!');
      } else {
        // Fallback method using a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = result.text;
        textArea.style.position = 'fixed';  // Avoid scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopyStatus('Copied!');
        } else {
          setCopyStatus('Failed to copy');
        }
      }
      
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setCopyStatus('Failed to copy');
      console.error('Copy failed:', err);
    }
  };
  
  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError('');
    setCopyStatus('');
  };
  
  return (
    <div className="ocr-container">
      <h2>OCR Image Processing</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="ocr-upload-section">
        <label className="file-upload-label">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="file-input"
          />
          <span className="upload-button">Choose Image</span>
        </label>
        
        <div className="language-selector">
          <label htmlFor="language">OCR Language:</label>
          <select 
            id="language" 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            title="Select the language of text in your image for better recognition accuracy"
          >
            <option value="eng">English</option>
            <option value="fra">French</option>
            <option value="deu">German</option>
            <option value="spa">Spanish</option>
            <option value="ita">Italian</option>
          </select>
          <small className="language-hint">
            Selecting the correct language improves text recognition quality
          </small>
        </div>
      </div>
      
      {previewUrl && (
        <div className="image-preview-container">
          <h3>Image Preview</h3>
          <img src={previewUrl} alt="Preview" className="image-preview" />
          
          <div className="ocr-actions">
            <button 
              onClick={handleProcessImage} 
              className="btn process-btn" 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Process Image'}
            </button>
            <button 
              onClick={handleClear} 
              className="btn clear-btn"
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
      {result && (
        <div className="ocr-result">
          <h3>Extracted Text</h3>
          <div className="text-confidence">
            Confidence: {result.confidence.toFixed(2)}%
          </div>
          <div className="extracted-text">
            {result.text || 'No text detected'}
          </div>
          <button 
            onClick={handleCopy}
            className="btn copy-btn"
          >
            {copyStatus || 'Copy Text'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OcrProcessor; 