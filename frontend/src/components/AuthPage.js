import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import './Auth.css';

const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };
  
  return (
    <div className="auth-page">
      <h1 className="auth-title">Scribbly</h1>
      <div className="auth-container">
        {isLogin ? (
          <>
            <Login onSuccess={onLoginSuccess} />
            <div className="auth-toggle">
              Don't have an account? <a onClick={toggleAuthMode}>Register</a>
            </div>
          </>
        ) : (
          <>
            <Register onSuccess={onLoginSuccess} />
            <div className="auth-toggle">
              Already have an account? <a onClick={toggleAuthMode}>Login</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage; 