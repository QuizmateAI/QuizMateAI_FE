import api from './api';

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
