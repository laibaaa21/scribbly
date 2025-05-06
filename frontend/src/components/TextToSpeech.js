import React, { useState, useEffect, useRef } from 'react';
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
  const [progress, setProgress] = useState(0);
  
  // For tracking chunks
  const textChunksRef = useRef([]);
  const currentChunkRef = useRef(0);
  const speechSynthesisRef = useRef(window.speechSynthesis);
  // Track the current utterance to be able to cancel it specifically
  const currentUtteranceRef = useRef(null);

  // Safari has a known issue with speech synthesis - detect it
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

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
        // Find a good default voice - prefer native voices
        const defaultVoice = availableVoices.find(v => 
          v.localService && (v.lang.startsWith('en-') || v.lang === 'en')
        ) || availableVoices[0];
        
        setVoice(defaultVoice.name);
      }
    };

    // Chrome needs an event listener for getVoices
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Initial load attempt
    loadVoices();
    
    // Implement a speech synthesis reset workaround for long texts
    // Chrome and some browsers have a bug where they stop after ~15 seconds
    const intervalId = setInterval(() => {
      if (isSpeaking && !isPaused) {
        // This forces the speech synthesis to continue
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000); // Every 10 seconds
    
    // Cleanup
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      clearInterval(intervalId);
    };
  }, [isSpeaking, isPaused]);

  // Function to split text into manageable chunks
  const prepareTextChunks = (text) => {
    // Break text into smaller chunks to avoid SpeechSynthesis limits
    // Most browsers have trouble with utterances longer than a certain length
    const maxChunkLength = isSafari ? 100 : 160; // Even smaller for Safari
    let chunks = [];
    
    if (text.length > maxChunkLength) {
      // First try to split by sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      
      if (sentences.length > 0) {
        let currentChunk = "";
        
        sentences.forEach(sentence => {
          // If the sentence itself is too long, we need to split it
          if (sentence.length > maxChunkLength) {
            // If we have accumulated content in the current chunk, add it first
            if (currentChunk) {
              chunks.push(currentChunk.trim());
              currentChunk = "";
            }
            
            // Split the long sentence by commas, semicolons, or other reasonable breaks
            const parts = sentence.split(/([,;:])/);
            let partChunk = "";
            
            for (let i = 0; i < parts.length; i++) {
              if (partChunk.length + parts[i].length > maxChunkLength) {
                chunks.push(partChunk.trim());
                partChunk = parts[i];
              } else {
                partChunk += parts[i];
              }
            }
            
            if (partChunk) {
              chunks.push(partChunk.trim());
            }
          }
          // If adding this sentence would make the chunk too long, start a new chunk
          else if (currentChunk.length + sentence.length > maxChunkLength) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += sentence;
          }
        });
        
        // Add any remaining content
        if (currentChunk) chunks.push(currentChunk.trim());
      } else {
        // If no sentence boundaries, fall back to splitting by words
        const words = text.split(' ');
        let currentChunk = "";
        
        words.forEach(word => {
          if (currentChunk.length + word.length + 1 > maxChunkLength) {
            chunks.push(currentChunk.trim());
            currentChunk = word + ' ';
          } else {
            currentChunk += word + ' ';
          }
        });
        
        if (currentChunk) chunks.push(currentChunk.trim());
      }
    } else {
      chunks.push(text);
    }
    
    return chunks;
  };

  // Function to speak the next chunk
  const speakNextChunk = () => {
    if (currentChunkRef.current >= textChunksRef.current.length) {
      // All chunks have been spoken
      setIsSpeaking(false);
      setProgress(100);
      return;
    }
    
    // Update progress indicator
    setProgress(Math.round((currentChunkRef.current / textChunksRef.current.length) * 100));
    
    const chunk = textChunksRef.current[currentChunkRef.current];
    const utterance = new SpeechSynthesisUtterance(chunk);
    
    // Store reference to current utterance for cancellation
    currentUtteranceRef.current = utterance;
    
    // Set speech properties
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    // Set the selected voice
    try {
      if (voice) {
        const selectedVoice = voices.find(v => v.name === voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
    } catch (err) {
      console.error("Error setting voice:", err);
    }
    
    // Handle events
    utterance.onend = () => {
      console.log("Speech segment completed");
      // Clear current utterance reference once it's done
      currentUtteranceRef.current = null;
      
      // Don't proceed if we've manually stopped or paused
      if (!isSpeaking || isPaused) return;
      
      // Move to next chunk immediately without delay
      currentChunkRef.current++;
      if (currentChunkRef.current < textChunksRef.current.length && isSpeaking && !isPaused) {
        // Speak the next chunk only if we're still in speaking mode
        speakNextChunk();
      } else if (currentChunkRef.current >= textChunksRef.current.length) {
        // All chunks complete
        setIsSpeaking(false);
        setIsPaused(false);
        setProgress(100);
      }
    };
    
    utterance.onerror = (err) => {
      console.error("Speech synthesis error:", err);
      // Clear current utterance reference on error
      currentUtteranceRef.current = null;
      
      // Try to continue despite errors if we're still in speaking mode
      if (isSpeaking && !isPaused) {
        currentChunkRef.current++;
        if (currentChunkRef.current < textChunksRef.current.length) {
          setError(`Error with speech segment. Attempting to continue...`);
          setTimeout(speakNextChunk, 500);
        } else {
          setError(`Speech error: ${err.error || 'Unknown error'}`);
          setIsSpeaking(false);
          setProgress(100);
        }
      }
    };
    
    // Add start callback to update UI when speech actually starts
    utterance.onstart = () => {
      console.log("Speech started");
    };
    
    // Speak
    try {
      console.log("Speaking chunk:", chunk);
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Failed to speak:", err);
      setError("Failed to start speech. Try a different browser or voice.");
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    }
  };

  const handleSpeak = () => {
    if (!text.trim()) {
      setError('Please enter some text to speak.');
      return;
    }

    console.log("Starting speech synthesis");
    setError('');
    setProgress(0);

    // Make sure speech synthesis is available
    if (!('speechSynthesis' in window)) {
      setError('Your browser does not support speech synthesis.');
      return;
    }

    try {
      // Cancel any ongoing speech completely
      handleStop();
      
      // Reset chunk tracking
      currentChunkRef.current = 0;
      
      // Prepare text chunks - if text is very short, use it directly
      const chunks = text.length < 50 ? [text] : prepareTextChunks(text);
      console.log(`Prepared ${chunks.length} chunks for speech`);
      textChunksRef.current = chunks;
      
      setIsSpeaking(true);
      setIsPaused(false);
      
      // Start speaking the first chunk
      speakNextChunk();
    } catch (err) {
      console.error("Error initializing speech:", err);
      setError(`Speech initialization error: ${err.message}`);
      setIsSpeaking(false);
    }
  };

  const handlePause = () => {
    if (!('speechSynthesis' in window)) {
      setError('Your browser does not support speech synthesis.');
      return;
    }
    
    try {
      if (isPaused) {
        console.log("Resuming speech");
        window.speechSynthesis.resume();
        // Only resume speaking if we have a current chunk
        if (currentChunkRef.current < textChunksRef.current.length) {
          // If there's no active utterance, start speaking the next chunk
          if (!currentUtteranceRef.current) {
            speakNextChunk();
          }
        }
      } else {
        console.log("Pausing speech");
        // Immediately pause any ongoing speech
        window.speechSynthesis.pause();
        // Additional call to cancel to ensure immediate silence in some browsers
        if (window.speechSynthesis.speaking) {
          // Only cancel if something is actually speaking
          window.speechSynthesis.cancel();
        }
        // But keep the current state so we can resume
        currentUtteranceRef.current = null;
      }
      setIsPaused(!isPaused);
    } catch (err) {
      console.error("Error toggling pause state:", err);
      setError(`Speech control error: ${err.message}`);
    }
  };

  const handleStop = () => {
    if (!('speechSynthesis' in window)) {
      return;
    }
    
    try {
      console.log("Stopping speech");
      // Cancel all speech immediately
      window.speechSynthesis.cancel();
      
      // Clear the current utterance reference
      currentUtteranceRef.current = null;
      
      // Reset state
      setIsSpeaking(false);
      setIsPaused(false);
      currentChunkRef.current = 0;
      setProgress(0);
    } catch (err) {
      console.error("Error stopping speech:", err);
    }
  };

  // Filter to only include voices that are likely to work well
  const filteredVoices = voices.filter(v => 
    // Keep voices that have a language code
    v.lang && 
    // Exclude voices known to cause problems
    !v.name.includes("Zira")
  );

  // Test a voice with a short sample
  const handleTestVoice = () => {
    if (window.speechSynthesis) {
      try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        currentUtteranceRef.current = null;
        
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
        
        {isSpeaking && (
          <div className="tts-progress-container">
            <div className="tts-progress-bar">
              <div 
                className="tts-progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="tts-progress-text">
              {progress}% completed
            </div>
          </div>
        )}
        
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
        
        {isSpeaking && (
          <div className="tts-info">
            <p>Reading longer texts (2-3 pages) is supported. If speech stops unexpectedly, try using pause/resume.</p>
            <p>Tip: Some voices and browsers handle long text better than others. Try different voices if needed.</p>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .tts-progress-container {
          margin: 20px 0;
          width: 100%;
        }
        
        .tts-progress-bar {
          height: 15px;
          background-color: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .tts-progress-fill {
          height: 100%;
          background-color: #61dafb;
          transition: width 0.3s ease;
        }
        
        .tts-progress-text {
          text-align: center;
          margin-top: 5px;
          font-size: 14px;
          color: #666;
        }
        
        .tts-info {
          margin-top: 20px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
          font-size: 14px;
          color: #555;
        }
        
        .tts-info p {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
};

export default TextToSpeech;
