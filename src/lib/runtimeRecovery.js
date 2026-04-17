const RUNTIME_RECOVERY_STORAGE_KEY = 'quizmate.runtimeRecovery';
export const RUNTIME_RECOVERY_TTL_MS = 30_000;

const RECOVERABLE_RUNTIME_ERROR_PATTERN =
  /(chunkloaderror|loading chunk [\w-]+ failed|loading css chunk [\w-]+ failed|failed to fetch dynamically imported module|failed to load module script|importing a module script failed)/i;

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getCurrentUrl() {
  if (typeof window === 'undefined') {
    return '/';
  }

  const { pathname = '/', search = '', hash = '' } = window.location || {};
  return `${pathname}${search}${hash}`;
}

function normalizeErrorMessage(error) {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error.trim();
  }

  if (typeof error?.message === 'string') {
    return error.message.trim();
  }

  if (typeof error?.reason?.message === 'string') {
    return error.reason.message.trim();
  }

  return '';
}

function isAssetElement(target) {
  const tagName = String(target?.tagName || '').toUpperCase();
  return tagName === 'SCRIPT' || tagName === 'LINK';
}

function isRecoverableAssetTarget(target) {
  if (!isAssetElement(target)) {
    return false;
  }

  const assetUrl = String(target?.src || target?.href || '').trim();
  if (!assetUrl) {
    return false;
  }

  return /\/assets\/|\.js($|\?)|\.css($|\?)/i.test(assetUrl);
}

function serializeAttempt(attempt) {
  try {
    return JSON.stringify(attempt);
  } catch {
    return '';
  }
}

export function readRuntimeRecoveryAttempt(storage = getSessionStorage()) {
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(RUNTIME_RECOVERY_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }

    return {
      url: String(parsedValue.url || ''),
      ts: Number(parsedValue.ts || 0),
    };
  } catch {
    return null;
  }
}

function writeRuntimeRecoveryAttempt(attempt, storage = getSessionStorage()) {
  if (!storage) {
    return;
  }

  const serializedAttempt = serializeAttempt(attempt);
  if (!serializedAttempt) {
    return;
  }

  try {
    storage.setItem(RUNTIME_RECOVERY_STORAGE_KEY, serializedAttempt);
  } catch {
    // Ignore storage write failures and fall back to manual reload UX.
  }
}

export function isRecoverableRuntimeError(error) {
  if (!error) {
    return false;
  }

  if (isRecoverableAssetTarget(error?.target ?? error)) {
    return true;
  }

  const message = normalizeErrorMessage(error);
  if (!message) {
    return false;
  }

  return RECOVERABLE_RUNTIME_ERROR_PATTERN.test(message);
}

function hasRecentAttempt(attempt, currentUrl, now) {
  if (!attempt?.url || !attempt?.ts) {
    return false;
  }

  return attempt.url === currentUrl && now - attempt.ts < RUNTIME_RECOVERY_TTL_MS;
}

function defaultReload() {
  window.location.reload();
}

export function tryScheduleRuntimeRecovery(
  error,
  {
    storage = getSessionStorage(),
    reload = defaultReload,
    reloadDelayMs = 120,
    currentUrl = getCurrentUrl(),
    now = Date.now(),
  } = {},
) {
  if (!isRecoverableRuntimeError(error) || !storage) {
    return false;
  }

  const lastAttempt = readRuntimeRecoveryAttempt(storage);
  if (hasRecentAttempt(lastAttempt, currentUrl, now)) {
    return false;
  }

  writeRuntimeRecoveryAttempt({ url: currentUrl, ts: now }, storage);

  if (reloadDelayMs > 0) {
    window.setTimeout(() => {
      reload();
    }, reloadDelayMs);
  } else {
    reload();
  }

  return true;
}

let removeRuntimeRecoveryListeners = null;

export function installRuntimeRecoveryListeners() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (removeRuntimeRecoveryListeners) {
    return removeRuntimeRecoveryListeners;
  }

  const handleWindowError = (event) => {
    tryScheduleRuntimeRecovery(event?.error ?? event?.target ?? event);
  };

  const handleUnhandledRejection = (event) => {
    tryScheduleRuntimeRecovery(event?.reason ?? event);
  };

  window.addEventListener('error', handleWindowError, true);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  removeRuntimeRecoveryListeners = () => {
    window.removeEventListener('error', handleWindowError, true);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    removeRuntimeRecoveryListeners = null;
  };

  return removeRuntimeRecoveryListeners;
}
