import api from './api';

// Lấy quyền của user hiện tại (ADMIN/SUPER_ADMIN)
export const getMyPermissions = async () => {
  const response = await api.get('/management/me/permissions');
  return response;
};

// Lấy danh sách users (có hỗ trợ phân trang)
export const getAllUsers = async (page = 0, size = 10) => {
  const response = await api.get(`/management/users?page=${page}&size=${size}`);
  return response;
};

export const updateUserStatus = async (userId, status) => {
  const response = await api.put(`/management/users/${userId}/status?status=${status}`);
  return response;
};

export const getUserById = async (userId) => {
  const response = await api.get(`/management/users/${userId}`);
  return response;
};

export const getWorkspacesByUserId = async (userId, page = 0, size = 20) => {
  const response = await api.get(`/management/users/${userId}/workspaces?page=${page}&size=${size}`);
  return response;
};

export const getWorkspaceSnapshotByUserId = async (userId, workspaceId) => {
  const response = await api.get(`/management/users/${userId}/workspaces/${workspaceId}/snapshot`);
  return response;
};

export const getGroupsByUserId = async (userId) => {
  const response = await api.get(`/management/users/${userId}/groups`);
  return response;
};

export const getUserSubscription = async (userId) => {
  const response = await api.get(`/management/users/${userId}/subscription`);
  return response;
};

export const getGroupSubscription = async (workspaceId) => {
  const response = await api.get(`/management/groups/${workspaceId}/subscription`);
  return response;
};

// Lấy danh sách groups (có hỗ trợ phân trang)
export const getAllGroups = async (page = 0, size = 10) => {
  const response = await api.get(`/management/groups?page=${page}&size=${size}`);
  return response;
};

export const getGroupDetail = async (workspaceId) => {
  const response = await api.get(`/management/groups/${workspaceId}`);
  return response;
};

export const createAdmin = async (data) => {
  const response = await api.post('/management/admins', data);
  return response;
};

export const getAllSystemUsers = async (page = 0, size = 100) => {
  const response = await api.get(`/rbac/system/users?page=${page}&size=${size}`);
  return response;
};

export const getAdminOverviewStats = async () => {
  const response = await api.get('/management/stats/admin-overview');
  return response;
};

export const getSystemOverviewStats = async () => {
  const response = await api.get('/management/stats/system-overview');
  return response;
};

export const listRoles = async () => {
  const response = await api.get('/rbac/system/roles');
  return response;
};

export const createRole = async (data) => {
  const response = await api.post('/rbac/system/roles', data);
  return response;
};

export const syncRolePermissions = async (roleId, permissionCodes) => {
  const response = await api.put(`/rbac/system/roles/${roleId}/permissions`, { permissionCodes });
  return response;
};

export const grantPermissionToRole = async (roleId, permissionId) => {
  const response = await api.post(`/rbac/system/roles/${roleId}/permissions/${permissionId}`);
  return response;
};

export const revokePermissionFromRole = async (roleId, permissionId) => {
  const response = await api.delete(`/rbac/system/roles/${roleId}/permissions/${permissionId}`);
  return response;
};

export const deleteRole = async (roleId) => {
  const response = await api.delete(`/rbac/system/roles/${roleId}`);
  return response;
};

export const listPermissions = async (page = 0, size = 100) => {
  const response = await api.get(`/rbac/system/permissions?page=${page}&size=${size}`);
  return response;
};

export const getAdminAllowedPermissions = async () => {
  const response = await api.get('/rbac/system/admin-allowed-permissions');
  return response;
};

export const getUserPermissions = async (userId) => {
  const response = await api.get(`/rbac/system/users/${userId}/permissions`);
  return response;
};

export const syncUserPermissions = async (userId, permissionCodes) => {
  const params = new URLSearchParams();
  const codes = Array.isArray(permissionCodes) ? permissionCodes : [];
  codes.forEach((code) => params.append('permissionCodes', String(code)));
  const query = params.toString();
  const url = `/rbac/system/users/${userId}/permissions${query ? `?${query}` : ''}`;
  const response = await api.put(url);
  return response;
};

export const grantPermissionToUser = async (userId, permissionCode) => {
  const response = await api.post(`/rbac/system/users/${userId}/permissions/${encodeURIComponent(permissionCode)}`);
  return response;
};

export const revokePermissionFromUser = async (userId, permissionCode) => {
  const response = await api.delete(`/rbac/system/users/${userId}/permissions/${encodeURIComponent(permissionCode)}`);
  return response;
};

export const getAuditLogs = async (actorId, action, page = 0, size = 50) => {
  const params = new URLSearchParams();
  if (actorId != null) params.append('actorId', actorId);
  if (action) params.append('action', action);
  params.append('page', page);
  params.append('size', size);
  const response = await api.get(`/rbac/system/audit-logs?${params.toString()}`);
  return response;
};

export const getAiAuditLogs = async ({
  provider,
  featureKey,
  actorUserId,
  taskId,
  status,
  from,
  to,
  page = 0,
  size = 20,
} = {}) => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('size', String(size));
  if (provider) params.append('provider', String(provider));
  if (featureKey) params.append('featureKey', String(featureKey));
  if (actorUserId != null && actorUserId !== '') params.append('actorUserId', String(actorUserId));
  if (taskId) params.append('taskId', String(taskId));
  if (status) params.append('status', String(status));
  if (from) params.append('from', String(from));
  if (to) params.append('to', String(to));
  const response = await api.get(`/management/ai-audit/logs?${params.toString()}`);
  return response;
};

export const getGroupLogs = async (workspaceId) => {
  const response = await api.get(`/management/groups/${workspaceId}/logs`);
  return response;
};

// Plan APIs — maps to PlanCatalogController (/api/plan-catalog/...)
export const getAllPlans = async () => {
  const response = await api.get('/plan-catalog/all');
  return response;
};

export const getPlanById = async (planId) => {
  const response = await api.get(`/plan-catalog/${planId}`);
  return response;
};

export const createPlan = async (data) => {
  // data phải khớp PlanCatalogCreateRequest (code, displayName, planScope, planLevel, price, description, entitlement)
  const response = await api.post('/plan-catalog/create', data);
  return response;
};

export const updatePlan = async (planId, data) => {
  // data phải khớp PlanCatalogUpdateRequest (displayName, price, description, entitlement)
  const response = await api.put(`/plan-catalog/${planId}`, data);
  return response;
};

export const deletePlan = async (planId) => {
  const response = await api.delete(`/plan-catalog/${planId}`);
  return response;
};

export const updatePlanStatus = async (planId, status) => {
  // Gọi vào @PatchMapping("/{id}/status") với body PlanCatalogStatusUpdateRequest { status }
  const response = await api.patch(`/plan-catalog/${planId}/status`, { status });
  return response;
};

/** Plans mua được cho user: dùng PlanCatalogController active/user và active/group */
export const getActiveUserPlans = async () => {
  const response = await api.get('/plan-catalog/active/user');
  return response;
};

export const getActiveGroupPlan = async () => {
  const response = await api.get('/plan-catalog/active/group');
  return response;
};

export const getPurchasablePlans = async (type) => {
  const response = await api.get(`/plan/purchasable?type=${type}`);
  return response;
};

// Credit Package APIs — maps to CreditPackageController (/api/credit-package/...)
export const getAllCreditPackages = async () => {
  const response = await api.get('/credit-package/all');
  return response;
};

export const getCreditPackageById = async (id) => {
  const response = await api.get(`/credit-package/${id}`);
  return response;
};

export const createCreditPackage = async (data) => {
  const response = await api.post('/credit-package/create', data);
  return response;
};

export const updateCreditPackage = async (id, data) => {
  const response = await api.put(`/credit-package/${id}`, data);
  return response;
};

export const updateCreditPackageStatus = async (id, data) => {
  const response = await api.patch(`/credit-package/${id}/status`, data);
  return response;
};

export const deleteCreditPackage = async (id) => {
  const response = await api.delete(`/credit-package/${id}`);
  return response;
};

// Public purchaseable credit packages for wallet (ACTIVE only)
export const getPurchaseableCreditPackages = async () => {
  const response = await api.get('/credit-package/purchaseable');
  return response;
};

// Payment APIs — maps to PaymentController (/api/payment/...)
export const getUserPayments = async (page = 0, size = 10) => {
  const response = await api.get(`/payment/user?page=${page}&size=${size}`);
  return response;
};

export const getAdminPayments = async ({ page = 0, size = 10, userId, workspaceId, status } = {}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('size', size);
  if (userId != null) params.append('userId', String(userId));
  if (workspaceId != null) params.append('workspaceId', String(workspaceId));
  if (status) params.append('status', String(status));
  const response = await api.get(`/payment/admin?${params.toString()}`);
  return response;
};

export const getAdminPaymentByOrderId = async (orderId) => {
  const response = await api.get(`/payment/admin/${encodeURIComponent(orderId)}`);
  return response;
};

// Credit Wallet APIs — maps to CreditWalletController (/api/credit-wallet/...)
export const getMyWallet = async () => {
  const response = await api.get('/credit-wallet/me');
  return response;
};
