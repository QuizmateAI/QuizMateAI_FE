const parseBoolean = (value, fallbackValue) => {
  if (value == null || value === '') {
    return fallbackValue;
  }

  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
};

const defaultLaunchDate = '2026-04-17T09:00:00+07:00';
const configuredLaunchDate = (import.meta.env.VITE_LAUNCH_DATE || defaultLaunchDate).trim();
const configuredSupportEmail = (import.meta.env.VITE_LAUNCH_SUPPORT_EMAIL || '').trim();
const configuredEarlyAccessUrl = (import.meta.env.VITE_EARLY_ACCESS_URL || '').trim();

export const launchConfig = {
  enabled: parseBoolean(import.meta.env.VITE_LAUNCH_MODE, false),
  brandName: (import.meta.env.VITE_LAUNCH_BRAND_NAME || 'QuizMate').trim(),
  launchDate: configuredLaunchDate,
  supportEmail: configuredSupportEmail,
  earlyAccessUrl: configuredEarlyAccessUrl,
};

export const getLaunchDate = () => {
  const parsedDate = new Date(launchConfig.launchDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const getEarlyAccessHref = () => {
  if (launchConfig.earlyAccessUrl) {
    return launchConfig.earlyAccessUrl;
  }

  if (launchConfig.supportEmail) {
    const subject = encodeURIComponent(`${launchConfig.brandName} early access`);
    return `mailto:${launchConfig.supportEmail}?subject=${subject}`;
  }

  return '#early-access';
};
