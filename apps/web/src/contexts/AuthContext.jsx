// src/contexts/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api/authApi';
import { tokenStorage } from '../services/storage/tokenStorage';
import { getInternalRole } from '../utils/roleMap';
import { setUnauthorizedHandler } from '@urbanmind/shared-api';

const AuthContext = createContext(null);

const normalizeRole = (role) => getInternalRole(role);

const getJwtExpiresAt = (token) => {
  if (!token || typeof token !== 'string' || typeof atob !== 'function') return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded));
    return Number.isFinite(decoded?.exp) ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};

const initializeUser = () => {
  const savedUser = tokenStorage.getUser();
  const token = tokenStorage.getToken();

  if (!savedUser || !token) {
    tokenStorage.clear();
    return null;
  }

  const expiresAt = getJwtExpiresAt(token);
  if (expiresAt && expiresAt <= Date.now()) {
    tokenStorage.clear();
    return null;
  }

  return {
    ...savedUser,
    role: normalizeRole(savedUser.role),
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(initializeUser);
  const [loading, setLoading] = useState(false);

  const expireSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);

    if (typeof window === 'undefined' || window.location.pathname.startsWith('/login')) {
      return;
    }

    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({
      reason: 'session-expired',
      redirect,
    });
    window.location.replace(`/login?${params.toString()}`);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(expireSession);
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return undefined;

    const expiresAt = getJwtExpiresAt(tokenStorage.getToken());
    if (!expiresAt) return undefined;

    const delay = Math.max(expiresAt - Date.now(), 0);
    const timer = window.setTimeout(expireSession, delay);
    return () => window.clearTimeout(timer);
  }, [expireSession, user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const updatedUser = {
        ...res.user,
        role: normalizeRole(res.user.role),
      };
      setUser(updatedUser);
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName, email, password, phone) => {
    setLoading(true);
    try {
      const res = await authApi.register(fullName, email, password, phone);
      const updatedUser = {
        ...res.user,
        role: normalizeRole(res.user.role),
      };
      setUser(updatedUser);
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (otp) => {
    setLoading(true);
    try {
      const result = await authApi.verifyOTP(otp);
      const updatedUser = result?.user || tokenStorage.getUser();
      if (updatedUser) {
        setUser({
          ...updatedUser,
          role: normalizeRole(updatedUser.role),
        });
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (idToken) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(idToken);
      const updatedUser = {
        ...res.user,
        role: normalizeRole(res.user.role),
      };
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.warn('AuthContext.googleLogin error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      return await authApi.sendOTP();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setUser(null);
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('AuthContext.logout: error during logout', err);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    verifyOtp,
    googleLogin,
    sendOtp,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
