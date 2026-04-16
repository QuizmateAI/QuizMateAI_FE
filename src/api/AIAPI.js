import api from './api';

// Tạo Mock Test thông qua AI (async, trả về taskId).
// Endpoint thật: POST /api/ai/mocktest:generated. baseURL đã là /api → path cần "/ai/...".
export const generateMockTest = async (data) => {
  const response = await api.post('/ai/mocktest:generated', data, { timeout: 0 });
  return response;
};

// Bước 1 của flow tạo mock test: gọi AI gợi ý cấu trúc sections + description
// (đồng bộ ~3-15s tuỳ độ phức tạp đề, KHÔNG sinh câu hỏi). User confirm/edit rồi mới gọi generateMockTest.
// Override default 10s timeout của axios — AI chat call có thể chạm 30s khi BE/Python bận.
export const suggestMockTestStructure = async (data) => {
  const response = await api.post('/ai/mocktest:suggest-structure', data, { timeout: 60000 });
  return response;
};

// Tạo Mock Test preview cho group (đồng bộ) — trả về template với sections + questions
export const generateGroupMockTestPreview = async (data) => {
  const response = await api.post('/ai/mocktest/group:preview', data);
  return response;
};

// Lấy danh sách Question Types
export const getQuestionTypes = async () => {
  const response = await api.get('/question-types');
  return response;
};

// Lấy danh sách Difficulty Definitions
export const getDifficultyDefinitions = async () => {
  const response = await api.get('/difficulty-definitions');
  return response;
};

// Lấy danh sách Bloom Skill Tests
export const getBloomSkills = async () => {
  const response = await api.get('/bloom-skill-tests');
  return response;
};

// Tạo Quiz AI
export const generateAIQuiz = async (data) => {
  const response = await api.post('/ai/quiz:generated', data);
  return response;
};

// Preview cau truc quiz du kien bang AI
export const previewAIQuizStructure = async (data) => {
  const response = await api.post('/ai/quiz-structure:preview', data, { timeout: 120000 });
  return response;
};

// Tao phase roadmap bang AI (async)
export const generateRoadmapPhases = async (data) => {
  const response = await api.post('/ai/roadmap-phases:generated', data);
  return response;
};

// Tao roadmap day du bang AI (async)
export const generateRoadmap = async (data) => {
  const response = await api.post('/ai/roadmap:generated', data);
  return response;
};

// Tao noi dung hoc cho 1 phase bang AI (knowledge + quiz)
export const generateRoadmapPhaseContent = async (data) => {
  const response = await api.post('/ai/roadmap-phase-content:generated', data);
  return response;
};

// Tao pre-learning quiz cho 1 phase bang AI
export const generateRoadmapPreLearning = async (data) => {
  const response = await api.post('/ai/roadmap-prelearning:generated', data);
  return response;
};

// Tao pre-learning quiz tong cho group roadmap
export const generateRoadmapGroupPreLearning = async (data) => {
  const response = await api.post('/ai/roadmap-group-prelearning:generated', data);
  return response;
};

// Tao quiz cho knowledge sau khi da tao/hoan thanh noi dung knowledge
export const generateRoadmapKnowledgeQuiz = async (data) => {
  const response = await api.post('/ai/knowledge-quiz:generated', data);
  return response;
};

// Lay danh sach tai lieu de xuat da luu theo workspace
export const getSuggestedResources = async (workspaceId, page = 0, size = 15) => {
  const response = await api.get('/ai/resources:suggested', {
    params: {
      workspaceId: Number(workspaceId),
      page,
      size,
    },
  });
  return response;
};

// Goi AI de de xuat tai lieu hoc tap theo profile workspace
export const suggestResourcesByWorkspace = async ({ workspaceId, limit = 10 }) => {
  const response = await api.post('/ai/resources:suggest', {
    workspaceId: Number(workspaceId),
    limit,
  });
  return response;
};

// Import cac tai lieu de xuat vao danh sach materials cua workspace
export const importSuggestedResources = async ({ workspaceId, suggestionIds = [] }) => {
  const response = await api.post('/ai/resources:suggested/import', {
    workspaceId: Number(workspaceId),
    suggestionIds,
  });
  return response;
};

// Xu ly link YouTube/Web thanh material va trigger AI pipeline nhu upload file
export const processYoutubeResource = async ({ url, workspaceId }) => {
  const response = await api.post('/ai/youtube:processed', {
    url,
    workspaceId: Number(workspaceId),
  });
  return response;
};

