import { useEffect, useMemo, useState } from "react";
import { getActiveGroupPlan, getActiveUserPlans } from "@/api/ManagementSystemAPI";
import { buildPaymentsPath, buildPlansPath, withQueryParams } from "@/lib/routePaths";
import { useCurrentSubscription } from "@/hooks/useCurrentSubscription";

const PLAN_CATALOG_CACHE_KEY_PREFIX = "quizmate_active_plan_catalog";
const PLAN_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

function getPlanCatalogCacheKey(planScope) {
  return `${PLAN_CATALOG_CACHE_KEY_PREFIX}:${String(planScope || "INDIVIDUAL").toUpperCase()}`;
}

function readCachedPlanCatalog(planScope) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(getPlanCatalogCacheKey(planScope));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || Date.now() - Number(parsed.timestamp) >= PLAN_CATALOG_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(getPlanCatalogCacheKey(planScope));
      return null;
    }

    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}

function writeCachedPlanCatalog(planScope, items) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getPlanCatalogCacheKey(planScope),
      JSON.stringify({
        items,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore storage write errors.
  }
}

function unwrapPlanCatalogResponse(response) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(payload) ? payload : [];
}

function normalizePlanCatalogItem(item) {
  if (!item || typeof item !== "object") return null;

  const planId = item.planCatalogId ?? item.planId ?? item.id ?? null;
  const planName = String(item.displayName || item.planName || item.code || "").trim();

  if (!planName && planId == null) {
    return null;
  }

  return {
    planId: planId != null ? String(planId) : "",
    planName,
    price: Number(item.price) || 0,
    status: String(item.status || "ACTIVE").toUpperCase(),
    entitlement: item.entitlement ?? {},
  };
}

export function usePlanUpgradeInfo({
  featureEntitlementKey,
  enabled = true,
  planScope = "INDIVIDUAL",
  workspaceId = null,
  currentPlanSummaryOverride = null,
} = {}) {
  const normalizedPlanScope = String(planScope || "INDIVIDUAL").toUpperCase();
  const shouldLoadCatalog = enabled && Boolean(featureEntitlementKey);
  const { summary } = useCurrentSubscription({ enabled });
  const currentPlanSummary = currentPlanSummaryOverride ?? summary;
  const [plans, setPlans] = useState(() => readCachedPlanCatalog(normalizedPlanScope));
  const [loading, setLoading] = useState(() => shouldLoadCatalog && !readCachedPlanCatalog(normalizedPlanScope));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shouldLoadCatalog) {
      setLoading(false);
      return undefined;
    }

    const cachedPlans = readCachedPlanCatalog(normalizedPlanScope);
    if (cachedPlans) {
      setPlans(cachedPlans);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadPlans = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = normalizedPlanScope === "GROUP"
          ? await getActiveGroupPlan()
          : await getActiveUserPlans();
        const normalizedPlans = unwrapPlanCatalogResponse(response)
          .map(normalizePlanCatalogItem)
          .filter(Boolean);

        if (cancelled) return;

        setPlans(normalizedPlans);
        writeCachedPlanCatalog(normalizedPlanScope, normalizedPlans);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [normalizedPlanScope, shouldLoadCatalog]);

  const requiredPlan = useMemo(() => {
    if (!shouldLoadCatalog || !Array.isArray(plans)) return null;

    return [...plans]
      .filter((plan) => plan?.status === "ACTIVE")
      .filter((plan) => Boolean(plan?.entitlement?.[featureEntitlementKey]))
      .sort((left, right) => Number(left.price || 0) - Number(right.price || 0))[0] ?? null;
  }, [featureEntitlementKey, plans, shouldLoadCatalog]);

  const upgradePath = useMemo(() => {
    if (requiredPlan?.planId) {
      return withQueryParams(buildPaymentsPath(), normalizedPlanScope === "GROUP"
        ? { planId: requiredPlan.planId, planType: "GROUP", workspaceId }
        : { planId: requiredPlan.planId });
    }

    return buildPlansPath();
  }, [normalizedPlanScope, requiredPlan?.planId, workspaceId]);

  return {
    currentPlanName: String(currentPlanSummary?.planName || "").trim(),
    requiredPlanName: String(requiredPlan?.planName || "").trim(),
    requiredPlanId: String(requiredPlan?.planId || "").trim(),
    upgradePath,
    loading,
    error,
  };
}
