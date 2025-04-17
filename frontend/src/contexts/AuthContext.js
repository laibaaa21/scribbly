import React, { createContext, useState, useEffect, useContext } from 'react';
import { loginUser, registerUser, getUserProfile } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is logged in on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const userData = await getUserProfile(token);
          setCurrentUser(userData);
        } catch (error) {
          // Token might be expired or invalid
          logout();
          console.error('Authentication error:', error);
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    setError('');
    try {
      const data = await loginUser({ email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data);
      return data;
    } catch (error) {
      setError(error.message || 'Failed to login');
      throw error;
    }
  };

  const register = async (username, email, password) => {
    setError('');
    try {
      const data = await registerUser({ username, email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data);
      return data;
    } catch (error) {
      setError(error.message || 'Failed to register');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    token,
    loading,
    error,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 