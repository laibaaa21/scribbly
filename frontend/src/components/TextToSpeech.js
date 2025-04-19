import React, { useState, useEffect } from 'react';
import './TextToSpeech.css';

const TextToSpeech = () => {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [voice, setVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [error, setError] = useState('');

  // Initialize and get available voices
  useEffect(() => {
    if (!window.speechSynthesis) {
      setError('Your browser does not support speech synthesis.');
      return;
    }

    // Function to load voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        setVoice(availableVoices[0].name);
      }
    };

    // Chrome needs an event listener for getVoices
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Initial load attempt
    loadVoices();
    
    // Cleanup
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (!text.trim()) {
      setError('Please enter some text to speak.');
      return;
    }

    setError('');

    if (window.speechSynthesis) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Break text into smaller chunks if very long (helps with compatibility)
      const maxChunkLength = 200;
      const textChunks = [];
      
      if (text.length > maxChunkLength) {
        // Break text at sentence boundaries if possible
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        let currentChunk = "";
        
        sentences.forEach(sentence => {
          if (currentChunk.length + sentence.length < maxChunkLength) {
            currentChunk += sentence;
          } else {
            if (currentChunk) textChunks.push(currentChunk);
            currentChunk = sentence;
          }
        });
        
        if (currentChunk) textChunks.push(currentChunk);
      } else {
        textChunks.push(text);
      }
      
      // If we have multiple chunks, only use the first one for now
      // In a more advanced implementation, you could queue these up
      const currentText = textChunks[0];
      
      const utterance = new SpeechSynthesisUtterance(currentText);
      
      // Set speech properties
      utterance.rate = rate;
      utterance.pitch = pitch;
      
      // Set the selected voice with error handling
      try {
        if (voice) {
          const selectedVoice = voices.find(v => v.name === voice);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }
      } catch (err) {
        console.error("Error setting voice:", err);
        // Continue with default voice if there's an error
      }
      
      // Handle events
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = (err) => {
        console.error("Speech synthesis error:", err);
        // Show a more user-friendly error message
        setError("Speech error occurred. Try a different voice or shorter text.");
        setIsSpeaking(false);
        setIsPaused(false);
      };
      
      // Speak
      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Speech synthesis speak error:", err);
        setError("Failed to start speech. Try a different browser or voice.");
        setIsSpeaking(false);
      }
    } else {
      setError('Your browser does not support speech synthesis.');
    }
  };

  const handlePause = () => {
    if (window.speechSynthesis) {
      if (isPaused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // Filter to only include voices that are likely to work well
  const filteredVoices = voices.filter(v => 
    // Keep voices that have a language code
    v.lang && 
    // Exclude voices known to cause problems (can customize this list)
    !v.name.includes("Zira")
  );

  // Test a voice with a short sample
  const handleTestVoice = () => {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        
        const testUtterance = new SpeechSynthesisUtterance("This is a test.");
        testUtterance.rate = rate;
        testUtterance.pitch = pitch;
        
        const selectedVoice = voices.find(v => v.name === voice);
        if (selectedVoice) {
          testUtterance.voice = selectedVoice;
        }
        
        window.speechSynthesis.speak(testUtterance);
      } catch (err) {
        console.error("Test voice error:", err);
        setError("Could not test this voice. Try another one.");
      }
    }
  };

  return (
    <div className="tts-container">
      <h2>Text to Speech Converter</h2>
      
      {error && <div className="tts-error">{error}</div>}
      
      <div className="tts-input-container">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="tts-textarea"
          rows={8}
        />
        
        <div className="tts-controls">
          <div className="tts-control-item">
            <label htmlFor="voice-select">Voice:</label>
            <div className="voice-selection-container">
              <select
                id="voice-select"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="tts-select"
              >
                {filteredVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <button 
                onClick={handleTestVoice}
                className="tts-button test-button"
                type="button"
              >
                Test
              </button>
            </div>
          </div>
          
          <div className="tts-control-item">
            <label htmlFor="rate-range">Rate:</label>
            <div className="tts-range-container">
              <span className="tts-range-label">{rate.toFixed(1)}</span>
              <input
                id="rate-range"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="tts-range"
              />
            </div>
          </div>
          
          <div className="tts-control-item">
            <label htmlFor="pitch-range">Pitch:</label>
            <div className="tts-range-container">
              <span className="tts-range-label">{pitch.toFixed(1)}</span>
              <input
                id="pitch-range"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="tts-range"
              />
            </div>
          </div>
        </div>
        
        <div className="tts-buttons">
          <button 
            onClick={handleSpeak}
            disabled={isSpeaking && !isPaused}
            className="tts-button primary"
          >
            {isSpeaking && !isPaused ? 'Speaking...' : 'Speak'}
          </button>
          
          {isSpeaking && (
            <>
              <button 
                onClick={handlePause}
                className="tts-button secondary"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              
              <button 
                onClick={handleStop}
                className="tts-button danger"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;
