const STORAGE_KEY = 'group_review_workspace_store_v1';
const STORE_VERSION = 1;

export const QUESTION_TYPE_IDS = {
  SINGLE_CHOICE: 1,
  MULTIPLE_CHOICE: 2,
  SHORT_ANSWER: 3,
  TRUE_FALSE: 4,
  FILL_IN_BLANK: 5,
};

const DEFAULT_ID_SEEDS = {
  roadmap: 810000,
  phase: 820000,
  knowledge: 830000,
  quiz: 900000,
  attempt: 950000,
  thread: 980000,
  message: 990000,
};

function hasWindow() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function nowIso() {
  return new Date().toISOString();
}

export function readStore() {
  if (!hasWindow()) {
    return {
      version: STORE_VERSION,
      nextIds: { ...DEFAULT_ID_SEEDS },
      workspaces: {},
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        version: STORE_VERSION,
        nextIds: { ...DEFAULT_ID_SEEDS },
        workspaces: {},
      };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid group review store');
    }

    return {
      version: STORE_VERSION,
      nextIds: {
        ...DEFAULT_ID_SEEDS,
        ...(parsed.nextIds || {}),
      },
      workspaces: parsed.workspaces && typeof parsed.workspaces === 'object'
        ? parsed.workspaces
        : {},
    };
  } catch (error) {
    console.error('[groupReviewMockState] Failed to read store:', error);
    return {
      version: STORE_VERSION,
      nextIds: { ...DEFAULT_ID_SEEDS },
      workspaces: {},
    };
  }
}

export function writeStore(store) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function nextId(store, key) {
  const current = Number(store.nextIds?.[key] || DEFAULT_ID_SEEDS[key] || Date.now());
  store.nextIds[key] = current + 1;
  return current;
}

export function normalizeWorkspaceId(workspaceId) {
  const normalized = Number(workspaceId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export function readActiveUser() {
  if (!hasWindow()) {
    return {
      userId: 0,
      fullName: 'QuizMate User',
      email: 'user@quizmate.local',
      role: 'LEADER',
    };
  }

  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) {
      return {
        userId: 0,
        fullName: 'QuizMate User',
        email: 'user@quizmate.local',
        role: 'LEADER',
      };
    }

    const parsed = JSON.parse(raw);
    const userId = Number(parsed?.id ?? parsed?.userId ?? parsed?.userID);
    return {
      userId: Number.isFinite(userId) ? userId : 0,
      fullName: parsed?.fullName || parsed?.username || parsed?.email || 'QuizMate User',
      email: parsed?.email || 'user@quizmate.local',
      role: String(parsed?.role || 'LEADER').toUpperCase(),
    };
  } catch (error) {
    console.error('[groupReviewMockState] Failed to read active user:', error);
    return {
      userId: 0,
      fullName: 'QuizMate User',
      email: 'user@quizmate.local',
      role: 'LEADER',
    };
  }
}

export function formatPersonName(person, fallback = 'Thanh vien') {
  return person?.fullName || person?.username || person?.email || fallback;
}

export function resolveRoleTone(role) {
  if (role === 'LEADER') return 'LEADER';
  if (role === 'CONTRIBUTOR') return 'CONTRIBUTOR';
  return 'MEMBER';
}
