import { useCallback, useEffect, useState } from "react";
import { getCurrentUserPlan } from "@/api/ManagementSystemAPI";

const CACHE_KEY = "quizmate_plan_entitlements";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedEntitlements() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { entitlements, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entitlements;
  } catch {
    return null;
  }
}

function setCachedEntitlements(entitlements) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ entitlements, expiresAt: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

export function invalidatePlanEntitlementsCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Hook that fetches the current user's plan entitlements and exposes
 * flat boolean helpers for feature gating in the UI.
 *
 * All boolean helpers default to false while loading to prevent
 * premature feature unlocking.
 */
export function usePlanEntitlements({ enabled = true } = {}) {
  const [entitlements, setEntitlements] = useState(() => getCachedEntitlements());
  const [loading, setLoading] = useState(() => enabled && !getCachedEntitlements());
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    invalidatePlanEntitlementsCache();
    setLoading(true);
    setError(null);
    try {
      const response = await getCurrentUserPlan();
      const plan = response?.data ?? response ?? null;
      // Path: CurrentPlanResponse → plan (PlanCatalogResponse) → entitlement (PlanEntitlementResponse)
      const ent = plan?.plan?.entitlement ?? null;
      setEntitlements(ent);
      if (ent) setCachedEntitlements(ent);
      return ent;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      const cached = getCachedEntitlements();
      if (cached) {
        if (!cancelled) setEntitlements(cached);
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await getCurrentUserPlan();
        const plan = response?.data ?? response ?? null;
        const ent = plan?.plan?.entitlement ?? null;
        if (cancelled) return;
        setEntitlements(ent);
        if (ent) setCachedEntitlements(ent);
      } catch (err) {
        if (cancelled) return;
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const e = entitlements;

  return {
    entitlements: e,
    loading,
    error,
    refresh,

    // --- File upload permissions ---
    canUploadPdf:   e?.canProcessPdf   ?? false,
    canUploadWord:  e?.canProcessWord  ?? false,
    canUploadSlide: e?.canProcessSlide ?? false,
    canUploadExcel: e?.canProcessExcel ?? false,
    canUploadText:  e?.canProcessText  ?? false,
    canUploadImage: e?.canProcessImage ?? false,
    canUploadAudio: e?.canProcessAudio ?? false,
    canUploadVideo: e?.canProcessVideo ?? false,

    // --- Feature permissions ---
    canCreateRoadmap:           e?.canCreateRoadMap            ?? false,
    hasAdvanceQuizConfig:       e?.hasAdvanceQuizConfig        ?? false,
    hasAiCompanionMode:         e?.hasAiCompanionMode          ?? false,
    hasWorkspaceAnalytics:      e?.hasWorkspaceAnalytics       ?? false,
    hasAiSummaryAndTextReading: e?.hasAiSummaryAndTextReading  ?? false,

    // --- Structural limits ---
    maxWorkspaces:            e?.maxIndividualWorkspace   ?? 0,
    maxMaterialsPerWorkspace: e?.maxMaterialInWorkspace   ?? 0,
  };
}
