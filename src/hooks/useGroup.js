import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapApiData } from '@/Utils/apiResponse';
import {
  getMyJoinedGroups,
  createGroup as createGroupAPI,
  getGroupMembers as getGroupMembersAPI,
  grantUpload as grantUploadAPI,
  revokeUpload as revokeUploadAPI,
  updateMemberRole as updateMemberRoleAPI,
  inviteMember as inviteMemberAPI,
  getPendingInvitations as getPendingInvitationsAPI,
  getGroupLogs as getGroupLogsAPI,
  removeMember as removeMemberAPI,
} from '@/api/GroupAPI';

const GROUPS_QUERY_KEY = ['groups'];

// Hook quản lý toàn bộ logic group: CRUD + members + invitations
export function useGroup(options = {}) {
  const { enabled = true } = options;
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

  const error = queryError?.message || null;

  // Tạo nhóm mới
  const createGroup = useCallback(async (data) => {
    const res = await createGroupAPI(data);
    await queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
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

  // Lấy activity log của nhóm
  const fetchGroupLogs = useCallback(async (workspaceId) => {
    const res = await getGroupLogsAPI(workspaceId);
    const payload = unwrapApiData(res);
    return Array.isArray(payload) ? payload : [];
  }, []);

  // Xóa thành viên khỏi nhóm
  const removeMember = useCallback(async (workspaceId, memberId) => {
    await removeMemberAPI(workspaceId, memberId);
  }, []);

  return {
    groups,
    loading,
    error,
    fetchGroups,
    createGroup,
    fetchMembers,
    grantUpload,
    revokeUpload,
    updateMemberRole,
    inviteMember,
    fetchPendingInvitations,
    fetchGroupLogs,
    removeMember,
  };
}
