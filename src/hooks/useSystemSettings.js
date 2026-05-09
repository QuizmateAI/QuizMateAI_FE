import { useQuery } from '@tanstack/react-query';
import { getAllSystemSettings } from '@/api/ManagementSystemAPI';

export const SYSTEM_SETTING_KEYS = Object.freeze({
  MAX_QUESTIONS_PER_QUIZ: 'quiz.max_questions_per_quiz',
  MAX_SAVED_TEMPLATES_PER_USER: 'mock_test.max_saved_templates_per_user',
  MAX_COMMENT_LENGTH: 'community.max_comment_length',
  MAX_LINKS_PER_COMMENT: 'community.max_links_per_comment',
  PRE_LEARNING_PASS_PERCENT: 'learning.pre_pass_score_percent',
  POST_LEARNING_PASS_PERCENT: 'learning.post_pass_score_percent',
});

// Defaults mirror BE seed values so the UI stays usable when /system-settings is
// unreachable (network error, or the endpoint is admin-gated for some accounts).
export const SYSTEM_SETTING_DEFAULTS = Object.freeze({
  [SYSTEM_SETTING_KEYS.MAX_QUESTIONS_PER_QUIZ]: 100,
  [SYSTEM_SETTING_KEYS.MAX_SAVED_TEMPLATES_PER_USER]: 100,
  [SYSTEM_SETTING_KEYS.MAX_COMMENT_LENGTH]: 1200,
  [SYSTEM_SETTING_KEYS.MAX_LINKS_PER_COMMENT]: 2,
  [SYSTEM_SETTING_KEYS.PRE_LEARNING_PASS_PERCENT]: 80,
  [SYSTEM_SETTING_KEYS.POST_LEARNING_PASS_PERCENT]: 80,
});

const SYSTEM_SETTINGS_QUERY_KEY = ['systemSettings', 'public'];
const STALE_MS = 10 * 60 * 1000;

function parseNumber(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

function buildLookup(rawList) {
  const lookup = { ...SYSTEM_SETTING_DEFAULTS };
  if (!Array.isArray(rawList)) return lookup;
  for (const item of rawList) {
    const key = item?.key;
    if (!key || !Object.prototype.hasOwnProperty.call(lookup, key)) continue;
    lookup[key] = parseNumber(item.value, lookup[key]);
  }
  return lookup;
}

export function useSystemSettings() {
  const { data } = useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await getAllSystemSettings();
        const list = response?.data?.data ?? response?.data ?? [];
        return buildLookup(list);
      } catch {
        // Endpoint may require admin auth for some users; fall back silently
        // so user-facing limits still apply via the baked-in defaults.
        return { ...SYSTEM_SETTING_DEFAULTS };
      }
    },
    staleTime: STALE_MS,
    gcTime: STALE_MS,
    retry: 0,
    refetchOnWindowFocus: false,
    placeholderData: SYSTEM_SETTING_DEFAULTS,
  });
  return data || SYSTEM_SETTING_DEFAULTS;
}

export function useSystemSettingNumber(key) {
  const settings = useSystemSettings();
  const fallback = SYSTEM_SETTING_DEFAULTS[key] ?? 0;
  const value = settings?.[key];
  return Number.isFinite(value) ? value : fallback;
}

// Anti-spam link count for comments — matches http(s):// and www. prefixed URLs.
export function countLinksInText(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  const re = /(?:https?:\/\/|www\.)\S+/gi;
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

export function useCommentLimits() {
  const settings = useSystemSettings();
  const maxLength = Number.isFinite(settings?.[SYSTEM_SETTING_KEYS.MAX_COMMENT_LENGTH])
    ? settings[SYSTEM_SETTING_KEYS.MAX_COMMENT_LENGTH]
    : SYSTEM_SETTING_DEFAULTS[SYSTEM_SETTING_KEYS.MAX_COMMENT_LENGTH];
  const maxLinks = Number.isFinite(settings?.[SYSTEM_SETTING_KEYS.MAX_LINKS_PER_COMMENT])
    ? settings[SYSTEM_SETTING_KEYS.MAX_LINKS_PER_COMMENT]
    : SYSTEM_SETTING_DEFAULTS[SYSTEM_SETTING_KEYS.MAX_LINKS_PER_COMMENT];
  return { maxLength, maxLinks };
}
