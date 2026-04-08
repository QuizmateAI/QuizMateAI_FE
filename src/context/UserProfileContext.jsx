import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserProfile } from '@/api/ProfileAPI';

const UserProfileContext = createContext({
  profile: null,
  loading: false,
  error: null,
  refreshProfile: async () => {},
  setProfile: () => {},
});

export function UserProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      setError(err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const handleAuthChanged = (event) => {
      const eventType = event?.detail?.type;

      if (eventType === 'logout') {
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }

      if (eventType === 'login') {
        void loadProfile();
      }
    };

    window.addEventListener('auth:changed', handleAuthChanged);

    return () => {
      window.removeEventListener('auth:changed', handleAuthChanged);
    };
  }, []);

  const value = {
    profile,
    loading,
    error,
    refreshProfile: loadProfile,
    setProfile,
  };

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}

