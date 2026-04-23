import api from './api';

/** Lấy thông tin plan theo ID (planCatalogId) — dùng cho trang thanh toán */
export const getPlanById = (planId) => {
  return api.get(`/plan-catalog/${planId}`);
};

export const createMomoPayment = (planId, workspaceId = null, extraSlotCount = 0) => {
  if (workspaceId) {
    const params = { planId };
    if (extraSlotCount > 0) params.extraSlotCount = extraSlotCount;
    return api.post(`/momo/create-workspace/${workspaceId}`, null, { params });
  }
  return api.post(`/momo/create/${planId}`);
};

export const createVnPayPayment = (planId, workspaceId = null, extraSlotCount = 0) => {
  if (workspaceId) {
    const params = { planId };
    if (extraSlotCount > 0) params.extraSlotCount = extraSlotCount;
    return api.post(`/vnpay/create-workspace/${workspaceId}`, null, { params });
  }
  return api.post(`/vnpay/create/${planId}`);
};

// Credit wallet payments
export const createMomoCreditPayment = (creditPackageId, workspaceId = null) => {
  const params = workspaceId ? { workspaceId } : {};
  return api.post(`/momo/create-credit/${creditPackageId}`, null, { params });
};

export const createVnPayCreditPayment = (creditPackageId, workspaceId = null) => {
  const params = workspaceId ? { workspaceId } : {};
  return api.post(`/vnpay/create-credit/${creditPackageId}`, null, { params });
};

export const createStripePayment = (planId, workspaceId = null, extraSlotCount = 0) => {
  if (workspaceId) {
    const params = { planId };
    if (extraSlotCount > 0) params.extraSlotCount = extraSlotCount;
    return api.post(`/stripe/create-workspace/${workspaceId}`, null, { params });
  }
  return api.post(`/stripe/create/${planId}`);
};

/** Lấy thông tin slot của group workspace (dành cho leader) — hiển thị khi chọn mua thêm slot. */
export const getWorkspaceSlotInfo = (workspaceId) => {
  return api.get(`/payment/workspace/${workspaceId}/slot-info`);
};

export const createStripeCreditPayment = (creditPackageId, workspaceId = null) => {
  const params = workspaceId ? { workspaceId } : {};
  return api.post(`/stripe/create-credit/${creditPackageId}`, null, { params });
};

