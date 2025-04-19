import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createNote, updateNote, getNotes } from '../utils/api';

const Notes = () => {
  const { token } = useAuth();
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState({ _id: null, content: '', title: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="feature-container">
      <div className="feature-sidebar">
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

      <div className="feature-main">
        {currentNote._id ? (
          <>
            <input
              type="text"
              value={currentNote.title}
              onChange={(e) => setCurrentNote({...currentNote, title: e.target.value})}
              className="input-field note-title"
              placeholder="Note title..."
            />
            <textarea
              value={currentNote.content}
              onChange={(e) => setCurrentNote({...currentNote, content: e.target.value})}
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
    </div>
  );
};

export default Notes;
