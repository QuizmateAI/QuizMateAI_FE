import { GoogleOAuthProvider } from '@react-oauth/google';
import { getGoogleClientId } from '@/lib/runtimeConfig';

export function isGoogleAuthEnabled() {
  return Boolean(getGoogleClientId());
}

export default function AuthGoogleProvider({ children }) {
  const googleClientId = getGoogleClientId();
  if (!googleClientId) {
    return children;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {children}
    </GoogleOAuthProvider>
  );
}

