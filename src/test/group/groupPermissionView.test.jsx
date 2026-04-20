import { describe, expect, it } from 'vitest';
import { resolveGroupUiPermissions } from '@/Pages/Users/Group/utils/groupPermissionView';

describe('groupPermissionView', () => {
  it('uses myGroupPermissions to override fallback gating', () => {
    const result = resolveGroupUiPermissions({
      myGroupPermissions: {
        canCreateQuiz: false,
        canCreateFlashcard: true,
        canUpload: true,
        canManageMembers: false,
        canViewMemberDashboard: true,
      },
      fallbackCanCreateContent: true,
      fallbackCanUploadSource: false,
      fallbackCanManageMembers: true,
      fallbackCanViewMemberDashboard: false,
    });

    expect(result.canCreateQuiz).toBe(false);
    expect(result.canCreateFlashcard).toBe(true);
    expect(result.canCreateContent).toBe(false);
    expect(result.canUploadSource).toBe(true);
    expect(result.canManageMembers).toBe(false);
    expect(result.canViewMemberDashboard).toBe(true);
  });

  it('falls back to role-derived values when permissions are unavailable', () => {
    const result = resolveGroupUiPermissions({
      myGroupPermissions: null,
      fallbackCanCreateContent: true,
      fallbackCanUploadSource: true,
      fallbackCanManageMembers: false,
      fallbackCanViewMemberDashboard: false,
    });

    expect(result.canCreateQuiz).toBe(true);
    expect(result.canCreateFlashcard).toBe(true);
    expect(result.canCreateContent).toBe(true);
    expect(result.canUploadSource).toBe(true);
    expect(result.canManageMembers).toBe(false);
    expect(result.canViewMemberDashboard).toBe(false);
  });
});
