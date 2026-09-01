import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  fetchCurrentSession,
  getAuthToken,
  loginAdmin,
  registerMerchant,
  setAuthToken,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [merchant, setMerchant] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    fetchCurrentSession()
      .then((data) => {
        setMerchant(data.merchant);
        setAdmin(data.admin);
      })
      .catch(() => setAuthToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await loginAdmin({ email, password });
    setAuthToken(data.token);
    setMerchant(data.merchant);
    setAdmin(data.admin);
    return data;
  };

  const register = async (payload) => {
    const data = await registerMerchant(payload);
    setAuthToken(data.token);
    setMerchant(data.merchant);
    setAdmin(data.admin);
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    setMerchant(null);
    setAdmin(null);
  };

  const value = useMemo(
    () => ({ merchant, admin, loading, isAuthenticated: Boolean(admin), login, register, logout, setMerchant }),
    [merchant, admin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node };

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
