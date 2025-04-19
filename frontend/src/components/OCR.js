import React, { useState } from 'react';

const OCR = () => {
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const response = await fetch('http://localhost:8000/ocr', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        setText(data.text);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="feature-container">
      <div className="feature-main">
        <div className="file-upload">
          <h2>OCR - Convert Image to Text</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="file-input"
          />
        </div>
        {text && (
          <div className="result-container">
            <h3>Extracted Text:</h3>
            <div className="text-result">{text}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OCR;
