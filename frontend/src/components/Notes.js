import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createNote, updateNote, getNotes, deleteNote } from '../utils/api';
import TextToSpeech from './TextToSpeech';
import Summarizer from './Summarizer';
import OCR from './OCR';
import YouTube from './YouTube';
import CreateMindmap from './CreateMindmap';

const Notes = ({ sidebarVisible, activeAITool, onAIToolSelect }) => {
  const { token } = useAuth();
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState({});
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('lastEdited');
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, noteId: null });
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, noteId: null });
  const [editingTitleId, setEditingTitleId] = useState(null);
  const titleInputRef = useRef(null);

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
       openNoteInTab(createdNote);
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

      // Update notes list
      setNotes(prevNotes => prevNotes.map(note =>
        note._id === updatedNote._id ? updatedNote : note
      ));

      // Update current note with server response
      setCurrentNote(updatedNote);

      // Update the tab content
      setOpenTabs(prevTabs => 
        prevTabs.map(tab =>
          tab._id === updatedNote._id ? updatedNote : tab
        )
      );
    } catch (error) {
      console.error('Error saving note:', error);
      setError(error.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e, noteId) => {
    e.stopPropagation(); // Prevent note selection when clicking delete
    setDeleteConfirmation({ show: true, noteId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.noteId || !token) return;

    try {
      setLoading(true);
      setError('');

      await deleteNote(deleteConfirmation.noteId, token);

      // Remove note from state
      setNotes(prevNotes => prevNotes.filter(note => note._id !== deleteConfirmation.noteId));

      // Clear current note if it was deleted
      if (currentNote._id === deleteConfirmation.noteId) {
        setCurrentNote({ _id: null, content: '', title: '' });
      }

      // Hide confirmation popup
      setDeleteConfirmation({ show: false, noteId: null });
    } catch (error) {
      console.error('Error deleting note:', error);
      setError(error.message || 'Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, noteId: null });
  };

  const handleTitleDoubleClick = (noteId, currentTitle) => {
    setEditingTitleId(noteId);
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 0);
  };

  const handleTitleKeyDown = async (e, noteId, newTitle) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleTitleSave(noteId, newTitle);
    } else if (e.key === 'Escape') {
      setEditingTitleId(null);
    }
  };

  const handleTitleSave = async (noteId, newTitle) => {
    try {
      setLoading(true);
      const updatedNote = await updateNote(noteId, { title: newTitle }, token);
      setNotes(prevNotes => prevNotes.map(note =>
        note._id === noteId ? { ...note, title: newTitle } : note
      ));
      if (currentNote._id === noteId) {
        setCurrentNote(prev => ({ ...prev, title: newTitle }));
      }
    } catch (error) {
      setError('Failed to update note title');
    } finally {
      setLoading(false);
      setEditingTitleId(null);
    }
  };

  const togglePinNote = async (noteId) => {
    const noteToUpdate = notes.find(n => n._id === noteId);
    if (!noteToUpdate) return;

    try {
      setLoading(true);
      const updatedNote = await updateNote(noteId, {
        isPinned: !noteToUpdate.isPinned
      }, token);

      setNotes(prevNotes => prevNotes.map(note =>
        note._id === noteId ? { ...note, isPinned: !note.isPinned } : note
      ));
    } catch (error) {
      setError('Failed to pin/unpin note');
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e, noteId) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.pageX,
      y: e.pageY,
      noteId
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, noteId: null });
  };

  const duplicateNote = async (noteId) => {
    const noteToDuplicate = notes.find(n => n._id === noteId);
    if (!noteToDuplicate) return;

    try {
      setLoading(true);
      const newNote = await createNote({
        title: `${noteToDuplicate.title} (Copy)`,
        content: noteToDuplicate.content
      }, token);
      setNotes(prevNotes => [newNote, ...prevNotes]);
    } catch (error) {
      setError('Failed to duplicate note');
    } finally {
      setLoading(false);
      closeContextMenu();
    }
  };

  const sortNotes = (notesToSort) => {
    const pinnedNotes = notesToSort.filter(note => note.isPinned);
    const unpinnedNotes = notesToSort.filter(note => !note.isPinned);

    const sortFunctions = {
      lastEdited: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      created: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      alphabetical: (a, b) => a.title.localeCompare(b.title)
    };

    const sortFn = sortFunctions[sortOption] || sortFunctions.lastEdited;
    return [...pinnedNotes.sort(sortFn), ...unpinnedNotes.sort(sortFn)];
  };

  const filteredNotes = sortNotes(
    notes.filter(note =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleAIToolClick = (tool) => {
    if (activeAITool === tool) {
      onAIToolSelect(null);
    } else {
      onAIToolSelect(tool);
    }
  };

  const renderAITool = () => {
    if (!activeAITool) return null;

    const toolComponents = {
      mindmap: <CreateMindmap onClose={() => onAIToolSelect(null)} />,
      ocr: <OCR onClose={() => onAIToolSelect(null)} />,
      tts: <TextToSpeech onClose={() => onAIToolSelect(null)} />,
      summarizer: <Summarizer onClose={() => onAIToolSelect(null)} />,
      youtube: <YouTube onClose={() => onAIToolSelect(null)} />
    };

    return toolComponents[activeAITool];
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

  useEffect(() => {
    // Close context menu when clicking outside
    const handleClickOutside = () => closeContextMenu();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const openNoteInTab = (note) => {
    if (!openTabs.find(tab => tab._id === note._id)) {
      setOpenTabs([...openTabs, note]);
    }
    setActiveTabId(note._id);
    setCurrentNote(note);
  };

  const closeTab = (noteId, event) => {
    event.stopPropagation();
    const newTabs = openTabs.filter(tab => tab._id !== noteId);
    setOpenTabs(newTabs);
    
    if (activeTabId === noteId) {
      const lastTab = newTabs[newTabs.length - 1];
      if (lastTab) {
        setActiveTabId(lastTab._id);
        setCurrentNote(lastTab);
      } else {
        setActiveTabId(null);
        setCurrentNote({});
      }
    }
  };

  useEffect(() => {
    if (activeAITool) {
      // Create a new AI tool tab when an AI tool is selected
      const toolTitles = {
        mindmap: 'Mind Map',
        ocr: 'OCR Scanner',
        tts: 'Text to Speech',
        summarizer: 'Text Summarizer',
        youtube: 'YouTube'
      };

      const newTab = {
        _id: `ai-${activeAITool}-${Date.now()}`,
        title: toolTitles[activeAITool],
        type: 'ai-tool',
        toolId: activeAITool
      };

      if (!openTabs.find(tab => tab.toolId === activeAITool)) {
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab._id);
      } else {
        const existingTab = openTabs.find(tab => tab.toolId === activeAITool);
        setActiveTabId(existingTab._id);
      }
    }
  }, [activeAITool]);

  // Update openTabs when notes are updated
  useEffect(() => {
    setOpenTabs(prevTabs => 
      prevTabs.map(tab => {
        if (!tab.type) { // Only update note tabs
          const updatedNote = notes.find(note => note._id === tab._id);
          return updatedNote || tab;
        }
        return tab;
      })
    );
  }, [notes]);

  const renderTabContent = (tab) => {
    if (!tab) return null;

    if (tab.type === 'ai-tool') {
      const toolComponents = {
        mindmap: <CreateMindmap onClose={() => closeTab(tab._id)} />,
        ocr: <OCR onClose={() => closeTab(tab._id)} />,
        tts: <TextToSpeech onClose={() => closeTab(tab._id)} />,
        summarizer: <Summarizer onClose={() => closeTab(tab._id)} />,
        youtube: <YouTube onClose={() => closeTab(tab._id)} />
      };
      return (
        <div className="tab-content">
          {toolComponents[tab.toolId]}
        </div>
      );
    }

    // Regular note content
    return (
      <div className="tab-content">
        <div className="note-editor">
          <input
            type="text"
            value={tab.title || ''}
            onChange={(e) => {
              const updatedNote = { ...tab, title: e.target.value };
              setCurrentNote(updatedNote);
              setOpenTabs(prevTabs =>
                prevTabs.map(t => t._id === tab._id ? updatedNote : t)
              );
            }}
            className="input-field note-title"
            placeholder="Note title..."
          />
          <textarea
            value={tab.content || ''}
            onChange={(e) => {
              const updatedNote = { ...tab, content: e.target.value };
              setCurrentNote(updatedNote);
              setOpenTabs(prevTabs =>
                prevTabs.map(t => t._id === tab._id ? updatedNote : t)
              );
            }}
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
        </div>
      </div>
    );
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

          <div className="search-and-sort">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="sort-select"
            >
              <option value="lastEdited">Last edited</option>
              <option value="created">Recently created</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>

          <div className="notes-list">
            {filteredNotes.map(note => (
              <div
                key={note._id}
                className={`note-item ${currentNote._id === note._id ? 'active' : ''}`}
                                 onClick={() => openNoteInTab(note)}
                 onContextMenu={(e) => handleContextMenu(e, note._id)}
              >
                <div className="note-item-content">
                  {editingTitleId === note._id ? (
                    <input
                      ref={titleInputRef}
                      type="text"
                      defaultValue={note.title}
                      className="edit-title-input"
                      onBlur={(e) => handleTitleSave(note._id, e.target.value)}
                      onKeyDown={(e) => handleTitleKeyDown(e, note._id, e.target.value)}
                    />
                  ) : (
                    <h3 onDoubleClick={() => handleTitleDoubleClick(note._id, note.title)}>
                      {note.isPinned && <span className="pin-icon">📌</span>}
                      {note.title || 'Untitled Note'}
                    </h3>
                  )}
                  <p className="note-preview">
                    {note.content.substring(0, 100)}...
                  </p>
                  <div className="note-meta">
                    {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="note-actions">
                  <button
                    className="pin-note-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinNote(note._id);
                    }}
                    aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                  >
                    {note.isPinned ? '📌' : '📍'}
                  </button>
                  <button
                    className="delete-note-btn"
                    onClick={(e) => handleDeleteClick(e, note._id)}
                    aria-label="Delete note"
                  >
                    🗑️
                  </button>
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

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
                     <button onClick={() => {
             const note = notes.find(n => n._id === contextMenu.noteId);
             openNoteInTab(note);
             closeContextMenu();
           }}>Open in Tab</button>
          <button onClick={() => {
            handleTitleDoubleClick(contextMenu.noteId);
            closeContextMenu();
          }}>Rename</button>
          <button onClick={() => duplicateNote(contextMenu.noteId)}>Duplicate</button>
          <button onClick={() => {
            handleDeleteClick(new Event('click'), contextMenu.noteId);
            closeContextMenu();
          }}>Delete</button>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteConfirmation.show && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation-popup">
            <h3>Delete Note</h3>
            <p>Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="delete-confirmation-buttons">
              <button
                className="cancel-button"
                onClick={cancelDelete}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="delete-button"
                onClick={confirmDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        <div className="tabs-container">
          {openTabs.map(tab => (
            <div
              key={tab._id}
              className={`tab ${activeTabId === tab._id ? 'active' : ''} ${tab.type === 'ai-tool' ? 'ai-tool' : ''}`}
              onClick={() => {
                setActiveTabId(tab._id);
                if (!tab.type) {
                  setCurrentNote(tab);
                }
              }}
            >
              <span className="tab-title">
                {tab.type === 'ai-tool' ? (
                  <>
                    {tab.toolId === 'mindmap' && '🗺️'}
                    {tab.toolId === 'ocr' && '📷'}
                    {tab.toolId === 'tts' && '🔊'}
                    {tab.toolId === 'summarizer' && '📝'}
                    {tab.toolId === 'youtube' && '▶️'}
                    {' '}{tab.title}
                  </>
                ) : (
                  tab.title || 'Untitled'
                )}
              </span>
              <button
                className="close-tab"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab._id, e);
                  if (tab.type === 'ai-tool') {
                    onAIToolSelect(null);
                  }
                }}
                aria-label="Close tab"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {activeTabId ? (
          renderTabContent(openTabs.find(tab => tab._id === activeTabId))
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
