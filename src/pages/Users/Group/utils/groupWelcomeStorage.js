// Storage helpers cho welcome banner / current user read trên group workspace.
// Tách khỏi page (4000+ dòng) cho dễ test và tránh trùng lặp khi nhiều UI
// surface cần cùng key.

export const GROUP_WELCOME_STORAGE_PREFIX = 'group-invite-welcome';

export function getWelcomeStorageKey(workspaceId) {
  return `${GROUP_WELCOME_STORAGE_PREFIX}:${workspaceId}`;
}

export function readCurrentUser() {
  try {
    const rawUser = window.localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error('Unable to read current user from storage:', error);
    return null;
  }
}
