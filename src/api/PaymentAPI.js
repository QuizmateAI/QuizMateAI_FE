import api from './api';

/** Lấy thông tin plan theo ID (planCatalogId) — dùng cho trang thanh toán */
export const getPlanById = (planId) => {
  return api.get(`/plan-catalog/${planId}`);
};

export const getPurchasablePlans = (type) => {
  return api.get('/plan/purchasable', { params: { type } });
};

export const createMomoPayment = (planId, workspaceId = null) => {
  if (workspaceId) {
    return api.post(`/momo/create-workspace/${workspaceId}`);
  }
  return api.post(`/momo/create/${planId}`);
};

export const createVnPayPayment = (planId, workspaceId = null) => {
  if (workspaceId) {
    return api.post(`/vnpay/create-workspace/${workspaceId}`);
  }
  return api.post(`/vnpay/create/${planId}`);
};

// Credit wallet payments
export const createMomoCreditPayment = (creditPackageId, workspaceId = null) => {
  const params = workspaceId ? { workspaceId } : {};
  return api.post(`/momo/create-credit/${creditPackageId}`, null, { params });
};

