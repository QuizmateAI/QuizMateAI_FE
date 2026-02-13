import api from './api';

// ======================= ADMIN API SERVICES =======================

// ============= USER MANAGEMENT =============

/**
 * Lấy danh sách tất cả người dùng
 * @returns {Promise} Response chứa danh sách users
 */
export const getAllUsers = async () => {
  try {
    const response = await api.get('/management/users');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Cập nhật trạng thái người dùng
 * @param {number} userId - ID người dùng
 * @param {string} status - Trạng thái mới: ACTIVE | INACTIVE | BANNED
 * @returns {Promise} Response từ server
 */
export const updateUserStatus = async (userId, status) => {
  try {
    const response = await api.put(`/admin/users/${userId}/status?status=${status}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// ============= GROUP MANAGEMENT =============

/**
 * Lấy danh sách tất cả nhóm
 * @returns {Promise} Response chứa danh sách groups
 */
export const getAllGroups = async () => {
  try {
    const response = await api.get('/admin/groups');
    return response;
  } catch (error) {
    throw error;
  }
};

// ============= SYSTEM MANAGEMENT =============

/**
 * Tạo tài khoản admin mới
 * @param {Object} adminData - Dữ liệu admin mới { username, email, password, confirmPassword, fullName }
 * @returns {Promise} Response từ server
 */
export const createAdmin = async (adminData) => {
  try {
    const response = await api.post('/rbac/system/admins', adminData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Lấy thông tin chi tiết nhóm
 * @param {number} groupId - ID nhóm
 * @returns {Promise} Response chứa thông tin chi tiết nhóm
 */
export const getGroupDetail = async (groupId) => {
  try {
    const response = await api.get(`/admin/groups/${groupId}`);
    return response;
  } catch (error) {
    throw error;
  }
};
