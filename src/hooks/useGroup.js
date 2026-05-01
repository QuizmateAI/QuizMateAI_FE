import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapApiData } from '@/utils/apiResponse';
import { STALE_TIME } from '@/lib/queryClient';
import {
  getMyJoinedGroups,
  getPublicGroups as getPublicGroupsAPI,
  joinPublicGroup as joinPublicGroupAPI,
  createGroup as createGroupAPI,
  getGroupMembers as getGroupMembersAPI,
  grantUpload as grantUploadAPI,
  revokeUpload as revokeUploadAPI,
  updateMemberRole as updateMemberRoleAPI,
  inviteMember as inviteMemberAPI,
  getPendingInvitations as getPendingInvitationsAPI,
  cancelInvitation as cancelInvitationAPI,
  resendInvitation as resendInvitationAPI,
  getGroupLogs as getGroupLogsAPI,
  getGroupMyPermissions as getGroupMyPermissionsAPI,
  getGroupMemberPermissions as getGroupMemberPermissionsAPI,
  syncGroupMemberPermissions as syncGroupMemberPermissionsAPI,
  removeMember as removeMemberAPI,
  getGroupDashboardSummary as getGroupDashboardSummaryAPI,
  getMemberDashboardCards as getMemberDashboardCardsAPI,
  getMemberDashboardDetail as getMemberDashboardDetailAPI,
  getGroupLearningSnapshotsLatest as getGroupLearningSnapshotsLatestAPI,
  getGroupLearningSnapshotsSummary as getGroupLearningSnapshotsSummaryAPI,
  getGroupLearningSnapshotsRanking as getGroupLearningSnapshotsRankingAPI,
  generateGroupLearningSnapshots as generateGroupLearningSnapshotsAPI,
  getGroupMemberLearningSnapshotLatest as getGroupMemberLearningSnapshotLatestAPI,
  getGroupMemberLearningSnapshots as getGroupMemberLearningSnapshotsAPI,
  getGroupMemberLearningSnapshotTrend as getGroupMemberLearningSnapshotTrendAPI,
  compareGroupMemberLearningSnapshots as compareGroupMemberLearningSnapshotsAPI,
  generateGroupMemberLearningSnapshot as generateGroupMemberLearningSnapshotAPI,
} from '@/api/GroupAPI';

const GROUPS_QUERY_KEY = ['groups'];
const PUBLIC_GROUPS_QUERY_KEY = ['groups', 'public'];

// Per-group cache keys. Imperative fetch* helpers below route through
// queryClient.fetchQuery using these keys, so repeated calls within
// staleTime serve from cache instead of re-hitting the API. Mutations on
// the same workspace invalidate the matching prefix.
const groupMembersKey = (workspaceId, page, size) => ['group', workspaceId, 'members', page, size];
const groupMembersPrefix = (workspaceId) => ['group', workspaceId, 'members'];
const groupInvitationsKey = (workspaceId) => ['group', workspaceId, 'invitations'];
const groupLogsKey = (workspaceId) => ['group', workspaceId, 'logs'];
const groupMyPermissionsKey = (workspaceId) => ['group', workspaceId, 'myPermissions'];
const groupMemberPermissionsKey = (workspaceId, memberId) => ['group', workspaceId, 'memberPermissions', memberId];
const groupDashboardKey = (workspaceId) => ['group', workspaceId, 'dashboard'];
const groupMemberDashboardCardsKey = (workspaceId, page, size) => ['group', workspaceId, 'memberDashboardCards', page, size];
const groupMemberDashboardDetailKey = (workspaceId, memberId, attemptMode) => ['group', workspaceId, 'memberDashboardDetail', memberId, attemptMode];
const groupSnapshotsPrefix = (workspaceId) => ['group', workspaceId, 'snapshots'];
const groupSnapshotsSummaryKey = (workspaceId, options) => ['group', workspaceId, 'snapshots', 'summary', options];
const groupSnapshotsLatestKey = (workspaceId, options) => ['group', workspaceId, 'snapshots', 'latest', options];
const groupSnapshotsRankingKey = (workspaceId, options) => ['group', workspaceId, 'snapshots', 'ranking', options];
const memberSnapshotLatestKey = (workspaceId, memberId, options) => ['group', workspaceId, 'snapshots', 'member', memberId, 'latest', options];
const memberSnapshotListKey = (workspaceId, memberId, options) => ['group', workspaceId, 'snapshots', 'member', memberId, 'list', options];
const memberSnapshotTrendKey = (workspaceId, memberId, options) => ['group', workspaceId, 'snapshots', 'member', memberId, 'trend', options];
const memberSnapshotCompareKey = (workspaceId, memberId, fromId, toId) => ['group', workspaceId, 'snapshots', 'member', memberId, 'compare', fromId, toId];

const emptyPage = (size = 20) => ({
  content: [],
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size,
  first: true,
  last: true,
});

// Hook quản lý toàn bộ logic group: CRUD + members + invitations
export function useGroup(options = {}) {
  const { enabled = true, publicEnabled = enabled } = options;
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading: loading, error: queryError, refetch: fetchGroups } = useQuery({
    queryKey: GROUPS_QUERY_KEY,
    queryFn: async () => {
      const res = await getMyJoinedGroups();
      const rawGroups = unwrapApiData(res) ?? [];
      return Array.isArray(rawGroups)
        ? rawGroups.map((group) => {
          const memberRole = String(group?.memberRole || 'MEMBER').toUpperCase();
          const normalizedTitle = group?.groupName ?? group?.displayTitle ?? group?.name ?? '';
          const normalizedCount = Number(group?.memberCount);

          return {
            ...group,
            workspaceId: group?.workspaceId ?? group?.id ?? null,
            groupName: normalizedTitle,
            displayTitle: normalizedTitle,
            name: normalizedTitle,
            memberRole,
            description: group?.description ?? '',
            memberCount: Number.isFinite(normalizedCount) ? normalizedCount : 0,
            status: group?.status ?? group?.memberStatus ?? null,
            joinedAt: group?.joinedAt ?? null,
            createdAt: group?.createdAt ?? null,
          };
        })
        : [];
    },
    enabled,
    // Group membership/role changes propagate over WebSocket; keep cache short
    // so the UI rebinds quickly when invalidate isn't fired (e.g. role updated
    // by another leader while this tab was idle).
    staleTime: STALE_TIME.REALTIME,
  });

  const {
    data: publicGroups = [],
    isLoading: publicGroupsLoading,
    error: publicGroupsQueryError,
    refetch: fetchPublicGroups,
  } = useQuery({
    queryKey: PUBLIC_GROUPS_QUERY_KEY,
    queryFn: async () => {
      const res = await getPublicGroupsAPI();
      const rawGroups = unwrapApiData(res) ?? [];
      return Array.isArray(rawGroups) ? rawGroups : [];
    },
    enabled: publicEnabled,
    // Public group catalog is semi-static: new groups appear infrequently. SHORT
    // gives a fresh listing for users hopping between the discover and joined tabs.
    staleTime: STALE_TIME.SHORT,
  });

  const error = queryError?.message || publicGroupsQueryError?.message || null;

  // Tạo nhóm mới
  const createGroup = useCallback(async (data) => {
    const res = await createGroupAPI(data);
    await queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    return unwrapApiData(res);
  }, [queryClient]);

  const joinPublicGroup = useCallback(async (workspaceId) => {
    const res = await joinPublicGroupAPI(workspaceId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PUBLIC_GROUPS_QUERY_KEY }),
    ]);
    return unwrapApiData(res);
  }, [queryClient]);

  // Lấy danh sách thành viên của nhóm
  const fetchMembers = useCallback(async (workspaceId, page = 0, size = 50) => (
    queryClient.fetchQuery({
      queryKey: groupMembersKey(workspaceId, page, size),
      queryFn: async () => {
        const res = await getGroupMembersAPI(workspaceId, page, size);
        const pageData = unwrapApiData(res);
        return Array.isArray(pageData?.content) ? pageData.content : [];
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  // Cấp quyền upload cho thành viên
  const grantUpload = useCallback(async (workspaceId, memberId) => {
    await grantUploadAPI(workspaceId, memberId);
    void queryClient.invalidateQueries({ queryKey: groupMembersPrefix(workspaceId) });
    void queryClient.invalidateQueries({ queryKey: groupMemberPermissionsKey(workspaceId, memberId) });
  }, [queryClient]);

  // Thu hồi quyền upload
  const revokeUpload = useCallback(async (workspaceId, memberId) => {
    await revokeUploadAPI(workspaceId, memberId);
    void queryClient.invalidateQueries({ queryKey: groupMembersPrefix(workspaceId) });
    void queryClient.invalidateQueries({ queryKey: groupMemberPermissionsKey(workspaceId, memberId) });
  }, [queryClient]);

  // Cập nhật vai trò thành viên
  const updateMemberRole = useCallback(async (workspaceId, memberId, roleName) => {
    await updateMemberRoleAPI(workspaceId, memberId, roleName);
    void queryClient.invalidateQueries({ queryKey: groupMembersPrefix(workspaceId) });
    void queryClient.invalidateQueries({ queryKey: groupMemberPermissionsKey(workspaceId, memberId) });
  }, [queryClient]);

  // Mời thành viên bằng email
  const inviteMember = useCallback(async (workspaceId, email) => {
    const res = await inviteMemberAPI(workspaceId, email);
    void queryClient.invalidateQueries({ queryKey: groupInvitationsKey(workspaceId) });
    return unwrapApiData(res);
  }, [queryClient]);

  // Lấy danh sách lời mời đang chờ (count + invitations)
  const fetchPendingInvitations = useCallback(async (workspaceId) => (
    queryClient.fetchQuery({
      queryKey: groupInvitationsKey(workspaceId),
      queryFn: async () => {
        const res = await getPendingInvitationsAPI(workspaceId);
        return unwrapApiData(res) || { count: 0, invitations: [] };
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const cancelInvitation = useCallback(async (workspaceId, invitationId) => {
    const res = await cancelInvitationAPI(workspaceId, invitationId);
    void queryClient.invalidateQueries({ queryKey: groupInvitationsKey(workspaceId) });
    return unwrapApiData(res);
  }, [queryClient]);

  const resendInvitation = useCallback(async (workspaceId, invitationId, email) => {
    const res = await resendInvitationAPI(workspaceId, invitationId, email);
    void queryClient.invalidateQueries({ queryKey: groupInvitationsKey(workspaceId) });
    return unwrapApiData(res);
  }, [queryClient]);

  // Lấy activity log của nhóm
  const fetchGroupLogs = useCallback(async (workspaceId) => (
    queryClient.fetchQuery({
      queryKey: groupLogsKey(workspaceId),
      queryFn: async () => {
        const res = await getGroupLogsAPI(workspaceId);
        const payload = unwrapApiData(res);
        return Array.isArray(payload) ? payload : [];
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchMyPermissions = useCallback(async (workspaceId) => (
    queryClient.fetchQuery({
      queryKey: groupMyPermissionsKey(workspaceId),
      queryFn: async () => {
        const res = await getGroupMyPermissionsAPI(workspaceId);
        return unwrapApiData(res);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchMemberPermissions = useCallback(async (workspaceId, memberId) => (
    queryClient.fetchQuery({
      queryKey: groupMemberPermissionsKey(workspaceId, memberId),
      queryFn: async () => {
        const res = await getGroupMemberPermissionsAPI(workspaceId, memberId);
        return unwrapApiData(res);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const syncMemberPermissions = useCallback(async (workspaceId, memberId, permissionCodes = []) => {
    const res = await syncGroupMemberPermissionsAPI(workspaceId, memberId, permissionCodes);
    void queryClient.invalidateQueries({ queryKey: groupMemberPermissionsKey(workspaceId, memberId) });
    return unwrapApiData(res);
  }, [queryClient]);

  const fetchGroupDashboardSummary = useCallback(async (workspaceId) => (
    queryClient.fetchQuery({
      queryKey: groupDashboardKey(workspaceId),
      queryFn: async () => {
        const res = await getGroupDashboardSummaryAPI(workspaceId);
        return unwrapApiData(res);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchMemberDashboardCards = useCallback(async (workspaceId, page = 0, size = 8) => (
    queryClient.fetchQuery({
      queryKey: groupMemberDashboardCardsKey(workspaceId, page, size),
      queryFn: async () => {
        const res = await getMemberDashboardCardsAPI(workspaceId, page, size);
        const pageData = unwrapApiData(res);
        if (pageData && typeof pageData === 'object' && Array.isArray(pageData.content)) {
          return pageData;
        }
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          page: 0,
          size,
          first: true,
          last: true,
        };
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchMemberDashboardDetail = useCallback(async (workspaceId, memberId, attemptMode = 'ALL') => (
    queryClient.fetchQuery({
      queryKey: groupMemberDashboardDetailKey(workspaceId, memberId, attemptMode),
      queryFn: async () => {
        const res = await getMemberDashboardDetailAPI(workspaceId, memberId, attemptMode);
        return unwrapApiData(res);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchGroupLearningSnapshotsSummary = useCallback(async (workspaceId, options = {}) => (
    queryClient.fetchQuery({
      queryKey: groupSnapshotsSummaryKey(workspaceId, options),
      queryFn: async () => {
        const res = await getGroupLearningSnapshotsSummaryAPI(workspaceId, options);
        return unwrapApiData(res);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchGroupLearningSnapshotsLatest = useCallback(async (workspaceId, options = {}) => (
    queryClient.fetchQuery({
      queryKey: groupSnapshotsLatestKey(workspaceId, options),
      queryFn: async () => {
        const res = await getGroupLearningSnapshotsLatestAPI(workspaceId, options);
        const pageData = unwrapApiData(res);
        if (pageData && typeof pageData === 'object' && Array.isArray(pageData.content)) {
          return pageData;
        }
        return emptyPage(options?.size);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchGroupLearningSnapshotsRanking = useCallback(async (workspaceId, options = {}) => (
    queryClient.fetchQuery({
      queryKey: groupSnapshotsRankingKey(workspaceId, options),
      queryFn: async () => {
        const res = await getGroupLearningSnapshotsRankingAPI(workspaceId, options);
        const pageData = unwrapApiData(res);
        if (pageData && typeof pageData === 'object' && Array.isArray(pageData.content)) {
          return pageData;
        }
        return emptyPage(options?.size);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const generateGroupLearningSnapshots = useCallback(async (workspaceId, data = {}) => {
    const res = await generateGroupLearningSnapshotsAPI(workspaceId, data);
    void queryClient.invalidateQueries({ queryKey: groupSnapshotsPrefix(workspaceId) });
    return unwrapApiData(res);
  }, [queryClient]);

  const fetchGroupMemberLearningSnapshotLatest = useCallback(async (workspaceId, workspaceMemberId, options = {}) => (
    queryClient.fetchQuery({
      queryKey: memberSnapshotLatestKey(workspaceId, workspaceMemberId, options),
      queryFn: async () => {
        const res = await getGroupMemberLearningSnapshotLatestAPI(workspaceId, workspaceMemberId, options);
        return unwrapApiData(res);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchGroupMemberLearningSnapshots = useCallback(async (workspaceId, workspaceMemberId, options = {}) => (
    queryClient.fetchQuery({
      queryKey: memberSnapshotListKey(workspaceId, workspaceMemberId, options),
      queryFn: async () => {
        const res = await getGroupMemberLearningSnapshotsAPI(workspaceId, workspaceMemberId, options);
        const pageData = unwrapApiData(res);
        if (pageData && typeof pageData === 'object' && Array.isArray(pageData.content)) {
          return pageData;
        }
        return emptyPage(options?.size);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const fetchGroupMemberLearningSnapshotTrend = useCallback(async (workspaceId, workspaceMemberId, options = {}) => (
    queryClient.fetchQuery({
      queryKey: memberSnapshotTrendKey(workspaceId, workspaceMemberId, options),
      queryFn: async () => {
        const res = await getGroupMemberLearningSnapshotTrendAPI(workspaceId, workspaceMemberId, options);
        return unwrapApiData(res);
      },
      staleTime: STALE_TIME.SHORT,
    })
  ), [queryClient]);

  const compareGroupMemberLearningSnapshots = useCallback(async (workspaceId, workspaceMemberId, fromSnapshotId, toSnapshotId) => (
    queryClient.fetchQuery({
      queryKey: memberSnapshotCompareKey(workspaceId, workspaceMemberId, fromSnapshotId, toSnapshotId),
      queryFn: async () => {
        const res = await compareGroupMemberLearningSnapshotsAPI(workspaceId, workspaceMemberId, fromSnapshotId, toSnapshotId);
        return unwrapApiData(res);
      },
      // Compare results are deterministic for a (from, to) pair → cache longer.
      staleTime: STALE_TIME.STATIC,
    })
  ), [queryClient]);

  const generateGroupMemberLearningSnapshot = useCallback(async (workspaceId, workspaceMemberId, data = {}) => {
    const res = await generateGroupMemberLearningSnapshotAPI(workspaceId, workspaceMemberId, data);
    // A new member snapshot can shift group-level aggregates (ranking/summary)
    // → invalidate the whole snapshots subtree for this group.
    void queryClient.invalidateQueries({ queryKey: groupSnapshotsPrefix(workspaceId) });
    return unwrapApiData(res);
  }, [queryClient]);

  // Xóa thành viên khỏi nhóm
  const removeMember = useCallback(async (workspaceId, memberId) => {
    await removeMemberAPI(workspaceId, memberId);
    void queryClient.invalidateQueries({ queryKey: groupMembersPrefix(workspaceId) });
    queryClient.removeQueries({ queryKey: groupMemberPermissionsKey(workspaceId, memberId) });
  }, [queryClient]);

  return {
    groups,
    publicGroups,
    loading,
    publicGroupsLoading,
    error,
    fetchGroups,
    fetchPublicGroups,
    createGroup,
    joinPublicGroup,
    fetchMembers,
    grantUpload,
    revokeUpload,
    updateMemberRole,
    inviteMember,
    fetchPendingInvitations,
    cancelInvitation,
    resendInvitation,
    fetchGroupLogs,
    fetchMyPermissions,
    fetchMemberPermissions,
    syncMemberPermissions,
    fetchGroupDashboardSummary,
    fetchMemberDashboardCards,
    fetchMemberDashboardDetail,
    fetchGroupLearningSnapshotsSummary,
    fetchGroupLearningSnapshotsLatest,
    fetchGroupLearningSnapshotsRanking,
    generateGroupLearningSnapshots,
    fetchGroupMemberLearningSnapshotLatest,
    fetchGroupMemberLearningSnapshots,
    fetchGroupMemberLearningSnapshotTrend,
    compareGroupMemberLearningSnapshots,
    generateGroupMemberLearningSnapshot,
    removeMember,
  };
}
