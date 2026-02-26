import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vl_token'));
  const [loading, setLoading] = useState(true);

  const axiosAuth = useCallback(() => {
    return axios.create({
      baseURL: API,
      headers: { Authorization: `Bearer ${token}` }
    });
  }, [token]);

  useEffect(() => {
    if (token) {
      axiosAuth().get('/users/me')
        .then(res => setUser(res.data))
        .catch(() => { logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, axiosAuth]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('vl_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const adminLogin = async (email, password) => {
    const res = await axios.post(`${API}/auth/admin/login`, { email, password });
    localStorage.setItem('vl_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    localStorage.setItem('vl_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('vl_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      const res = await axiosAuth().get('/users/me');
      setUser(res.data);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, adminLogin, register, logout, axiosAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
