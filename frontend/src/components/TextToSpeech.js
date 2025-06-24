import React, { useEffect, useRef } from 'react';
import { useAITools } from '../contexts/AIToolsContext';
import './TextToSpeech.css';

const TextToSpeech = ({ onClose }) => {
  const {
    ttsState,
    setTtsState,
    resetTts
  } = useAITools();

  // For tracking chunks
  const textChunksRef = useRef([]);
  const currentChunkRef = useRef(0);
  const speechSynthesisRef = useRef(window.speechSynthesis);
  const currentUtteranceRef = useRef(null);

  // Initialize and get available voices
  useEffect(() => {
    if (!window.speechSynthesis) {
      setTtsState(prev => ({ ...prev, error: 'Your browser does not support speech synthesis.' }));
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        // Filter out problematic voices
        const filteredVoices = availableVoices.filter(v =>
          v.lang && !v.name.includes("Zira")
        );

        // Set default voice
        const defaultVoice = filteredVoices.find(v =>
          v.localService && (v.lang.startsWith('en-') || v.lang === 'en')
        ) || filteredVoices[0];

        setTtsState(prev => ({
          ...prev,
          voices: filteredVoices,
          voice: defaultVoice ? defaultVoice.name : ''
        }));
      }
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    // Reset workaround for Chrome
    const intervalId = setInterval(() => {
      if (ttsState.isSpeaking && !ttsState.isPaused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    // Cleanup function
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      clearInterval(intervalId);
    };
  }, [ttsState.isSpeaking, ttsState.isPaused]);

  const handleSpeak = () => {
    if (!ttsState.inputText.trim()) {
      setTtsState(prev => ({ ...prev, error: 'Please enter some text to speak.' }));
      return;
    }

    if (!window.speechSynthesis) {
      setTtsState(prev => ({ ...prev, error: 'Your browser does not support speech synthesis.' }));
      return;
    }

    try {
      // Stop any ongoing speech and reset state
      handleStop();
      setTtsState(prev => ({ ...prev, error: '' }));

      // Add a small delay before starting new speech
      setTimeout(() => {
        // Break text into smaller chunks if very long
        const maxChunkLength = 200;
        textChunksRef.current = [];
        currentChunkRef.current = 0;

        if (ttsState.inputText.length > maxChunkLength) {
          // Break text at sentence boundaries
          const sentences = ttsState.inputText.match(/[^.!?]+[.!?]+/g) || [];
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
          textChunksRef.current.push(ttsState.inputText);
        }

        // Start with the first chunk
        speakCurrentChunk();
      }, 100); // Small delay to ensure previous speech is fully cancelled
    } catch (err) {
      console.error('Speech synthesis error:', err);
      setTtsState(prev => ({ ...prev, error: 'Failed to start speech. Please try again.' }));
    }
  };

  const speakCurrentChunk = () => {
    const currentChunk = textChunksRef.current[currentChunkRef.current];
    if (!currentChunk) return;

    try {
      const utterance = new SpeechSynthesisUtterance(currentChunk);
      utterance.rate = ttsState.rate || 1;
      utterance.pitch = ttsState.pitch || 1;

      // Set selected voice
      if (ttsState.voice && ttsState.voices) {
        const selectedVoice = ttsState.voices.find(v => v.name === ttsState.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Handle events
      utterance.onstart = () => {
        setTtsState(prev => ({
          ...prev,
          isSpeaking: true,
          progress: 0,
          error: ''
        }));
      };

      utterance.onpause = () => {
        setTtsState(prev => ({ ...prev, isPaused: true }));
      };

      utterance.onresume = () => {
        setTtsState(prev => ({ ...prev, isPaused: false }));
      };

      utterance.onend = () => {
        // Move to next chunk if available
        if (currentChunkRef.current < textChunksRef.current.length - 1) {
          currentChunkRef.current++;
          // Add small delay between chunks
          setTimeout(() => speakCurrentChunk(), 50);
        } else {
          setTtsState(prev => ({
            ...prev,
            isSpeaking: false,
            isPaused: false,
            progress: 100
          }));
          currentChunkRef.current = 0;
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);

        // Handle specific error types
        if (event.error === 'interrupted') {
          // If interrupted, try to resume after a short delay
          setTimeout(() => {
            if (currentUtteranceRef.current === utterance) {
              window.speechSynthesis.speak(utterance);
            }
          }, 100);
        } else {
          setTtsState(prev => ({
            ...prev,
            error: 'Error occurred while speaking. Please try again.',
            isSpeaking: false,
            isPaused: false
          }));
          currentChunkRef.current = 0;
        }
      };

      // Update progress
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const totalChunks = textChunksRef.current.length;
          const chunkProgress = (currentChunkRef.current / totalChunks) * 100;
          const wordProgress = (event.charIndex / currentChunk.length) * (100 / totalChunks);
          setTtsState(prev => ({
            ...prev,
            progress: Math.min(Math.round(chunkProgress + wordProgress), 100)
          }));
        }
      };

      // Store the current utterance and speak
      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Error in speakCurrentChunk:', err);
      setTtsState(prev => ({
        ...prev,
        error: 'Failed to process speech. Please try again.',
        isSpeaking: false,
        isPaused: false
      }));
    }
  };

  const handlePause = () => {
    if (!window.speechSynthesis) return;

    try {
      if (ttsState.isPaused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.pause();
      }
    } catch (err) {
      console.error('Error in handlePause:', err);
      setTtsState(prev => ({
        ...prev,
        error: 'Failed to pause/resume speech. Please try again.'
      }));
    }
  };

  const handleStop = () => {
    if (!window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      setTtsState(prev => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        progress: 0,
        error: ''
      }));
      currentUtteranceRef.current = null;
      currentChunkRef.current = 0;
    } catch (err) {
      console.error('Error in handleStop:', err);
      setTtsState(prev => ({
        ...prev,
        error: 'Failed to stop speech. Please refresh the page.'
      }));
    }
  };

  const handleInputChange = (e) => {
    setTtsState(prev => ({ ...prev, inputText: e.target.value }));
  };

  const handleRateChange = (e) => {
    setTtsState(prev => ({ ...prev, rate: parseFloat(e.target.value) }));
  };

  const handlePitchChange = (e) => {
    setTtsState(prev => ({ ...prev, pitch: parseFloat(e.target.value) }));
  };

  const handleVoiceChange = (e) => {
    setTtsState(prev => ({ ...prev, voice: e.target.value }));
  };

  return (
    <div className="tts-container">
      <div className="tts-content">
        <textarea
          value={ttsState.inputText}
          onChange={handleInputChange}
          placeholder="Enter text to convert to speech..."
          className="tts-textarea"
          rows={6}
        />

        {ttsState.error && <div className="error-message">{ttsState.error}</div>}

        <div className="tts-controls">
          <div className="voice-controls">
            <label>
              Voice:
              <select
                value={ttsState.voice}
                onChange={handleVoiceChange}
                className="voice-select"
              >
                {ttsState.voices?.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rate-pitch-controls">
            <label>
              Rate:
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={ttsState.rate || 1}
                onChange={handleRateChange}
                className="slider"
              />
              <span>{ttsState.rate || 1}x</span>
            </label>

            <label>
              Pitch:
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={ttsState.pitch || 1}
                onChange={handlePitchChange}
                className="slider"
              />
              <span>{ttsState.pitch || 1}</span>
            </label>
          </div>

          <div className="playback-controls">
            {!ttsState.isSpeaking ? (
              <button onClick={handleSpeak} className="speak-button">
                <span className="tool-icon">🔊</span>
                Speak
              </button>
            ) : (
              <>
                <button onClick={handlePause} className="pause-button">
                  <span className="tool-icon">
                    {ttsState.isPaused ? '▶️' : '⏸️'}
                  </span>
                  {ttsState.isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={handleStop} className="stop-button">
                  <span className="tool-icon">⏹️</span>
                  Stop
                </button>
              </>
            )}
            <button onClick={resetTts} className="reset-button">
              <span className="tool-icon">🔄</span>
              Reset
            </button>
          </div>
        </div>

        {ttsState.isSpeaking && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${ttsState.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TextToSpeech;
