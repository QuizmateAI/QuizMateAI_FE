import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyJoinedGroups,
  createGroup as createGroupAPI,
  getGroupMembers as getGroupMembersAPI,
  grantUpload as grantUploadAPI,
  revokeUpload as revokeUploadAPI,
  updateMemberRole as updateMemberRoleAPI,
  inviteMember as inviteMemberAPI,
  getPendingInvitations as getPendingInvitationsAPI,
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
      return res.data || [];
    },
    enabled,
  });

  const error = queryError?.message || null;

  // Tạo nhóm mới
  const createGroup = useCallback(async (data) => {
    const res = await createGroupAPI(data);
    await queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    return res.data;
  }, [queryClient]);

  // Lấy danh sách thành viên của nhóm
  const fetchMembers = useCallback(async (groupId, page = 0, size = 50) => {
    const res = await getGroupMembersAPI(groupId, page, size);
    return res.data?.content || [];
  }, []);

  // Cấp quyền upload cho thành viên
  const grantUpload = useCallback(async (groupId, memberId) => {
    await grantUploadAPI(groupId, memberId);
  }, []);

  // Thu hồi quyền upload
  const revokeUpload = useCallback(async (groupId, memberId) => {
    await revokeUploadAPI(groupId, memberId);
  }, []);

  // Cập nhật vai trò thành viên
  const updateMemberRole = useCallback(async (groupId, memberId, roleName) => {
    await updateMemberRoleAPI(groupId, memberId, roleName);
  }, []);

  // Mời thành viên bằng email
  const inviteMember = useCallback(async (groupId, email) => {
    const res = await inviteMemberAPI(groupId, email);
    return res.data;
  }, []);

  // Lấy danh sách lời mời đang chờ (count + invitations)
  const fetchPendingInvitations = useCallback(async (groupId) => {
    const res = await getPendingInvitationsAPI(groupId);
    return res?.data || { count: 0, invitations: [] };
  }, []);

  // Xóa thành viên khỏi nhóm
  const removeMember = useCallback(async (groupId, memberId) => {
    await removeMemberAPI(groupId, memberId);
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
    removeMember,
  };
}
