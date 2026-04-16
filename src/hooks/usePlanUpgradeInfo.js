import { useEffect, useMemo, useState } from "react";
import { getActiveUserPlans } from "@/api/ManagementSystemAPI";
import { buildPaymentsPath, buildPlansPath, withQueryParams } from "@/lib/routePaths";
import { useCurrentSubscription } from "@/hooks/useCurrentSubscription";

const PLAN_CATALOG_CACHE_KEY = "quizmate_active_user_plan_catalog";
const PLAN_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

function readCachedPlanCatalog() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PLAN_CATALOG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || Date.now() - Number(parsed.timestamp) >= PLAN_CATALOG_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(PLAN_CATALOG_CACHE_KEY);
      return null;
    }

    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}

function writeCachedPlanCatalog(items) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      PLAN_CATALOG_CACHE_KEY,
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
} = {}) {
  const shouldLoadCatalog = enabled && Boolean(featureEntitlementKey);
  const { summary } = useCurrentSubscription({ enabled });
  const [plans, setPlans] = useState(() => readCachedPlanCatalog());
  const [loading, setLoading] = useState(() => shouldLoadCatalog && !readCachedPlanCatalog());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shouldLoadCatalog) {
      setLoading(false);
      return undefined;
    }

    const cachedPlans = readCachedPlanCatalog();
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
        const response = await getActiveUserPlans();
        const normalizedPlans = unwrapPlanCatalogResponse(response)
          .map(normalizePlanCatalogItem)
          .filter(Boolean);

        if (cancelled) return;

        setPlans(normalizedPlans);
        writeCachedPlanCatalog(normalizedPlans);
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
  }, [shouldLoadCatalog]);

  const requiredPlan = useMemo(() => {
    if (!shouldLoadCatalog || !Array.isArray(plans)) return null;

    return [...plans]
      .filter((plan) => plan?.status === "ACTIVE")
      .filter((plan) => Boolean(plan?.entitlement?.[featureEntitlementKey]))
      .sort((left, right) => Number(left.price || 0) - Number(right.price || 0))[0] ?? null;
  }, [featureEntitlementKey, plans, shouldLoadCatalog]);

  const upgradePath = useMemo(() => {
    if (requiredPlan?.planId) {
      return withQueryParams(buildPaymentsPath(), { planId: requiredPlan.planId });
    }

    return buildPlansPath();
  }, [requiredPlan?.planId]);

  return {
    currentPlanName: String(summary?.planName || "").trim(),
    requiredPlanName: String(requiredPlan?.planName || "").trim(),
    requiredPlanId: String(requiredPlan?.planId || "").trim(),
    upgradePath,
    loading,
    error,
  };
}
