import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createNote, updateNote, getNotes } from '../utils/api';
import TextToSpeech from './TextToSpeech';
import Summarizer from './Summarizer';
import OCR from './OCR';
import YouTube from './YouTube';
import CreateMindmap from './CreateMindmap';

const Notes = ({ sidebarVisible }) => {
  const { token } = useAuth();
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState({ _id: null, content: '', title: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeAITool, setActiveAITool] = useState(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const fetchedNotes = await getNotes(token);
        setNotes(fetchedNotes);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setError('Failed to fetch notes');
      }
    };

    if (token) {
      fetchNotes();
    }
  }, [token]);

  const createNewNote = async () => {
    if (!token) {
      console.error('No authentication token available');
      setError('Please log in to create notes');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const newNote = {
        title: 'Untitled Note',
        content: ' ',
      };

      console.log('Creating new note with data:', newNote);
      const createdNote = await createNote(newNote, token);
      console.log('Created note response:', createdNote);

      if (!createdNote || !createdNote._id) {
        throw new Error('Invalid response from server');
      }

      setNotes(prevNotes => [createdNote, ...prevNotes]);
      setCurrentNote(createdNote);
    } catch (error) {
      console.error('Error creating note:', error);
      setError(error.message || 'Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!currentNote._id || !token) {
      console.error('Cannot save note: missing note ID or token');
      setError('Unable to save note');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const updatedNote = await updateNote(currentNote._id, {
        title: currentNote.title,
        content: currentNote.content
      }, token);

      setNotes(prevNotes => prevNotes.map(note =>
        note._id === updatedNote._id ? updatedNote : note
      ));
    } catch (error) {
      console.error('Error saving note:', error);
      setError(error.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAIToolClick = (tool) => {
    if (activeAITool === tool) {
      setActiveAITool(null);
    } else {
      setActiveAITool(tool);
    }
  };

  const renderAITool = () => {
    if (!activeAITool) return null;

    const toolComponents = {
      mindmap: <CreateMindmap onClose={() => setActiveAITool(null)} />,
      ocr: <OCR onClose={() => setActiveAITool(null)} />,
      tts: <TextToSpeech onClose={() => setActiveAITool(null)} />,
      summarizer: <Summarizer onClose={() => setActiveAITool(null)} />,
      youtube: <YouTube onClose={() => setActiveAITool(null)} />
    };

    return (
      <div className={`ai-tool-content ${activeAITool ? 'expanded' : ''}`}>
        <div className="ai-tool-header">
          <h3>{getToolTitle(activeAITool)}</h3>
          <button
            className="close-tool-btn"
            onClick={() => setActiveAITool(null)}
            aria-label="Close tool"
          >
            ×
          </button>
        </div>
        <div className="ai-tool-body">
          {toolComponents[activeAITool]}
        </div>
      </div>
    );
  };

  const getToolTitle = (tool) => {
    const titles = {
      mindmap: 'Mind Map',
      ocr: 'OCR Scanner',
      tts: 'Text to Speech',
      summarizer: 'Text Summarizer',
      youtube: 'YouTube Suggestions'
    };
    return titles[tool] || '';
  };

  return (
    <div className="three-panel-layout">
      {/* Left Sidebar */}
      <div className={`left-sidebar ${sidebarVisible ? 'visible' : ''}`}>
        <div className="sidebar-content">
          <button
            className="primary-button"
            onClick={createNewNote}
            disabled={loading || !token}
          >
            {loading ? 'Creating...' : '+ New Note'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="search-box">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="notes-list">
            {filteredNotes.map(note => (
              <div
                key={note._id}
                className={`note-item ${currentNote._id === note._id ? 'active' : ''}`}
                onClick={() => setCurrentNote(note)}
              >
                <h3>{note.title || 'Untitled Note'}</h3>
                <p className="note-preview">
                  {note.content.substring(0, 100)}...
                </p>
                <div className="note-meta">
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="empty-state">
                {searchTerm ? 'No matching notes found' : 'No notes yet. Create one!'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {currentNote._id ? (
          <>
            <input
              type="text"
              value={currentNote.title}
              onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
              className="input-field note-title"
              placeholder="Note title..."
            />
            <textarea
              value={currentNote.content}
              onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
              className="input-field note-content"
              placeholder="Start writing..."
            />
            <button
              className="primary-button save-note-btn"
              onClick={saveNote}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Note'}
            </button>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-content">
              <h2>No Note Selected</h2>
              <p>Select a note from the sidebar or create a new one</p>
              <button
                className="primary-button new-note-btn"
                onClick={createNewNote}
                disabled={loading || !token}
              >
                {loading ? 'Creating...' : 'Create New Note'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="right-panel-header">
          <h2>AI Tools</h2>
        </div>
        <div className="right-panel-content">
          <div className="ai-tools-tabs">
            {[
              { id: 'mindmap', label: 'Mind Map', icon: '🗺️' },
              { id: 'ocr', label: 'OCR Scanner', icon: '📷' },
              { id: 'tts', label: 'Text to Speech', icon: '🔊' },
              { id: 'summarizer', label: 'Summarizer', icon: '📝' },
              { id: 'youtube', label: 'YouTube', icon: '▶️' }
            ].map(tool => (
              <React.Fragment key={tool.id}>
                <button
                  className={`ai-tool-button ${activeAITool === tool.id ? 'active' : ''}`}
                  onClick={() => handleAIToolClick(tool.id)}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  {tool.label}
                </button>
                {activeAITool === tool.id && renderAITool()}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notes;
