import api from "@/api/api";
import { clearUserCache } from "@/utils/userCache";
import { getAccessToken } from "@/utils/tokenStorage";

// Back-compat passthrough: ProfileAPI.js imports `getStoredToken` from this module. Now that
// ProfilePreferencesAPI uses the shared axios instance (which reads the token itself via the
// request interceptor), this passthrough is purely there for those legacy callers and can be
// replaced with a direct import of getAccessToken when convenient.
function getStoredToken() {
  return getAccessToken();
}

// PR7: this module previously used raw fetch with its own URL/auth/refresh logic that
// silently diverged from the shared axios interceptor — eg if the user changed language
// while a refresh was in flight, the fetch call could 401 against a token the shared
// instance had already rotated. Now we share `api` so the interceptor handles auth,
// retry, refresh, rate-limit eventing, etc. uniformly.

async function updateProfilePreference(payload) {
  // The shared axios instance attaches the access token + handles 401 → refresh → retry
  // automatically. A genuinely-expired refresh redirects to /login, so we just propagate
  // the error and let the caller decide whether to surface it.
  const response = await api.put("/user/profile", payload);
  clearUserCache();
  return response?.data ?? payload;
}

async function updateUserPreferredLanguage(language) {
  const normalized = typeof language === "string" ? language.trim().toLowerCase() : "";
  if (!normalized) return null;

  try {
    const result = await updateProfilePreference({ preferredLanguage: normalized });
    return result ? normalized : null;
  } catch (error) {
    console.warn("[ProfileAPI] Failed to persist preferred language:", error);
    return null;
  }
}

async function updateUserThemeMode(themeMode) {
  const normalized = typeof themeMode === "string" ? themeMode.trim().toLowerCase() : "";
  if (!normalized) return null;

  try {
    const result = await updateProfilePreference({ themeMode: normalized });
    return result ? normalized : null;
  } catch (error) {
    console.warn("[ProfileAPI] Failed to persist theme mode:", error);
    return null;
  }
}

export { getStoredToken, updateUserPreferredLanguage, updateUserThemeMode };
