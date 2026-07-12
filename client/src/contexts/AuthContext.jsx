import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('assetflow_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('assetflow_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('assetflow_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('assetflow_token');
        localStorage.removeItem('assetflow_user');
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Login — direct, no OTP
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('assetflow_token', t);
    localStorage.setItem('assetflow_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return { user: u };
  }, []);

  // Signup — returns requiresVerification, does NOT log in yet
  const signup = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/signup', { name, email, password });
    if (res.data.requiresVerification) {
      return { requiresVerification: true, email: res.data.email };
    }
    // Fallback: if server returns token directly (shouldn't happen now)
    const { token: t, user: u } = res.data;
    localStorage.setItem('assetflow_token', t);
    localStorage.setItem('assetflow_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return { requiresVerification: false, user: u };
  }, []);

  // Verify OTP — final step of signup, issues token
  const verifyOtp = useCallback(async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    const { token: t, user: u } = res.data;
    localStorage.setItem('assetflow_token', t);
    localStorage.setItem('assetflow_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('assetflow_token');
    localStorage.removeItem('assetflow_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
