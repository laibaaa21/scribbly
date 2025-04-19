const API_URL = 'http://localhost:5000/api';

// Helper function for making API requests
async function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Something went wrong');
    }

    return responseData;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Upload file helper function
async function uploadFile(endpoint, file, token = null) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });
    
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
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log(`Sending request to ${API_URL}${endpoint}`);
    
    // Log form data contents for debugging
    for (let pair of formData.entries()) {
      console.log(`Form data: ${pair[0]}: ${pair[1]}`);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    // Log response status
    console.log(`Response status: ${response.status}`);
    
    const responseData = await response.json();
    console.log('Response data:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Something went wrong');
    }

    return responseData;
  } catch (error) {
    console.error('Upload error details:', error);
    throw error;
  }
}

// Auth API calls
export const registerUser = (userData) => {
  return apiRequest('/users', 'POST', userData);
};

export const loginUser = (credentials) => {
  return apiRequest('/users/login', 'POST', credentials);
};

export const getUserProfile = (token) => {
  return apiRequest('/users/profile', 'GET', null, token);
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

export const deleteNote = (id, token) => {
  return apiRequest(`/notes/${id}`, 'DELETE', null, token);
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
}; 