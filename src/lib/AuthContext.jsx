import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);
  const [viewAsRole, setViewAsRole] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkAppState = async () => {
    setAuthError(null);
    await checkUserAuth();
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();

      try {
        const userRecord = await base44.entities.User.filter({ email: currentUser.email });
        if (userRecord && userRecord.length > 0) {
          Object.assign(currentUser, userRecord[0]);
        }
      } catch (e) {
        console.log("could not load user record", e);
      }

      setUser(currentUser);
      setIsAuthenticated(true);

      if (currentUser?.email === 'idoal9932@gmail.com') {
        setViewAsRole('paramedic');
        setNeedsOnboarding(false);
      } else if (!currentUser?.custom_role) {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }

      setIsLoadingAuth(false);
    } catch (error) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else if (error?.data?.extra_data?.reason === 'user_not_registered') {
        setAuthError({
          type: 'user_not_registered',
          message: 'User not registered for this app'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      viewAsRole,
      setViewAsRole,
      needsOnboarding,
      setNeedsOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};