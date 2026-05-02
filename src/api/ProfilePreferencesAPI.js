import { clearUserCache } from "@/utils/userCache";
import { clearPlanPurchaseState } from "@/utils/planPurchaseState";
import { clearTokens, getAccessToken } from "@/utils/tokenStorage";

const configuredBaseUrl = typeof import.meta.env.VITE_API_BASE_URL === "string"
  ? import.meta.env.VITE_API_BASE_URL.trim()
  : "";
const baseURL = import.meta.env.DEV ? "/api" : (configuredBaseUrl || "/api");
const profileEndpoint = `${baseURL.replace(/\/+$/, "")}/user/profile`;
const isNgrokUrl = /ngrok-free\.(app|dev)/i.test(configuredBaseUrl || baseURL);

function getStoredToken() {
  return getAccessToken();
}

function getPreferenceHeaders(token) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(isNgrokUrl ? { "ngrok-skip-browser-warning": "true" } : {}),
  };
}

function handleUnauthorizedPreferenceResponse() {
  clearTokens();
  try {
    localStorage.removeItem("user");
  } catch {
    /* storage disabled */
  }
  clearUserCache();
  clearPlanPurchaseState();
  window.location.href = "/login";
}

async function updateProfilePreference(payload) {
  const token = getStoredToken();
  if (!token) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(profileEndpoint, {
      method: "PUT",
      headers: getPreferenceHeaders(token),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.status === 401) {
      handleUnauthorizedPreferenceResponse();
    }

    if (!response.ok) {
      throw new Error(`Failed to update profile preference: ${response.status}`);
    }

    clearUserCache();
    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
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
