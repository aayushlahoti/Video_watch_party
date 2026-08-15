import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/index.js';
import { connectSocket, disconnectSocket } from '../socket/socketService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const response = await authApi.getProfile();
        if (isMounted) {
          setUser(response.data.data.user);
          setToken('cookie');
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (token) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [token]);

  useEffect(() => {
    const handleLogout = () => {
      setToken(null);
      setUser(null);
      disconnectSocket();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const persistAuth = useCallback((userData) => {
    setToken('cookie');
    setUser(userData);
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  const register = useCallback(async (formData) => {
    setLoading(true);
    try {
      const response = await authApi.register(formData);
      const { user: userData } = response.data.data;
      persistAuth(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  const login = useCallback(async (formData) => {
    setLoading(true);
    try {
      const response = await authApi.login(formData);
      const { user: userData } = response.data.data;
      persistAuth(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Still clear local state even if the server logout fails.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
