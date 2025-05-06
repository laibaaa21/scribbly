import React, { useState, useEffect, useRef } from 'react';
import './TextToSpeech.css';

const TextToSpeech = ({ onClose }) => {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [voice, setVoice] = useState('');
  const [voices, setVoices] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  // For tracking chunks
  const textChunksRef = useRef([]);
  const currentChunkRef = useRef(0);
  const speechSynthesisRef = useRef(window.speechSynthesis);
  const currentUtteranceRef = useRef(null);

  // Initialize and get available voices
  useEffect(() => {
    if (!window.speechSynthesis) {
      setError('Your browser does not support speech synthesis.');
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        // Filter out problematic voices
        const filteredVoices = availableVoices.filter(v =>
          v.lang && !v.name.includes("Zira")
        );
        setVoices(filteredVoices);

        // Set default voice
        const defaultVoice = filteredVoices.find(v =>
          v.localService && (v.lang.startsWith('en-') || v.lang === 'en')
        ) || filteredVoices[0];

        if (defaultVoice) {
          setVoice(defaultVoice.name);
        }
      }
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    // Reset workaround for Chrome
    const intervalId = setInterval(() => {
      if (isSpeaking && !isPaused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    return () => {
      window.speechSynthesis.cancel();
      clearInterval(intervalId);
    };
  }, [isSpeaking, isPaused]);

  const handleSpeak = () => {
    if (!text.trim()) {
      setError('Please enter some text to speak.');
      return;
    }

    if (!window.speechSynthesis) {
      setError('Your browser does not support speech synthesis.');
      return;
    }

    try {
      // Stop any ongoing speech
      handleStop();

      // Break text into smaller chunks if very long
      const maxChunkLength = 200;
      textChunksRef.current = [];
      currentChunkRef.current = 0;

      if (text.length > maxChunkLength) {
        // Break text at sentence boundaries
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        let currentChunk = "";

        sentences.forEach(sentence => {
          if (currentChunk.length + sentence.length < maxChunkLength) {
            currentChunk += sentence;
          } else {
            if (currentChunk) textChunksRef.current.push(currentChunk.trim());
            currentChunk = sentence;
          }
        });

        if (currentChunk) textChunksRef.current.push(currentChunk.trim());
      } else {
        textChunksRef.current.push(text);
      }

      // Start with the first chunk
      speakCurrentChunk();
    } catch (err) {
      console.error('Speech synthesis error:', err);
      setError('Failed to start speech. Please try again.');
    }
  };

  const speakCurrentChunk = () => {
    const currentChunk = textChunksRef.current[currentChunkRef.current];
    if (!currentChunk) return;

    const utterance = new SpeechSynthesisUtterance(currentChunk);
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Set selected voice
    if (voice) {
      const selectedVoice = voices.find(v => v.name === voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Handle events
    utterance.onstart = () => {
      setIsSpeaking(true);
      setProgress(0);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utterance.onend = () => {
      // Move to next chunk if available
      if (currentChunkRef.current < textChunksRef.current.length - 1) {
        currentChunkRef.current++;
        speakCurrentChunk();
      } else {
        setIsSpeaking(false);
        setIsPaused(false);
        setProgress(100);
        currentChunkRef.current = 0;
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setError('Error occurred while speaking. Please try again.');
      setIsSpeaking(false);
      setIsPaused(false);
    };

    // Update progress
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const totalChunks = textChunksRef.current.length;
        const chunkProgress = (currentChunkRef.current / totalChunks) * 100;
        const wordProgress = (event.charIndex / currentChunk.length) * (100 / totalChunks);
        setProgress(Math.min(Math.round(chunkProgress + wordProgress), 100));
      }
    };

    window.speechSynthesis.speak(utterance);
    currentUtteranceRef.current = utterance;
  };

  const handlePause = () => {
    if (!window.speechSynthesis) return;

    if (isPaused) {
      window.speechSynthesis.resume();
    } else {
      window.speechSynthesis.pause();
    }
  };

  const handleStop = () => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    currentUtteranceRef.current = null;
  };

  return (
    <div className="tts-container">
      <div className="tts-content">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="tts-textarea"
          rows={6}
        />

        {error && <div className="error-message">{error}</div>}

        <div className="tts-controls">
          <div className="tts-control-item">
            <label htmlFor="voice-select">Voice:</label>
            <select
              id="voice-select"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="tts-select"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div className="tts-control-item">
            <label htmlFor="rate-range">Speed: {rate.toFixed(1)}x</label>
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

          <div className="tts-control-item">
            <label htmlFor="pitch-range">Pitch: {pitch.toFixed(1)}</label>
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

        {isSpeaking && (
          <div className="tts-progress">
            <div className="tts-progress-bar">
              <div
                className="tts-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>{progress}%</span>
          </div>
        )}
      </div>

      <div className="tts-buttons">
        <button
          onClick={handleSpeak}
          disabled={!text.trim() || !voice}
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
  );
};

export default TextToSpeech;
