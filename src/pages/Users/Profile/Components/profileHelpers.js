export const EMPTY_WALLET_SUMMARY = {
  balance: 0,
  totalAvailableCredits: 0,
  regularCreditBalance: 0,
  planCreditBalance: 0,
  hasActivePlan: false,
  planCreditExpiresAt: null,
};

export function formatNumber(value, lang) {
  const numericValue = Number(value ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US").format(safeValue);
}

export function formatLearningDuration(minutes, lang) {
  const numericMinutes = Number(minutes ?? 0);
  const safeMinutes = Number.isFinite(numericMinutes) ? Math.max(0, Math.round(numericMinutes)) : 0;

  if (safeMinutes < 60) {
    return {
      value: formatNumber(safeMinutes, lang),
      unit: lang === "vi" ? "phút" : "min",
    };
  }

  const hours = safeMinutes / 60;
  const formattedHours = new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
    maximumFractionDigits: hours >= 10 ? 0 : 1,
  }).format(hours);

  return {
    value: formattedHours,
    unit: lang === "vi" ? "giờ" : "hrs",
  };
}

export function formatProfileDate(value, lang) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US");
  } catch {
    return value;
  }
}

export function formatWalletDateTime(value, lang) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString(lang === "vi" ? "vi-VN" : "en-US");
  } catch {
    return value;
  }
}

export function formatRelativeTime(value, lang) {
  if (!value) return "";

  const date = new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return "";

  const secondsFromNow = Math.round((timestamp - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(secondsFromNow);
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absoluteSeconds < 60) return formatter.format(secondsFromNow, "second");
  if (absoluteSeconds < 3600) return formatter.format(Math.round(secondsFromNow / 60), "minute");
  if (absoluteSeconds < 86400) return formatter.format(Math.round(secondsFromNow / 3600), "hour");
  if (absoluteSeconds < 604800) return formatter.format(Math.round(secondsFromNow / 86400), "day");

  return formatProfileDate(value, lang);
}

export function getAvatarLetter(profile) {
  return (
    profile?.fullName?.charAt(0)?.toUpperCase()
    || profile?.username?.charAt(0)?.toUpperCase()
    || profile?.email?.charAt(0)?.toUpperCase()
    || "U"
  );
}

export function getDisplayName(profile) {
  return profile?.fullName || profile?.username || profile?.email || "User";
}

export function getPlanLabel(planSummary, t) {
  return planSummary?.planName || t("profile.subscription.plans.free.name");
}

export function getPlanTier(planSummary) {
  const planName = String(planSummary?.planName || "").toLowerCase();

  if (!planSummary || planName.includes("free") || planName.includes("miễn")) {
    return "free";
  }

  if (planName.includes("elite") || planName.includes("premium") || planName.includes("cao cấp")) {
    return "elite";
  }

  if (planName.includes("pro") || planName.includes("professional") || planName.includes("chuyên")) {
    return "pro";
  }

  return "pro";
}

export function getPlanTone(planSummary) {
  const tier = getPlanTier(planSummary);

  if (tier === "elite") {
    return {
      tier,
      className: "bg-slate-950 text-white shadow-slate-950/20 dark:bg-slate-100 dark:text-slate-950",
      accentClassName: "text-slate-950 dark:text-slate-100",
    };
  }

  if (tier === "pro") {
    return {
      tier,
      className: "bg-amber-400 text-amber-950 shadow-amber-500/25",
      accentClassName: "text-amber-600 dark:text-amber-300",
    };
  }

  return {
    tier,
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
    accentClassName: "text-slate-500 dark:text-slate-300",
  };
}
