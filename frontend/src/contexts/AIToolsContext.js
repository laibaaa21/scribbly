import React, { createContext, useContext, useState } from 'react';

const AIToolsContext = createContext();

export const useAITools = () => {
  const context = useContext(AIToolsContext);
  if (!context) {
    throw new Error('useAITools must be used within an AIToolsProvider');
  }
  return context;
};

export const AIToolsProvider = ({ children }) => {
  // State for OCR tool
  const [ocrState, setOcrState] = useState({
    image: null,
    imagePreview: null,
    extractedText: '',
    isProcessing: false,
    error: null
  });

  // State for Text-to-Speech tool
  const [ttsState, setTtsState] = useState({
    inputText: '',
    audioUrl: null,
    isProcessing: false,
    error: null
  });

  // State for Summarizer tool
  const [summarizerState, setSummarizerState] = useState({
    inputText: '',
    summary: '',
    isProcessing: false,
    error: null
  });

  // State for YouTube tool
  const [youtubeState, setYoutubeState] = useState({
    url: '',
    transcript: '',
    summary: '',
    isProcessing: false,
    error: null
  });

  // State for Mindmap tool
  const [mindmapState, setMindmapState] = useState({
    inputText: '',
    mindmapData: null,
    isProcessing: false,
    error: null
  });

  // Reset functions for each tool
  const resetOcr = () => {
    setOcrState({
      image: null,
      imagePreview: null,
      extractedText: '',
      isProcessing: false,
      error: null
    });
  };

  const resetTts = () => {
    setTtsState({
      inputText: '',
      audioUrl: null,
      isProcessing: false,
      error: null
    });
  };

  const resetSummarizer = () => {
    setSummarizerState({
      inputText: '',
      summary: '',
      isProcessing: false,
      error: null
    });
  };

  const resetYoutube = () => {
    setYoutubeState({
      url: '',
      transcript: '',
      summary: '',
      isProcessing: false,
      error: null
    });
  };

  const resetMindmap = () => {
    setMindmapState({
      inputText: '',
      mindmapData: null,
      isProcessing: false,
      error: null
    });
  };

  const value = {
    ocrState,
    setOcrState,
    resetOcr,
    ttsState,
    setTtsState,
    resetTts,
    summarizerState,
    setSummarizerState,
    resetSummarizer,
    youtubeState,
    setYoutubeState,
    resetYoutube,
    mindmapState,
    setMindmapState,
    resetMindmap
  };

  return (
    <AIToolsContext.Provider value={value}>
      {children}
    </AIToolsContext.Provider>
  );
}; 