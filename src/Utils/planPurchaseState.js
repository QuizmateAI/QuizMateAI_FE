const PENDING_PLAN_PURCHASE_KEY = "quizmate_pending_plan_purchase";
const RECENT_PLAN_PURCHASE_KEY = "quizmate_recent_plan_purchase";
const PENDING_PLAN_TTL_MS = 2 * 60 * 60 * 1000;
const RECENT_PLAN_TTL_MS = 24 * 60 * 60 * 1000;

function readStorageValue(key) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorageValue(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors.
  }
}

function removeStorageValue(key) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage remove errors.
  }
}

function isStillValid(record, ttlMs) {
  if (!record?.timestamp) return false;
  return Date.now() - Number(record.timestamp) < ttlMs;
}

function normalizePurchase(payload) {
  if (!payload || typeof payload !== "object") return null;

  const planName = String(payload.planName || "").trim();
  const normalizedPlanId = payload.planId != null ? String(payload.planId) : "";

  if (!planName && !normalizedPlanId) {
    return null;
  }

  return {
    planId: normalizedPlanId,
    planName,
    planType: String(payload.planType || "INDIVIDUAL").toUpperCase(),
    workspaceId: payload.workspaceId != null ? String(payload.workspaceId) : "",
    orderId: payload.orderId != null ? String(payload.orderId) : "",
    timestamp: Number(payload.timestamp) || Date.now(),
  };
}

export function setPendingPlanPurchase(payload) {
  const normalized = normalizePurchase(payload);
  if (!normalized) return;

  writeStorageValue(PENDING_PLAN_PURCHASE_KEY, normalized);
}

export function getPendingPlanPurchase() {
  const record = normalizePurchase(readStorageValue(PENDING_PLAN_PURCHASE_KEY));
  if (!isStillValid(record, PENDING_PLAN_TTL_MS)) {
    removeStorageValue(PENDING_PLAN_PURCHASE_KEY);
    return null;
  }

  return record;
}

export function clearPendingPlanPurchase() {
  removeStorageValue(PENDING_PLAN_PURCHASE_KEY);
}

export function clearRecentPlanPurchase() {
  removeStorageValue(RECENT_PLAN_PURCHASE_KEY);
}

export function clearPlanPurchaseState() {
  clearPendingPlanPurchase();
  clearRecentPlanPurchase();
}

export function markPendingPlanPurchaseSucceeded() {
  const pendingPurchase = getPendingPlanPurchase();
  if (!pendingPurchase) return null;

  const recentPurchase = {
    ...pendingPurchase,
    timestamp: Date.now(),
  };

  writeStorageValue(RECENT_PLAN_PURCHASE_KEY, recentPurchase);
  clearPendingPlanPurchase();

  return recentPurchase;
}

export function getRecentPlanPurchase() {
  const record = normalizePurchase(readStorageValue(RECENT_PLAN_PURCHASE_KEY));
  if (!isStillValid(record, RECENT_PLAN_TTL_MS)) {
    removeStorageValue(RECENT_PLAN_PURCHASE_KEY);
    return null;
  }

  return record;
}
