import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapApiData } from '@/utils/apiResponse';
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
  const fetchMembers = useCallback(async (workspaceId, page = 0, size = 50) => {
    const res = await getGroupMembersAPI(workspaceId, page, size);
    const pageData = unwrapApiData(res);
    return Array.isArray(pageData?.content) ? pageData.content : [];
  }, []);

  // Cấp quyền upload cho thành viên
  const grantUpload = useCallback(async (workspaceId, memberId) => {
    await grantUploadAPI(workspaceId, memberId);
  }, []);

  // Thu hồi quyền upload
  const revokeUpload = useCallback(async (workspaceId, memberId) => {
    await revokeUploadAPI(workspaceId, memberId);
  }, []);

  // Cập nhật vai trò thành viên
  const updateMemberRole = useCallback(async (workspaceId, memberId, roleName) => {
    await updateMemberRoleAPI(workspaceId, memberId, roleName);
  }, []);

  // Mời thành viên bằng email
  const inviteMember = useCallback(async (workspaceId, email) => {
    const res = await inviteMemberAPI(workspaceId, email);
    return unwrapApiData(res);
  }, []);

  // Lấy danh sách lời mời đang chờ (count + invitations)
  const fetchPendingInvitations = useCallback(async (workspaceId) => {
    const res = await getPendingInvitationsAPI(workspaceId);
    return unwrapApiData(res) || { count: 0, invitations: [] };
  }, []);

  const cancelInvitation = useCallback(async (workspaceId, invitationId) => {
    const res = await cancelInvitationAPI(workspaceId, invitationId);
    return unwrapApiData(res);
  }, []);

  const resendInvitation = useCallback(async (workspaceId, invitationId, email) => {
    const res = await resendInvitationAPI(workspaceId, invitationId, email);
    return unwrapApiData(res);
  }, []);

  // Lấy activity log của nhóm
  const fetchGroupLogs = useCallback(async (workspaceId) => {
    const res = await getGroupLogsAPI(workspaceId);
    const payload = unwrapApiData(res);
    return Array.isArray(payload) ? payload : [];
  }, []);

  const fetchMyPermissions = useCallback(async (workspaceId) => {
    const res = await getGroupMyPermissionsAPI(workspaceId);
    return unwrapApiData(res);
  }, []);

  const fetchMemberPermissions = useCallback(async (workspaceId, memberId) => {
    const res = await getGroupMemberPermissionsAPI(workspaceId, memberId);
    return unwrapApiData(res);
  }, []);

  const syncMemberPermissions = useCallback(async (workspaceId, memberId, permissionCodes = []) => {
    const res = await syncGroupMemberPermissionsAPI(workspaceId, memberId, permissionCodes);
    return unwrapApiData(res);
  }, []);

  const fetchGroupDashboardSummary = useCallback(async (workspaceId) => {
    const res = await getGroupDashboardSummaryAPI(workspaceId);
    return unwrapApiData(res);
  }, []);

  const fetchMemberDashboardCards = useCallback(async (workspaceId, page = 0, size = 8) => {
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
  }, []);

  const fetchMemberDashboardDetail = useCallback(async (workspaceId, memberId, attemptMode = 'ALL') => {
    const res = await getMemberDashboardDetailAPI(workspaceId, memberId, attemptMode);
    return unwrapApiData(res);
  }, []);

  const fetchGroupLearningSnapshotsSummary = useCallback(async (workspaceId, options = {}) => {
    const res = await getGroupLearningSnapshotsSummaryAPI(workspaceId, options);
    return unwrapApiData(res);
  }, []);

  const fetchGroupLearningSnapshotsLatest = useCallback(async (workspaceId, options = {}) => {
    const res = await getGroupLearningSnapshotsLatestAPI(workspaceId, options);
    const pageData = unwrapApiData(res);
    if (pageData && typeof pageData === 'object' && Array.isArray(pageData.content)) {
      return pageData;
    }
    return emptyPage(options?.size);
  }, []);

  const fetchGroupLearningSnapshotsRanking = useCallback(async (workspaceId, options = {}) => {
    const res = await getGroupLearningSnapshotsRankingAPI(workspaceId, options);
    const pageData = unwrapApiData(res);
    if (pageData && typeof pageData === 'object' && Array.isArray(pageData.content)) {
      return pageData;
    }
    return emptyPage(options?.size);
  }, []);

  const generateGroupLearningSnapshots = useCallback(async (workspaceId, data = {}) => {
    const res = await generateGroupLearningSnapshotsAPI(workspaceId, data);
    return unwrapApiData(res);
  }, []);

  const fetchGroupMemberLearningSnapshotLatest = useCallback(async (workspaceId, workspaceMemberId, options = {}) => {
    const res = await getGroupMemberLearningSnapshotLatestAPI(workspaceId, workspaceMemberId, options);
    return unwrapApiData(res);
  }, []);

  const fetchGroupMemberLearningSnapshots = useCallback(async (workspaceId, workspaceMemberId, options = {}) => {
    const res = await getGroupMemberLearningSnapshotsAPI(workspaceId, workspaceMemberId, options);
    const pageData = unwrapApiData(res);
    if (pageData && typeof pageData === 'object' && Array.isArray(pageData.content)) {
      return pageData;
    }
    return emptyPage(options?.size);
  }, []);

  const fetchGroupMemberLearningSnapshotTrend = useCallback(async (workspaceId, workspaceMemberId, options = {}) => {
    const res = await getGroupMemberLearningSnapshotTrendAPI(workspaceId, workspaceMemberId, options);
    return unwrapApiData(res);
  }, []);

  const compareGroupMemberLearningSnapshots = useCallback(async (workspaceId, workspaceMemberId, fromSnapshotId, toSnapshotId) => {
    const res = await compareGroupMemberLearningSnapshotsAPI(workspaceId, workspaceMemberId, fromSnapshotId, toSnapshotId);
    return unwrapApiData(res);
  }, []);

  const generateGroupMemberLearningSnapshot = useCallback(async (workspaceId, workspaceMemberId, data = {}) => {
    const res = await generateGroupMemberLearningSnapshotAPI(workspaceId, workspaceMemberId, data);
    return unwrapApiData(res);
  }, []);

  // Xóa thành viên khỏi nhóm
  const removeMember = useCallback(async (workspaceId, memberId) => {
    await removeMemberAPI(workspaceId, memberId);
  }, []);

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
