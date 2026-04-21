import api from './api';

/** Lấy thông tin plan theo ID (planCatalogId) — dùng cho trang thanh toán */
export const getPlanById = (planId) => {
  return api.get(`/plan-catalog/${planId}`);
};

export const createMomoPayment = (planId, workspaceId = null) => {
  if (workspaceId) {
    return api.post(`/momo/create-workspace/${workspaceId}`, null, {
      params: { planId },
    });
  }
  return api.post(`/momo/create/${planId}`);
};

export const createVnPayPayment = (planId, workspaceId = null) => {
  if (workspaceId) {
    return api.post(`/vnpay/create-workspace/${workspaceId}`, null, {
      params: { planId },
    });
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

export const createStripePayment = (planId, workspaceId = null) => {
  if (workspaceId) {
    return api.post(`/stripe/create-workspace/${workspaceId}`, null, {
      params: { planId },
    });
  }
  return api.post(`/stripe/create/${planId}`);
};

export const createStripeCreditPayment = (creditPackageId, workspaceId = null) => {
  const params = workspaceId ? { workspaceId } : {};
  return api.post(`/stripe/create-credit/${creditPackageId}`, null, { params });
};

