import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [childList, setChildList] = useState([]);
  const [activeChild, setActiveChild] = useState(() => {
    const c = localStorage.getItem('activeChild');
    return c ? JSON.parse(c) : null;
  });

  useEffect(() => {
    if (token) {
      api.get('/children').then(res => {
        setChildList(res.data);
        if (!activeChild && res.data.length > 0) {
          setActiveChild(res.data[0]);
          localStorage.setItem('activeChild', JSON.stringify(res.data[0]));
        }
      }).catch(() => {});
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    return res.data;
  };

  const register = async (username, password) => {
    const res = await api.post('/auth/register', { username, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setChildList([]);
    setActiveChild(null);
    localStorage.clear();
  };

  const switchChild = (child) => {
    setActiveChild(child);
    localStorage.setItem('activeChild', JSON.stringify(child));
  };

  return (
    <AuthContext.Provider value={{ user, token, children: childList, setChildren: setChildList, activeChild, switchChild, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
