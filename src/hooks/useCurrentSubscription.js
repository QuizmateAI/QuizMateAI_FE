import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/api/Authentication";
import { getUserSubscription } from "@/api/ManagementSystemAPI";
import { getCachedSubscription, setCachedSubscription } from "@/Utils/userCache";
import { getRecentPlanPurchase } from "@/Utils/planPurchaseState";

function resolvePlanType(planScope, fallbackType = "INDIVIDUAL") {
  const normalizedScope = String(planScope || "").toUpperCase();

  if (normalizedScope === "WORKSPACE" || normalizedScope === "GROUP" || normalizedScope === "GROUP_WORKSPACE") {
    return "GROUP";
  }

  if (normalizedScope === "USER" || normalizedScope === "INDIVIDUAL") {
    return "INDIVIDUAL";
  }

  return fallbackType;
}

function resolvePlanId(plan) {
  if (!plan || typeof plan !== "object") return "";

  const rawPlanId = plan.planCatalogId ?? plan.planId ?? plan.id ?? "";
  return rawPlanId != null ? String(rawPlanId) : "";
}

export function createPlanSummaryFromSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") return null;

  const plan = subscription.plan ?? subscription;
  const planName = String(plan?.displayName || plan?.planName || "").trim();

  if (!planName) return null;

  return {
    planId: resolvePlanId(plan),
    planName,
    planType: resolvePlanType(plan?.planScope, "INDIVIDUAL"),
    status: String(subscription.status || plan?.status || "ACTIVE").toUpperCase(),
    endDate: subscription.endDate || plan?.endDate || null,
    timestamp: Date.now(),
    source: "subscription",
  };
}

export function createPlanSummaryFromPurchase(purchase) {
  if (!purchase || typeof purchase !== "object") return null;

  const planName = String(purchase.planName || "").trim();
  if (!planName) return null;

  return {
    planId: purchase.planId ? String(purchase.planId) : "",
    planName,
    planType: resolvePlanType(purchase.planType, "INDIVIDUAL"),
    status: "ACTIVE",
    endDate: null,
    timestamp: Number(purchase.timestamp) || Date.now(),
    source: "recent-purchase",
  };
}

function resolveCurrentUserId() {
  const currentUser = getCurrentUser();
  const userId = Number(currentUser?.userID ?? currentUser?.userId ?? currentUser?.id);

  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export function useCurrentSubscription({ enabled = true } = {}) {
  const [subscription, setSubscription] = useState(() => getCachedSubscription());
  const [loading, setLoading] = useState(() => enabled && !getCachedSubscription());
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return null;
    }

    const userId = resolveCurrentUserId();
    if (!userId) {
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getUserSubscription(userId);
      const nextSubscription = response?.data ?? response ?? null;
      setSubscription(nextSubscription);
      setCachedSubscription(nextSubscription);
      return nextSubscription;
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

    const loadSubscription = async () => {
      const userId = resolveCurrentUserId();
      if (!userId) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      if (!subscription) {
        setLoading(true);
      }

      try {
        const response = await getUserSubscription(userId);
        const nextSubscription = response?.data ?? response ?? null;

        if (cancelled) return;

        setSubscription(nextSubscription);
        setCachedSubscription(nextSubscription);
      } catch (err) {
        if (cancelled) return;
        setError(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSubscription();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const summary = useMemo(() => {
    const recentPurchaseSummary = createPlanSummaryFromPurchase(getRecentPlanPurchase());
    return recentPurchaseSummary ?? createPlanSummaryFromSubscription(subscription);
  }, [subscription]);

  return {
    subscription,
    summary,
    loading,
    error,
    refresh,
  };
}
