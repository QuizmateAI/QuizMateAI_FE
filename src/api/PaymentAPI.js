import api from './api';

export const getPlanById = (planId) => {
  return api.get(`/plan/${planId}`);
};

export const getPurchasablePlans = (type) => {
  return api.get('/plan/purchasable', { params: { type } });
};

export const createMomoPayment = (planId, groupId = null) => {
  const params = groupId ? { groupId } : {};
  return api.post(`/momo/create/${planId}`, null, { params });
};

export const createVnPayPayment = (planId, groupId = null) => {
  const params = groupId ? { groupId } : {};
  return api.post(`/vnpay/create/${planId}`, null, { params });
};


