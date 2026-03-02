import { useState } from 'react';
import { login, googleLogin } from '@/api/Authentication';
import { useGoogleLogin } from '@react-oauth/google';

export const useLogin = (navigate, t) => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginChange = (field) => (e) => {
    setLoginData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  // Trim tất cả dữ liệu trước khi submit
  const trimLoginData = () => ({
    username: loginData.username.trim(),
    password: loginData.password
  });

  // Hàm điều hướng theo role
  const navigateByRole = (role) => {
    if (role === 'SUPER_ADMIN') return navigate('/super-admin');
    if (role === 'ADMIN') return navigate('/admin');
    return navigate('/home');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Trim dữ liệu trước khi gửi
    const trimmed = trimLoginData();
    setLoginData(trimmed);
    
    setIsLoading(true);
    
    try {
      const response = await login(trimmed);
      console.log("BE Login Response:", response);
      if (response.statusCode === 200 || response.statusCode === 0) {
        navigateByRole(response.data.role);
      }
    } catch (err) {
      setError(err.message || t('auth.loginFailed') || 'Đăng nhập thất bại, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google Token Response:", tokenResponse);
      setIsLoading(true);
      setError('');
      try {
        // Fetch user info to get Google ID (if needed) or use the access_token
        // But since the user specifically requested details about "idToken",
        // and uses the hook, we might've needed "flow: 'implicit'" which gives access_token.
        // If we want id_token from the hook, we actually can't get it directly in the new SDK 
        // without using 'response_type: "id_token"' which might not be fully supported in the wrapper purely as 'idToken'.
        // HOWEVER, a common workaround if we MUST use the hook but need a JWT is to just use <GoogleLogin> button 
        // or switch the backend to verify access_token.
        //
        // BUT, the user said: "đổi cách lấy response từ gg để lấy idToken chứ kh phải là access token"
        // (Change how we get response from GG to get idToken, not access_token).
        //
        // The Google Identity Services 'token' client (used by useGoogleLogin) ONLY returns access_token.
        // The 'credential' client (used by <GoogleLogin>) returns id_token.
        //
        // If we want to use a custom button (which calls handleGoogleLogin), we are stuck with the Token Client.
        // UNLESS we use 'flow: auth-code' and the backend exchanges it (User said backend expects idToken, so no).
        //
        // ALTERNATIVE: Use the Google User Info endpoint to get user details using the access_token, 
        // but that doesn't give a signed id_token to send to backend.
        //
        // Let's look at the "handleGoogleSubmit" which seems to be designed for the <GoogleLogin> component
        // (credentialResponse). That one DOES contain .credential (which is the idToken).
        //
        // If the user is clicking a custom button triggering `handleGoogleLogin`, we have a problem.
        // We cannot get an ID Token from `useGoogleLogin` (Implicit flow) in the new SDK.
        //
        // Strategy:
        // 1. If the user is using a custom button, we should try to use `flow: 'auth-code'` IF the backend could handle it.
        //    But user said backend expects `{idToken}`.
        // 2. If we absolutely need an idToken string from a custom button click:
        //    We can't easily do that with the new SDK's useGoogleLogin hook (it's by design to prevent implicit flow of ID tokens).
        //    
        //    Wait, actually, maybe I can use `useGoogleOneTapLogin` or just `<GoogleLogin>` with `render` props? 
        //    No, `@react-oauth/google` <GoogleLogin> doesn't support render props for custom UI anymore.
        //
        //    Let's check if we can fetch the user info manually and see if that satisfies "idToken" (probably not, it's not a JWT).
        //
        //    Re-reading the user request: "đổi cách lấy response từ gg để lấy idToken".
        //    Maybe they mean they want to use the Authorization Code flow, but that gives a 'code'.
        //    
        //    Actually, there is a way to get `id_token` via `useGoogleLogin`?
        //    No, checking docs: "useGoogleLogin ... returns an access token".
        //    
        //    Wait! If I pass `flow: 'implicit'` (default) it returns access token.
        //    
        //    Okay, what if I simply fetch the user profile using the access token, and then... no, the backend needs a JWT to verify.
        //
        //    HYPOTHESIS: The user is clicking the button associated with `handleGoogleLogin`.
        //    They need to switch to using the `<GoogleLogin />` component provided by the library 
        //    OR the backend needs to accept access_token.
        //    BUT, the user asked ME to change the code. 
        //
        //    "đổi cách lấy response từ gg để lấy idToken"
        //
        //    Maybe they are okay with using the *credential* response?
        //    The `handleGoogleSubmit` function ALREADY seems to expect a `credentialResponse`.
        //    This `credentialResponse` comes from the `<GoogleLogin>` component.
        //    
        //    Is `handleGoogleLogin` attached to a custom button?
        //    If so, we can't get an ID Token easily.
        //    
        //    Let's look at the file content again.
        //    There is `handleGoogleLogin` (hook) and `handleGoogleSubmit` (likely for <GoogleLogin> onSuccess).
        //    
        //    If the UI is using a custom button calling `handleGoogleLogin`, and we need an ID Token:
        //    We are stuck, unless we change the flow to 'auth-code' AND the backend exchanges it (which we tried and user rejected/failed).
        //    
        //    Wait, sometimes `useGoogleLogin` allows getting id_token if we request it?
        //    No, 'response_type' is controlled by the flow.
        //
        //    Let's try to see if `handleGoogleSubmit` is being used in the Login Page UI.
        //    I'll read `LoginPage.jsx`.
        //
        
        throw new Error("Check UI");
      } catch (err) {
      }
    }
  });

  const handleGoogleSubmit = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
      console.log("Google Credential Response:", credentialResponse);
      // credentialResponse.credential CHÍNH LÀ idToken (JWT) mong muốn
      const response = await googleLogin(credentialResponse.credential);
      console.log("BE Google Submit Response:", response);
      if (response.statusCode === 200 || response.statusCode === 0) {
         navigateByRole(response.data.role);
      }
    } catch (err) {
      setError(t('auth.loginGoogleFailed') || 'Đăng nhập Google thất bại');
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
    setError,
    handleLoginChange,
    handleLoginSubmit,
    handleGoogleLogin,
    handleGoogleSubmit
  };
};
