const DRAFT_PREFIX = 'quizmate.mocktest.templateDraft';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function buildMockTestDraftKey(scope, workspaceId) {
  return `${DRAFT_PREFIX}.${scope || 'workspace'}.${workspaceId || 'unknown'}`;
}

export function loadMockTestDraft(scope, workspaceId) {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(buildMockTestDraftKey(scope, workspaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveMockTestDraft(scope, workspaceId, draft) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(
      buildMockTestDraftKey(scope, workspaceId),
      JSON.stringify({
        ...draft,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // localStorage can be full or blocked; draft persistence is best effort.
  }
}

export function clearMockTestDraft(scope, workspaceId) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(buildMockTestDraftKey(scope, workspaceId));
  } catch {
    // no-op
  }
}
