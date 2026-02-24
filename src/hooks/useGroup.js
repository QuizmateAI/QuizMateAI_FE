import { useState, useEffect, useCallback } from 'react';
import {
  getMyJoinedGroups,
  createGroup as createGroupAPI,
  getGroupMembers as getGroupMembersAPI,
  grantUpload as grantUploadAPI,
  revokeUpload as revokeUploadAPI,
  updateMemberRole as updateMemberRoleAPI,
  inviteMember as inviteMemberAPI,
  removeMember as removeMemberAPI,
} from '@/api/GroupAPI';
import { getAllTopics } from '@/api/WorkspaceAPI';

// Hook quản lý toàn bộ logic group: CRUD + members + invitations
export function useGroup() {
  const [groups, setGroups] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy danh sách nhóm của user
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyJoinedGroups();
      setGroups(res.data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách nhóm');
      console.error('Lỗi khi lấy danh sách nhóm:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lấy danh sách topics (kèm subjects)
  const fetchTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await getAllTopics(0, 100);
      setTopics(res.data?.content || []);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách topics:', err);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  // Tạo nhóm mới
  const createGroup = useCallback(async (data) => {
    const res = await createGroupAPI(data);
    // Tải lại danh sách nhóm để lấy đầy đủ thông tin (bao gồm memberRole, memberCount, v.v.)
    await fetchGroups();
    return res.data;
  }, [fetchGroups]);

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

  // Xóa thành viên khỏi nhóm
  const removeMember = useCallback(async (groupId, memberId) => {
    await removeMemberAPI(groupId, memberId);
  }, []);

  // Tải dữ liệu khi mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    topics,
    loading,
    topicsLoading,
    error,
    fetchGroups,
    fetchTopics,
    createGroup,
    fetchMembers,
    grantUpload,
    revokeUpload,
    updateMemberRole,
    inviteMember,
    removeMember,
  };
}
