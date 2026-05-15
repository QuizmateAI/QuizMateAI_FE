import { useState } from 'react';
import { login, googleLogin, ROLE_NOT_ALLOWED_CODE } from '@/api/Authentication';
import { preloadGroupWorkspacePage, preloadHomePage, preloadWorkspacePage } from '@/lib/routeLoaders';

/**
 * Hook đăng nhập dùng chung giữa LoginPage (user-facing) và AdminLoginPage
 * (management console).
 *
 * @param {Function} navigate - react-router navigate
 * @param {Object} location - react-router location
 * @param {Function} t - i18n translator (or fallback (_, def) => def)
 * @param {Object} [options]
 * @param {string[]} [options.allowedRoles] - Whitelist role được phép login tại
 *   entry này. LoginPage truyền ['USER']; AdminLoginPage truyền
 *   ['ADMIN','SUPER_ADMIN']. Nếu role BE trả về không khớp, error mismatch
 *   được show và token KHÔNG được persist (xem Authentication.login).
 */
export const useLogin = (navigate, location, t, { allowedRoles } = {}) => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleLoginChange = (field) => (event) => {
    setLoginData((prev) => ({ ...prev, [field]: event.target.value }));
    setError('');
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const trimLoginData = () => ({
    username: loginData.username.trim(),
    password: loginData.password,
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

  const resolveRoleMismatchMessage = () => {
    // LoginPage user-facing chỉ accept USER → admin/superadmin nhập sai entry.
    // AdminLoginPage chỉ accept ADMIN/SUPER_ADMIN → user thường nhập sai entry.
    const onlyUser = allowedRoles?.length === 1 && allowedRoles[0] === 'USER';
    if (onlyUser) {
      return t(
        'auth.roleNotAllowedForUserLogin',
        'Tài khoản quản trị không được phép đăng nhập tại đây. Vui lòng dùng cổng quản trị.',
      );
    }
    return t(
      'auth.roleNotAllowedForAdminLogin',
      'Tài khoản user thường không được phép đăng nhập vào cổng quản trị.',
    );
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});

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
      const response = await login(trimmed, { allowedRoles });
      if (response.statusCode === 200 || response.statusCode === 0) {
        navigateByRole(response.data.role);
      }
    } catch (err) {
      if (err?.code === ROLE_NOT_ALLOWED_CODE) {
        setError(resolveRoleMismatchMessage());
      } else {
        setError(err.message || t('auth.loginFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSubmit = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await googleLogin(credentialResponse.credential, { allowedRoles });
      if (response.statusCode === 200 || response.statusCode === 0) {
        navigateByRole(response.data.role);
      }
    } catch (err) {
      if (err?.code === ROLE_NOT_ALLOWED_CODE) {
        setError(resolveRoleMismatchMessage());
      } else {
        setError(t('auth.loginGoogleFailed'));
        console.error(err);
      }
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
    handleGoogleSubmit,
  };
};
