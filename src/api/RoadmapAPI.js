import api from './api';

// ==================== ROADMAP ====================

// Tạo roadmap general cho group — POST /roadmap/create/group/{groupId}
export const createRoadmap = async (data) => {
  const response = await api.post(`/roadmap/create/group/${Number(data.groupId)}`, {
    title: data.name || data.title || 'Roadmap',
    description: data.goal || data.description || '',
  });
  return response;
};

// Tạo roadmap general cho workspace cá nhân — POST /roadmap/create/workspace/{workspaceId}
export const createRoadmapForWorkspace = async (data) => {
  const response = await api.post(`/roadmap/create/workspace/${Number(data.workspaceId)}`, {
    title: data.name || data.title || 'Roadmap',
    description: data.goal || data.description || '',
  });
  return response;
};

// Lấy danh sách roadmap của group (có phân trang)
export const getRoadmapsByGroup = async (groupId, page = 0, size = 10) => {
  const response = await api.get(`/roadmap/group/${groupId}?page=${page}&size=${size}`);
  return response;
};

// Lấy danh sách roadmap của workspace cá nhân (có phân trang)
export const getRoadmapsByWorkspace = async (workspaceId, page = 0, size = 10) => {
  const response = await api.get(`/roadmap/workspace/${workspaceId}?page=${page}&size=${size}`);
  return response;
};

// Lấy thông tin roadmap theo ID
export const getRoadmapById = async (roadmapId) => {
  const response = await api.get(`/roadmap/${roadmapId}`);
  return response;
};

// Cập nhật roadmap
export const updateRoadmap = async (roadmapId, data) => {
  const response = await api.put(`/roadmap/${roadmapId}`, {
    title: data.title,
    description: data.description,
    status: data.status,
  });
  return response;
};

// Xóa roadmap
export const deleteRoadmap = async (roadmapId) => {
  const response = await api.delete(`/roadmap/${roadmapId}`);
  return response;
};

// ==================== PHASE ====================

// Lấy danh sách phases thuộc một roadmap (có phân trang)
export const getPhasesByRoadmap = async (roadmapId, page = 0, size = 10) => {
  const response = await api.get(`/roadmap/${roadmapId}/phases?page=${page}&size=${size}`);
  return response;
};

// Tạo phase mới cho một roadmap cụ thể
export const createPhase = async (roadmapId, data) => {
  const response = await api.post(`/roadmap-phases?roadmapId=${roadmapId}`, {
    title: data.title || data.name || 'Phase',
    description: data.description || '',
    studyDurationInDay: data.studyDurationInDay || 0,
  });
  return response;
};

// Cập nhật thông tin phase
export const updatePhase = async (phaseId, data) => {
  const response = await api.put(`/roadmap-phases/${phaseId}`, {
    title: data.title,
    description: data.description,
    studyDurationInDay: data.studyDurationInDay,
    phaseIndex: data.phaseIndex,
    status: data.status,
  });
  return response;
};

// Xóa phase khỏi roadmap
export const deletePhase = async (phaseId, roadmapId) => {
  const response = await api.delete(`/roadmap-phases/${phaseId}?roadmapId=${roadmapId}`);
  return response;
};

// Thay đổi thứ tự hiển thị phase trong roadmap
export const updatePhaseIndex = async (phaseId, roadmapId, newIndex) => {
  const response = await api.patch(`/roadmap-phases/${phaseId}/index?roadmapId=${roadmapId}&newIndex=${newIndex}`);
  return response;
};

// ==================== KNOWLEDGE ====================

// Lấy danh sách knowledge thuộc một phase (có phân trang)
export const getKnowledgesByPhase = async (phaseId, page = 0, size = 10) => {
  const response = await api.get(`/roadmap-knowledges/phase/${phaseId}?page=${page}&size=${size}`);
  return response;
};

// Lấy thông tin chi tiết knowledge theo ID
export const getKnowledgeById = async (knowledgeId) => {
  const response = await api.get(`/roadmap-knowledges/${knowledgeId}`);
  return response;
};

// Tạo knowledge mới trong phase cụ thể
export const createKnowledge = async (phaseId, data) => {
  const response = await api.post(`/roadmap-knowledges?phaseId=${phaseId}`, {
    title: data.title || data.name || 'Knowledge',
    description: data.description || '',
  });
  return response;
};

// Cập nhật thông tin knowledge
export const updateKnowledge = async (knowledgeId, data) => {
  const response = await api.put(`/roadmap-knowledges/${knowledgeId}`, {
    title: data.title,
    description: data.description,
    status: data.status,
  });
  return response;
};

// Xóa knowledge khỏi phase
export const deleteKnowledge = async (knowledgeId, phaseId) => {
  const response = await api.delete(`/roadmap-knowledges/${knowledgeId}?phaseId=${phaseId}`);
  return response;
};
