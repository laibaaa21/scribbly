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
          console.log('Verifying token:', token.substring(0, 20) + '...');
          const userData = await getUserProfile(token);
          setCurrentUser(userData);
        } catch (error) {
          console.error('Token verification failed:', error);
          // Token is invalid, clear it
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    setError('');
    try {
      const response = await loginUser({ email, password });
      
      if (!response || !response.token) {
        throw new Error('No token received from server');
      }

      // Store the token
      localStorage.setItem('token', response.token);
      setToken(response.token);

      // Get user profile with the new token
      const userData = await getUserProfile(response.token);
      setCurrentUser({
        ...userData,
        subscription_tier: userData.subscription_tier || 'personal' // Ensure tier is available
      });

      return { token: response.token, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login');
      throw error;
    }
  };

  const register = async (username, email, password, subscriptionTier) => {
    setError('');
    try {
      const response = await registerUser({ 
        username, 
        email, 
        password,
        subscription_tier: subscriptionTier || 'personal' // Include tier in registration
      });
      
      if (!response || !response.token) {
        throw new Error('No token received from server');
      }

      // Store the token
      localStorage.setItem('token', response.token);
      setToken(response.token);

      // Get user profile with the new token
      const userData = await getUserProfile(response.token);
      setCurrentUser({
        ...userData,
        subscription_tier: subscriptionTier || 'personal'
      });

      return { token: response.token, user: userData };
    } catch (error) {
      console.error('Registration error:', error);
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