import api from './api';

const MANAGEMENT_FEEDBACK_LOG_LIST_ENDPOINTS = [
  '/management/feedback/requests',
  '/management/feedback/submissions',
  '/management/feedback/responses',
  '/management/feedback/logs',
];

const MANAGEMENT_FEEDBACK_LOG_DETAIL_ENDPOINT_BUILDERS = [
  (requestId) => `/management/feedback/requests/${requestId}`,
  (requestId) => `/management/feedback/submissions/${requestId}`,
  (requestId) => `/management/feedback/responses/${requestId}`,
  (requestId) => `/management/feedback/logs/${requestId}`,
];

function isMissingFeedbackLogEndpoint(error) {
  if (error?.statusCode === 404) {
    return true;
  }

  if (error?.statusCode !== 500) {
    return false;
  }

  const message = String(
    error?.message
      ?? error?.data?.message
      ?? error?.data?.error
      ?? '',
  ).toLowerCase();

  return message.includes('no static resource')
    || message.includes('no resource found')
    || message.includes('no handler found');
}

async function requestFirstAvailableEndpoint(paths) {
  let lastNotFoundError = null;

  for (const path of paths) {
    try {
      const response = await api.get(path);
      return response;
    } catch (error) {
      if (isMissingFeedbackLogEndpoint(error)) {
        lastNotFoundError = {
          ...error,
          statusCode: 404,
          message: error?.message || 'Không tìm thấy endpoint feedback log',
        };
        continue;
      }

      throw error;
    }
  }

  throw lastNotFoundError ?? {
    statusCode: 404,
    message: 'Không tìm thấy endpoint feedback log',
  };
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value
        .filter((item) => item != null && item !== '')
        .forEach((item) => searchParams.append(key, String(item)));
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const getPendingFeedbackRequests = async () => {
  const response = await api.get('/feedback/requests/pending');
  return response;
};

export const getFeedbackRequestDetail = async (requestId) => {
  const response = await api.get(`/feedback/requests/${requestId}`);
  return response;
};

export const resolveFeedbackForm = async (targetType, targetId) => {
  const params = new URLSearchParams();
  params.set('targetType', String(targetType));
  if (targetId != null && targetId !== '') {
    params.set('targetId', String(targetId));
  }
  const response = await api.get(`/feedback/forms/resolve?${params.toString()}`);
  return response;
};

export const getFeedbackTargetStatuses = async (targetType, targetIds = []) => {
  const params = new URLSearchParams();
  params.set('targetType', String(targetType));
  targetIds
    .filter((targetId) => targetId != null && targetId !== '')
    .forEach((targetId) => params.append('targetIds', String(targetId)));
  const response = await api.get(`/feedback/targets/status?${params.toString()}`);
  return response;
};

export const submitFeedbackRequest = async (requestId, payload) => {
  const response = await api.post(`/feedback/requests/${requestId}/submit`, payload);
  return response;
};

export const dismissFeedbackRequest = async (requestId) => {
  const response = await api.post(`/feedback/requests/${requestId}/dismiss`);
  return response;
};

export const submitDirectFeedback = async (payload) => {
  const response = await api.post('/feedback/direct-submit', payload);
  return response;
};

export const getMyFeedbackTickets = async (params = {}) => {
  const suffix = buildQueryString(params);
  const response = await api.get(`/feedback/tickets${suffix}`);
  return response;
};

export const createFeedbackTicket = async (payload) => {
  const response = await api.post('/feedback/tickets', payload);
  return response;
};

export const getManagementFeedbackForms = async () => {
  const response = await api.get('/management/feedback/forms');
  return response;
};

export const getManagementFeedbackForm = async (formId) => {
  const response = await api.get(`/management/feedback/forms/${formId}`);
  return response;
};

export const createManagementFeedbackForm = async (payload) => {
  const response = await api.post('/management/feedback/forms', payload);
  return response;
};

export const updateManagementFeedbackForm = async (formId, payload) => {
  const response = await api.put(`/management/feedback/forms/${formId}`, payload);
  return response;
};

export const getManagementFeedbackOverviewStats = async () => {
  const response = await api.get('/management/feedback/stats/overview');
  return response;
};

export const getManagementFeedbackTickets = async (params = {}) => {
  const suffix = buildQueryString(params);
  const response = await api.get(`/management/feedback/tickets${suffix}`);
  return response;
};

export const getManagementFeedbackTicketDetail = async (requestId) => {
  const response = await api.get(`/management/feedback/tickets/${requestId}`);
  return response;
};

export const updateManagementFeedbackTicket = async (requestId, payload) => {
  const response = await api.patch(`/management/feedback/tickets/${requestId}`, payload);
  return response;
};

export const getManagementFeedbackLogs = async (params = {}) => {
  const suffix = buildQueryString(params);
  return requestFirstAvailableEndpoint(
    MANAGEMENT_FEEDBACK_LOG_LIST_ENDPOINTS.map((path) => `${path}${suffix}`),
  );
};

export const getManagementFeedbackLogDetail = async (requestId) => {
  return requestFirstAvailableEndpoint(
    MANAGEMENT_FEEDBACK_LOG_DETAIL_ENDPOINT_BUILDERS.map((buildPath) => buildPath(requestId)),
  );
};
