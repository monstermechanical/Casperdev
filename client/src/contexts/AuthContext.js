import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/me');
          setUser(response.data.user);
          toast.success('Connected successfully');
        } catch (error) {
          console.error('Authentication check failed:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          toast.error('Connection expired, please login again');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/login', credentials);
      
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      toast.success(`Welcome back, ${userData.username}! You are now connected.`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Connection failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/register', userData);
      
      const { token: newToken, user: newUser } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      toast.success(`Welcome, ${newUser.username}! Your account is now connected.`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      toast.info('Disconnected successfully');
    }
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  const connectToUser = async (userId) => {
    try {
      const response = await axios.post(`/api/users/${userId}/connect`);
      toast.success('Connection request sent successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send connection request';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateConnection = async (userId, status) => {
    try {
      const response = await axios.put(`/api/users/${userId}/connection`, { status });
      toast.success(`Connection ${status} successfully`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update connection';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const checkConnectionHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    token,
    login,
    register,
    logout,
    updateUser,
    connectToUser,
    updateConnection,
    checkConnectionHealth,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};