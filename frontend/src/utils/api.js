const API_URL = 'http://localhost:5000/api';
const AI_API_URL = 'http://localhost:8000';

// Helper function for making API requests
export async function apiRequest(endpoint, method = 'GET', data = null, token = null, useAIAPI = false) {
  console.log(`Making ${method} request to ${endpoint} with token:`, token?.substring(0, 20) + '...');
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  if (token) {
    headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
  }

  const config = {
    method,
    headers,
    credentials: 'include',
    mode: 'cors',
    cache: 'no-cache',
    redirect: 'follow'
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const baseURL = useAIAPI ? AI_API_URL : API_URL;
    const url = `${baseURL}${endpoint}`;
    
    console.log('Request URL:', url);
    console.log('Request config:', {
      ...config,
      headers: Object.fromEntries(config.headers.entries())
    });

    const response = await fetch(url, config);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
      // Try to parse as JSON if it looks like JSON
      try {
        responseData = JSON.parse(responseData);
      } catch (e) {
        // Keep as text if not valid JSON
      }
    }

    if (!response.ok) {
      console.error('API request error:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData
      });
      
      throw new Error(
        typeof responseData === 'object' 
          ? responseData.detail || responseData.message || 'API request failed'
          : responseData || 'API request failed'
      );
    }

    return responseData;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Upload file helper function
async function uploadFile(endpoint, file, token = null) {
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
  }

  try {
    const url = `${API_URL}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    console.log('Upload URL:', url);
    console.log('Upload headers:', Object.fromEntries(headers.entries()));

    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      mode: 'cors',
      body: formData,
      cache: 'no-cache',
      redirect: 'follow'
    });

    console.log('Upload response status:', response.status);
    console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Something went wrong');
    }

    return responseData;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Modified upload file helper for supporting additional form data
async function uploadFileWithFormData(endpoint, formData, token = null) {
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
  }

  try {
    const url = `${API_URL}${endpoint}`;
    console.log('Upload URL:', url);
    console.log('Upload headers:', Object.fromEntries(headers.entries()));

    // Log form data contents for debugging
    for (let pair of formData.entries()) {
      console.log(`Form data: ${pair[0]}: ${pair[1]}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      mode: 'cors',
      body: formData,
      cache: 'no-cache',
      redirect: 'follow'
    });

    console.log('Upload response status:', response.status);
    console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Something went wrong');
    }

    return responseData;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Auth API calls
export const registerUser = (userData) => {
  // Ensure subscription_tier is included in the request
  const registrationData = {
    ...userData,
    subscription_tier: userData.subscription_tier || 'personal'
  };
  return apiRequest('/users', 'POST', registrationData);
};

export const loginUser = (credentials) => {
  return apiRequest('/users/login', 'POST', credentials);
};

export const getUserProfile = (token) => {
  if (!token) {
    throw new Error('No token provided for user profile request');
  }
  return apiRequest('/users/profile', 'GET', null, token);
};

// AI Model API calls
export const getAvailableModels = (token) => {
  if (!token) {
    throw new Error('No token provided for models request');
  }
  return apiRequest('/models/available', 'GET', null, token, true);
};

// Notes API calls
export const getNotes = (token) => {
  return apiRequest('/notes', 'GET', null, token);
};

export const createNote = (noteData, token) => {
  return apiRequest('/notes', 'POST', noteData, token);
};

export const updateNote = (id, noteData, token) => {
  return apiRequest(`/notes/${id}`, 'PUT', noteData, token);
};

export const deleteNote = async (noteId, token) => {
  try {
    const response = await fetch(`${API_URL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete note');
    }

    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

export const searchNotes = (searchTerm, token) => {
  return apiRequest(`/notes/search?term=${encodeURIComponent(searchTerm)}`, 'GET', null, token);
};

// Mindmap API calls
export const getMindmaps = (token) => {
  return apiRequest('/mindmaps', 'GET', null, token);
};

export const getMindmapById = (id, token) => {
  return apiRequest(`/mindmaps/${id}`, 'GET', null, token);
};

export const createMindmap = (mindmapData, token) => {
  return apiRequest('/mindmaps', 'POST', mindmapData, token);
};

export const updateMindmap = (id, mindmapData, token) => {
  return apiRequest(`/mindmaps/${id}`, 'PUT', mindmapData, token);
};

export const deleteMindmap = (id, token) => {
  return apiRequest(`/mindmaps/${id}`, 'DELETE', null, token);
};

// OCR API calls
export const processOcrImage = (imageFile, language = 'eng', token) => {
  console.log(`Processing OCR with language: ${language}`);

  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('language', language);

  return uploadFileWithFormData('/ocr', formData, token);
};

// Text Summarization API calls
export const summarizeText = async (text, compressionRatio, modelName, token) => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await fetch('http://localhost:8000/summarizer/', {
      method: 'POST',
      headers: {
        'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text,
        compression_ratio: compressionRatio,
        model_name: modelName
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || 'Failed to summarize text');
    }

    return await response.json();
  } catch (error) {
    console.error('Summarization error:', error);
    throw error;
  }
};

export default {
  registerUser,
  loginUser,
  getUserProfile,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  getMindmaps,
  getMindmapById,
  createMindmap,
  updateMindmap,
  deleteMindmap,
  processOcrImage,
  summarizeText,
  getAvailableModels,
}; 