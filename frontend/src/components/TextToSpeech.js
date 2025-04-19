import React, { useState } from 'react';

const TextToSpeech = () => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const handleTextToSpeech = async () => {
    if (!text) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tts-container">
      <h2>Text to Speech Converter</h2>
      <div className="tts-input-container">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="tts-textarea"
        />
        <button 
          onClick={handleTextToSpeech}
          disabled={isLoading || !text}
          className="tts-button"
        >
          {isLoading ? 'Converting...' : 'Convert to Speech'}
        </button>
      </div>
      {audioUrl && (
        <div className="audio-player">
          <audio controls src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default TextToSpeech;
