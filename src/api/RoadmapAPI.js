import api from './api';

export const getRoadmapsByGroup = async (groupId, page = 0, size = 10) => {
  const response = await api.get(`/roadmap/group/${groupId}?page=${page}&size=${size}`);
  return response;
};

// Tạo roadmap manual trong workspace cá nhân
export const createManualRoadmapInWorkspace = async (workspaceId, data) => {
  const response = await api.post(`/roadmap/create/workspace/${workspaceId}`, {
    title: data.name || data.title || 'Roadmap',
    description: data.goal || data.description || '',
  });
  return response;
};

// Tạo roadmap manual trong workspace nhóm
export const createManualRoadmapInGroup = async (groupId, data) => {
  const response = await api.post(`/roadmap/create/group/${groupId}`, {
    title: data.name || data.title || 'Roadmap',
    description: data.goal || data.description || '',
  });
  return response;
};
