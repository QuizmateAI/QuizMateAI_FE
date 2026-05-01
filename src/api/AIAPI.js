import api from './api';

// ========== MockTest v2 adapters ==========
// Migration: legacy /api/ai/mocktest:* → /api/mocktest/* (v2). Form payload shape preserved
// via adapter; v2 response (ApiResponse-wrapped) is unwrapped to match v1 callers.

function flattenLeafSectionConfigs(sectionConfigs) {
  const out = [];
  const walk = (sc) => {
    if (!sc) return;
    const subs = Array.isArray(sc.subConfigs) ? sc.subConfigs : [];
    if (subs.length > 0) {
      subs.forEach(walk);
    } else {
      out.push(sc);
    }
  };
  (sectionConfigs || []).forEach(walk);
  return out;
}

function sectionConfigsToCustomStructure(sectionConfigs, totalQuestion) {
  const leaves = flattenLeafSectionConfigs(sectionConfigs);
  const total = Math.max(1, Number(totalQuestion) || 0);
  return {
    sections: leaves.map((sc, idx) => {
      const numQuestions = Math.max(1, Number(sc.numQuestions) || 0);
      const rawItems = Array.isArray(sc.structureItems) && sc.structureItems.length > 0
        ? sc.structureItems
        : (Array.isArray(sc.structure) ? sc.structure : []);
      const items = rawItems
        .map((item) => {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) return null;
          return {
            difficulty: item.difficulty,
            bloomSkill: item.bloomSkill,
            questionType: item.questionType || 'SINGLE_CHOICE',
            quantityRatio: qty / numQuestions,
          };
        })
        .filter(Boolean);
      return {
        name: sc.name || `Section ${idx + 1}`,
        description: sc.description || '',
        questionRatio: numQuestions / total,
        sharedContextRequired: sc.requiresSharedContext === true,
        items: items.length > 0 ? items : [{
          difficulty: 'MEDIUM',
          bloomSkill: 'UNDERSTAND',
          questionType: 'SINGLE_CHOICE',
          quantityRatio: 1.0,
        }],
      };
    }),
  };
}

/**
 * Tạo Mock Test thông qua AI (async, trả về taskId).
 * Migration: gọi v2 POST /api/mocktest/generate, giữ nguyên external interface.
 * Caller form vẫn pass v1 AIMockTestRequest shape — adapter convert sang v2 GenerateMockTestRequest.
 */
export const generateMockTest = async (data) => {
  const v2Payload = {
    title: data?.title,
    description: data?.description,
    workspaceId: data?.workspaceId,
    materialIds: Array.isArray(data?.materialIds) ? data.materialIds : [],
    customStructure: sectionConfigsToCustomStructure(data?.sectionConfigs, data?.totalQuestion),
    customScoring: data?.customScoring,
    totalQuestion: data?.totalQuestion,
    durationInMinute: data?.durationInMinute,
    overallDifficulty: data?.overallDifficulty,
    outputLanguage: data?.outputLanguage,
    examLanguage: data?.examLanguage,
    additionalPrompt: data?.prompt,
    taskId: data?.taskId,
    userPromptId: data?.userPromptId,
  };
  const response = await api.post('/mocktest/generate', v2Payload, { timeout: 0 });
  // Unwrap ApiResponse → flat shape giống v1 (cho callers cũ tương thích).
  const apiBody = response?.statusCode ? response : response?.data;
  const inner = apiBody?.data;
  if (inner && typeof inner === 'object') {
    return {
      ...apiBody,
      ...inner,
      message: apiBody.message,
      websocketTaskId: inner.taskId,
    };
  }
  return response;
};

/**
 * @deprecated Use useMockTestStructureSuggestion hook (đã migrate sang v2 recommend + getTemplate).
 * Giữ stub này để không break import cũ — nhưng chỉ throw để dev biết phải migrate sang hook.
 */
export const suggestMockTestStructure = async () => {
  throw new Error(
    '[DEPRECATED] suggestMockTestStructure() — sử dụng useMockTestStructureSuggestion hook hoặc '
    + 'recommendMockTestTemplate() + getMockTestTemplate() từ @/api/MockTestAPI thay thế.',
  );
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
  const response = await api.post('/ai/quiz:generated', data, { timeout: 0 });
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
