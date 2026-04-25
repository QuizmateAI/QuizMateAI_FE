import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = typeof import.meta.env.VITE_GOOGLE_CLIENT_ID === 'string'
  ? import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()
  : '';

export function isGoogleAuthEnabled() {
  return Boolean(googleClientId);
}

export default function AuthGoogleProvider({ children }) {
  if (!googleClientId) {
    return children;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
