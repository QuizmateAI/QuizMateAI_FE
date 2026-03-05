/**
 * Client-side cache cho user profile + subscription
 * Lần load thứ 2 dùng cache → ~500ms thay vì fetch lại
 */

const PROFILE_CACHE_KEY = 'quizmate_user_profile';
const SUBSCRIPTION_CACHE_KEY = 'quizmate_user_subscription';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

function isCacheValid(cached) {
  if (!cached?.timestamp) return false;
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

export function getCachedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    return isCacheValid(cached) ? cached.data : null;
  } catch {
    return null;
  }
}

export function setCachedProfile(profile) {
  try {
    const payload = { data: profile, timestamp: Date.now() };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export function getCachedSubscription() {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    return isCacheValid(cached) ? cached.data : null;
  } catch {
    return null;
  }
}

export function setCachedSubscription(subscription) {
  try {
    const payload = { data: subscription, timestamp: Date.now() };
    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export function clearUserCache() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
  } catch {
    // Ignore
  }
}
