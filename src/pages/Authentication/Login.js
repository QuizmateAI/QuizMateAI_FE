import { useState } from 'react';
import { login, googleLogin } from '@/api/Authentication';
import { preloadGroupWorkspacePage, preloadHomePage, preloadWorkspacePage } from '@/lib/routeLoaders';

export const useLogin = (navigate, location, t) => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleLoginChange = (field) => (e) => {
    setLoginData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Trim táº¥t cáº£ dá»¯ liá»‡u trÆ°á»›c khi submit
  const trimLoginData = () => ({
    username: loginData.username.trim(),
    password: loginData.password
  });

  const resolveReturnPath = () => {
    const from = location?.state?.from;
    if (!from) return null;

    if (typeof from === 'string') {
      return from;
    }

    if (from.pathname) {
      return `${from.pathname}${from.search || ''}${from.hash || ''}`;
    }

    return null;
  };

  const preloadResolvedDestination = (role, returnPath) => {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return;
    }

    if (!returnPath || returnPath === '/home' || returnPath.startsWith('/home?')) {
      void preloadHomePage();
      return;
    }

    if (returnPath.startsWith('/workspaces/')) {
      void preloadWorkspacePage();
      return;
    }

    if (returnPath.startsWith('/group-workspaces/')) {
      void preloadGroupWorkspacePage();
    }
  };

  // Navigate according to the resolved role and return path.
  const navigateByRole = (role) => {
    if (role === 'SUPER_ADMIN') return navigate('/super-admin');
    if (role === 'ADMIN') return navigate('/admin');
    const returnPath = resolveReturnPath();
    preloadResolvedDestination(role, returnPath);
    if (returnPath) {
      return navigate(returnPath, { replace: true });
    }
    return navigate('/home');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Trim dá»¯ liá»‡u trÆ°á»›c khi gá»­i
    const trimmed = trimLoginData();
    setLoginData(trimmed);

    const nextFieldErrors = {};
    if (!trimmed.username) {
      nextFieldErrors.username = t('validation.usernameRequired');
    }
    if (!trimmed.password) {
      nextFieldErrors.password = t('validation.passwordRequired');
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(trimmed);
      console.log("BE Login Response:", response);
      if (response.statusCode === 200 || response.statusCode === 0) {
        navigateByRole(response.data.role);
      }
    } catch (err) {
      setError(err.message || t('auth.loginFailed') || 'ÄÄƒng nháº­p tháº¥t báº¡i, vui lÃ²ng thá»­ láº¡i');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSubmit = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
      console.log("Google Credential Response:", credentialResponse);
      // credentialResponse.credential CHÃNH LÃ€ idToken (JWT) mong muá»‘n
      const response = await googleLogin(credentialResponse.credential);
      console.log("BE Google Submit Response:", response);
      if (response.statusCode === 200 || response.statusCode === 0) {
        navigateByRole(response.data.role);
      }
    } catch (err) {
      setError(t('auth.loginGoogleFailed') || 'ÄÄƒng nháº­p Google tháº¥t báº¡i');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loginData,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    fieldErrors,
    setError,
    handleLoginChange,
    handleLoginSubmit,
    handleGoogleSubmit
  };
};
