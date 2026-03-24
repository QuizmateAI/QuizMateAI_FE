import api from './api';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatEstimatedDuration(totalDays, minutesPerDay) {
  const safeDays = Number(totalDays) || 0;
  const safeMinutes = Number(minutesPerDay) || 0;
  if (!safeDays && !safeMinutes) return 'N/A';
  if (!safeMinutes) return `${safeDays} ngày`;
  if (!safeDays) return `${safeMinutes} phút/ngày`;
  return `${safeDays} ngày • ${safeMinutes} phút/ngày`;
}

function getCanvasPreference(roadmapId) {
  if (!roadmapId) return null;
  const value = localStorage.getItem(`roadmap_${roadmapId}_canvasView`);
  return value === 'view1' || value === 'view2' ? value : null;
}

function mapQuizNode(quiz) {
  return {
    quizId: quiz?.quizId ?? quiz?.id ?? null,
    id: quiz?.quizId ?? quiz?.id ?? null,
    roadmapId: quiz?.roadmapId ?? null,
    workspaceId: quiz?.workspaceId ?? null,
    phaseId: quiz?.phaseId ?? null,
    knowledgeId: quiz?.knowledgeId ?? null,
    title: quiz?.title || 'Quiz',
    questionCount: Number(quiz?.totalQuestion ?? quiz?.questionCount ?? quiz?.totalQuestions ?? 0) || 0,
    duration: Number(quiz?.duration) || 0,
    maxAttempt: quiz?.maxAttempt ?? null,
    passScore: quiz?.passScore ?? null,
    maxScore: quiz?.maxScore ?? null,
    timerMode: quiz?.timerMode ?? null,
    editable: quiz?.editable ?? null,
    myAttempted: quiz?.myAttempted ?? null,
    myPassed: quiz?.myPassed ?? null,
    createVia: quiz?.createVia ?? null,
    createdAt: quiz?.createdAt ?? null,
    overallDifficulty: quiz?.overallDifficulty ?? null,
    materialIds: toArray(quiz?.materialIds),
    status: quiz?.status || null,
    quizIntent: quiz?.quizIntent || null,
  };
}

function extractApiPayload(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }
  return response;
}

function mergeRoadmapQuizzes(mappedRoadmap, roadmapQuizzes = []) {
  if (!mappedRoadmap) return mappedRoadmap;

  const normalizedQuizzes = toArray(roadmapQuizzes).map(mapQuizNode);
  const phaseQuizGroups = normalizedQuizzes.reduce((acc, quiz) => {
    const phaseId = Number(quiz?.phaseId);
    if (!Number.isInteger(phaseId) || phaseId <= 0) return acc;
    const intent = String(quiz?.quizIntent || '').toUpperCase();
    if (!acc[phaseId]) acc[phaseId] = { preLearning: [], postLearning: [], byKnowledge: {} };

    if (intent === 'PRE_LEARNING') {
      acc[phaseId].preLearning.push(quiz);
      return acc;
    }

    if (intent === 'POST_LEARNING') {
      acc[phaseId].postLearning.push(quiz);
      return acc;
    }

    const knowledgeId = Number(quiz?.knowledgeId);
    if (Number.isInteger(knowledgeId) && knowledgeId > 0) {
      if (!acc[phaseId].byKnowledge[knowledgeId]) acc[phaseId].byKnowledge[knowledgeId] = [];
      acc[phaseId].byKnowledge[knowledgeId].push(quiz);
    }

    return acc;
  }, {});

  const phases = toArray(mappedRoadmap?.phases).map((phase) => {
    const phaseId = Number(phase?.phaseId);
    const grouped = phaseQuizGroups[phaseId] || { preLearning: [], postLearning: [], byKnowledge: {} };

    const knowledges = toArray(phase?.knowledges).map((knowledge) => {
      const knowledgeId = Number(knowledge?.knowledgeId);
      const mergedQuizzes = grouped.byKnowledge[knowledgeId] || toArray(knowledge?.quizzes);
      return {
        ...knowledge,
        quizzes: mergedQuizzes,
      };
    });

    const preLearningQuizzes = grouped.preLearning.length > 0 ? grouped.preLearning : toArray(phase?.preLearningQuizzes);
    const postLearningQuizzes = grouped.postLearning.length > 0 ? grouped.postLearning : toArray(phase?.postLearningQuizzes);

    return {
      ...phase,
      knowledges,
      preLearningQuizzes,
      postLearningQuizzes,
      preLearning: preLearningQuizzes[0] || null,
      postLearning: postLearningQuizzes[0] || null,
    };
  });

  const stats = phases.reduce((accumulator, phase) => {
    accumulator.phaseCount += 1;
    accumulator.knowledgeCount += toArray(phase.knowledges).length;
    accumulator.quizCount += toArray(phase.preLearningQuizzes).length;
    accumulator.quizCount += toArray(phase.postLearningQuizzes).length;
    accumulator.quizCount += toArray(phase.knowledges).reduce((sum, knowledge) => sum + toArray(knowledge.quizzes).length, 0);
    accumulator.flashcardCount += toArray(phase.knowledges).reduce((sum, knowledge) => sum + toArray(knowledge.flashcards).length, 0);
    return accumulator;
  }, { phaseCount: 0, knowledgeCount: 0, quizCount: 0, flashcardCount: 0 });

  return {
    ...mappedRoadmap,
    phases,
    stats,
  };
}

function mapRoadmapStructureToCanvas(structure) {
  const phases = toArray(structure?.phases).map((phase, index) => {
    const preLearningQuizzes = toArray(phase?.preLearningQuizzes).map(mapQuizNode);
    const postLearningQuizzes = toArray(phase?.postLearningQuizzes).map(mapQuizNode);
    const knowledges = toArray(phase?.knowledges).map((knowledge) => ({
      knowledgeId: knowledge?.knowledgeId,
      phaseId: knowledge?.phaseId,
      title: knowledge?.title || 'Knowledge',
      description: knowledge?.description || '',
      quizzes: toArray(knowledge?.quizzes).map(mapQuizNode),
      // Structure API currently does not include flashcards.
      flashcards: [],
    }));

    return {
      phaseId: phase?.phaseId,
      phaseIndex: Math.max(0, Number(phase?.phaseIndex ?? index + 1) - 1),
      title: phase?.title || `Phase ${index + 1}`,
      description: phase?.description || '',
      status: phase?.status || null,
      isRemedial: Boolean(phase?.isRemedial),
      estimatedDays: Number(phase?.estimatedDays) || 0,
      estimatedMinutesPerDay: Number(phase?.estimatedMinutesPerDay) || 0,
      durationLabel: formatEstimatedDuration(phase?.estimatedDays, phase?.estimatedMinutesPerDay),
      preLearningQuizzes,
      postLearningQuizzes,
      knowledges,
      // Backward-compat fields used by current canvas.
      preLearning: preLearningQuizzes[0] || null,
      postLearning: postLearningQuizzes[0] || null,
    };
  });

  const stats = phases.reduce((accumulator, phase) => {
    accumulator.phaseCount += 1;
    accumulator.knowledgeCount += toArray(phase.knowledges).length;
    accumulator.quizCount += toArray(phase.preLearningQuizzes).length;
    accumulator.quizCount += toArray(phase.postLearningQuizzes).length;
    accumulator.quizCount += toArray(phase.knowledges).reduce((sum, knowledge) => sum + toArray(knowledge.quizzes).length, 0);
    accumulator.flashcardCount += toArray(phase.knowledges).reduce((sum, knowledge) => sum + toArray(knowledge.flashcards).length, 0);
    return accumulator;
  }, { phaseCount: 0, knowledgeCount: 0, quizCount: 0, flashcardCount: 0 });

  return {
    roadmapId: structure?.roadmapId,
    workspaceId: structure?.workspaceId,
    title: structure?.title || 'Roadmap',
    description: structure?.description || '',
    status: structure?.status || null,
    estimatedTotalDays: Number(structure?.estimatedTotalDays) || 0,
    estimatedMinutesPerDay: Number(structure?.estimatedMinutesPerDay) || 0,
    speedMode: structure?.speedMode || 'MEDIUM',
    estimatedDuration: formatEstimatedDuration(structure?.estimatedTotalDays, structure?.estimatedMinutesPerDay),
    canvasView: getCanvasPreference(structure?.roadmapId),
    phases,
    stats,
  };
}

export const getRoadmapGraph = async ({ workspaceId = null } = {}) => {
  if (!workspaceId) {
    return buildMockResponse(null);
  }

  // Canvas currently used in individual workspace. Resolve roadmapId via workspace profile.
  if (workspaceId) {
    try {
      const profileResponse = await api.get(`/workspace-profile/individual/${workspaceId}`);
      const profileData = profileResponse?.data || profileResponse;
      const roadmapId = profileData?.roadmap_id ?? profileData?.roadmapId ?? null;

      if (!roadmapId) {
        return buildMockResponse(null);
      }

      const [structureResponse, roadmapQuizResponse] = await Promise.all([
        api.get(`/roadmaps/${roadmapId}/structure`),
        api.get(`/quiz/getByRoadmap/${roadmapId}`).catch(() => null),
      ]);

      const structurePayload = extractApiPayload(structureResponse);
      const mappedRoadmap = mapRoadmapStructureToCanvas(structurePayload);

      const roadmapQuizPayload = roadmapQuizResponse ? extractApiPayload(roadmapQuizResponse) : [];
      const enrichedRoadmap = mergeRoadmapQuizzes(mappedRoadmap, roadmapQuizPayload);

      return buildMockResponse(enrichedRoadmap);
    } catch (error) {
      console.error('Failed to fetch roadmap structure:', error);
      return buildMockResponse(null);
    }
  }

  return buildMockResponse(getStoredRoadmap({ workspaceId }));
};

// Lấy cấu trúc roadmap theo roadmapId từ backend thật.
// Hàm này không swallow lỗi để caller có thể xử lý 404 cụ thể.
export const getRoadmapStructureById = async (roadmapId) => {
  const normalizedRoadmapId = Number(roadmapId);
  if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) {
    return null;
  }

  return api.get(`/roadmaps/${normalizedRoadmapId}/structure`);
};

// ==================== ROADMAP ====================

// Tạo roadmap cho workspace
export const createRoadmap = async (data) => {
  // Real API reference:
  // return api.post(`/roadmap/create/workspace/${data.workspaceId}`, data);
  const workspaceId = Number(data.workspaceId);
  const graph = buildSeedRoadmapGraph(data, { workspaceId });
  return buildMockResponse(setStoredRoadmap({ workspaceId }, graph));
};

// Tạo roadmap general cho workspace cá nhân — POST /roadmap/create/workspace/{workspaceId}
export const createRoadmapForWorkspace = async (data) => {
  // Real API reference:
  // return api.post(`/roadmap/create/workspace/${data.workspaceId}`, data);
  const workspaceId = Number(data.workspaceId);
  const graph = buildSeedRoadmapGraph(data, { workspaceId });
  return buildMockResponse(setStoredRoadmap({ workspaceId }, graph));
};

// Lấy danh sách roadmap của workspace cá nhân (có phân trang)
export const getRoadmapsByWorkspace = async (workspaceId, page = 0, size = 10) => {
  // Real API reference:
  // return api.get(`/roadmap/workspace/${workspaceId}`, { params: { page, size } });
  const roadmap = getStoredRoadmap({ workspaceId });
  const content = roadmap ? [mapGraphToRoadmapListItem(roadmap)] : [];
  return buildMockResponse({ content, page, size, totalElements: content.length });
};

// Lấy thông tin roadmap theo ID
export const getRoadmapById = async (roadmapId) => {
  // Real API reference:
  // return api.get(`/roadmap/${roadmapId}`);
  return buildMockResponse(findStoredRoadmapById(roadmapId));
};

// Cập nhật roadmap
export const updateRoadmap = async (roadmapId, data) => {
  // Real API reference:
  // return api.put(`/roadmap/${roadmapId}`, data);
  const roadmap = findStoredRoadmapById(roadmapId);
  if (!roadmap) return buildMockResponse(null);
  roadmap.title = data.title ?? data.name ?? roadmap.title;
  roadmap.description = data.description ?? data.goal ?? roadmap.description;
  roadmap.canvasView = data.canvasView ?? roadmap.canvasView ?? 'view1';
  return buildMockResponse(refreshRoadmapStats(roadmap));
};

// Xóa roadmap
export const deleteRoadmap = async (roadmapId) => {
  // Real API reference:
  // return api.delete(`/roadmap/${roadmapId}`);
  for (const [scopeKey, roadmap] of MOCK_ROADMAP_STORE.entries()) {
    if (roadmap?.roadmapId === roadmapId) {
      MOCK_ROADMAP_STORE.delete(scopeKey);
      break;
    }
  }
  return buildMockResponse(true);
};

// ==================== PHASE ====================

// Lấy danh sách phases thuộc một roadmap (có phân trang)
export const getPhasesByRoadmap = async (roadmapId, page = 0, size = 10) => {
  // Real API reference:
  // return api.get(`/roadmap/${roadmapId}/phases`, { params: { page, size } });
  const roadmap = findStoredRoadmapById(roadmapId);
  const content = roadmap?.phases || [];
  return buildMockResponse({ content, page, size, totalElements: content.length });
};

// Tạo phase mới cho một roadmap cụ thể
export const createPhase = async (roadmapId, data) => {
  // Real API reference:
  // return api.post(`/roadmap/${roadmapId}/phase`, data);
  const roadmap = findStoredRoadmapById(roadmapId);
  if (!roadmap) return buildMockResponse(null);
  const phase = buildPhaseMock(data, roadmapId, roadmap.phases.length);
  roadmap.phases.push(phase);
  return buildMockResponse(refreshRoadmapStats(roadmap).phases[roadmap.phases.length - 1]);
};

// Cập nhật thông tin phase
export const updatePhase = async (phaseId, data) => {
  // Real API reference:
  // return api.put(`/roadmap/phase/${phaseId}`, data);
  const { roadmap, phase } = findPhaseById(phaseId);
  if (!phase || !roadmap) return buildMockResponse(null);
  phase.title = data.title ?? data.name ?? phase.title;
  phase.description = data.description ?? phase.description;
  phase.durationLabel = data.durationLabel ?? phase.durationLabel;
  return buildMockResponse(refreshRoadmapStats(roadmap));
};

// Xóa phase khỏi roadmap
export const deletePhase = async (phaseId, roadmapId) => {
  // Real API reference:
  // return api.delete(`/roadmap/${roadmapId}/phase/${phaseId}`);
  const roadmap = findStoredRoadmapById(roadmapId);
  if (!roadmap) return buildMockResponse(false);
  roadmap.phases = roadmap.phases
    .filter((phase) => phase.phaseId !== phaseId)
    .map((phase, index) => ({ ...phase, phaseIndex: index }));
  refreshRoadmapStats(roadmap);
  return buildMockResponse(true);
};

// Thay đổi thứ tự hiển thị phase trong roadmap
export const updatePhaseIndex = async (phaseId, roadmapId, newIndex) => {
  // Real API reference:
  // return api.patch(`/roadmap/${roadmapId}/phase/${phaseId}/index`, { newIndex });
  const roadmap = findStoredRoadmapById(roadmapId);
  if (!roadmap) return buildMockResponse(null);
  const currentIndex = roadmap.phases.findIndex((phase) => phase.phaseId === phaseId);
  if (currentIndex < 0) return buildMockResponse(null);
  const [phase] = roadmap.phases.splice(currentIndex, 1);
  roadmap.phases.splice(Math.max(0, Math.min(newIndex, roadmap.phases.length)), 0, phase);
  roadmap.phases = roadmap.phases.map((item, index) => ({ ...item, phaseIndex: index }));
  return buildMockResponse(refreshRoadmapStats(roadmap));
};

// ==================== KNOWLEDGE ====================

// Lấy danh sách knowledge thuộc một phase (có phân trang)
export const getKnowledgesByPhase = async (phaseId, page = 0, size = 10) => {
  // Real API reference:
  // return api.get(`/phase/${phaseId}/knowledges`, { params: { page, size } });
  const { phase } = findPhaseById(phaseId);
  const content = phase?.knowledges || [];
  return buildMockResponse({ content, page, size, totalElements: content.length });
};

// Lấy thông tin chi tiết knowledge theo ID
export const getKnowledgeById = async (knowledgeId) => {
  // Real API reference:
  // return api.get(`/knowledge/${knowledgeId}`);
  for (const roadmap of MOCK_ROADMAP_STORE.values()) {
    for (const phase of roadmap?.phases || []) {
      const knowledge = phase.knowledges.find((item) => item.knowledgeId === knowledgeId);
      if (knowledge) {
        return buildMockResponse(knowledge);
      }
    }
  }
  return buildMockResponse(null);
};

// Tạo knowledge mới trong phase cụ thể
export const createKnowledge = async (phaseId, data) => {
  // Real API reference:
  // return api.post(`/phase/${phaseId}/knowledge`, data);
  const { roadmap, phase } = findPhaseById(phaseId);
  if (!phase || !roadmap) return buildMockResponse(null);
  const knowledge = buildKnowledgeMock(data, phaseId, phase.knowledges.length);
  phase.knowledges.push(knowledge);
  refreshRoadmapStats(roadmap);
  return buildMockResponse(knowledge);
};

// Cập nhật thông tin knowledge
export const updateKnowledge = async (knowledgeId, data) => {
  // Real API reference:
  // return api.put(`/knowledge/${knowledgeId}`, data);
  for (const roadmap of MOCK_ROADMAP_STORE.values()) {
    for (const phase of roadmap?.phases || []) {
      const knowledge = phase.knowledges.find((item) => item.knowledgeId === knowledgeId);
      if (knowledge) {
        knowledge.title = data.title ?? data.name ?? knowledge.title;
        knowledge.description = data.description ?? knowledge.description;
        refreshRoadmapStats(roadmap);
        return buildMockResponse(knowledge);
      }
    }
  }
  return buildMockResponse(null);
};

// Xóa knowledge khỏi phase
export const deleteKnowledge = async (knowledgeId, phaseId) => {
  // Real API reference:
  // return api.delete(`/phase/${phaseId}/knowledge/${knowledgeId}`);
  const { roadmap, phase } = findPhaseById(phaseId);
  if (!phase || !roadmap) return buildMockResponse(false);
  phase.knowledges = phase.knowledges
    .filter((knowledge) => knowledge.knowledgeId !== knowledgeId)
    .map((knowledge, index) => ({ ...knowledge, knowledgeIndex: index }));
  refreshRoadmapStats(roadmap);
  return buildMockResponse(true);
};

// ==================== MOCK ROADMAP DATA ====================

const ROADMAP_GRAPH_SEED = {
  title: 'AI Learning Roadmap',
  description: 'Lộ trình học từ nền tảng đến triển khai thực chiến với quiz và flashcard ở từng knowledge.',
  estimatedDuration: '10 tuần',
  phases: [
    {
      phaseId: 'phase-foundation',
      title: 'Foundation',
      description: 'Củng cố nền tảng toán, xác suất và cách dữ liệu đi qua hệ thống AI.',
      durationLabel: '2 tuần',
      postLearning: {
        id: 'post-foundation',
        title: 'Post-learning: Foundation Checkpoint',
        questionCount: 18,
      },
      knowledges: [
        {
          knowledgeId: 'kn-linear-algebra',
          title: 'Linear Algebra Core',
          description: 'Vector, ma trận, phép chiếu và trực giác hình học cho ML.',
          quizzes: [
            { id: 'quiz-linear-basic', title: 'Linear Algebra Basics', questionCount: 12 },
            { id: 'quiz-linear-ops', title: 'Matrix Operations Drill', questionCount: 10 },
          ],
          flashcards: [
            { id: 'flash-linear-terms', title: 'Linear Algebra Terms', cardCount: 24 },
          ],
        },
        {
          knowledgeId: 'kn-probability',
          title: 'Probability Thinking',
          description: 'Biến ngẫu nhiên, phân phối và Bayes cơ bản.',
          quizzes: [
            { id: 'quiz-prob-intro', title: 'Probability Intro', questionCount: 14 },
          ],
          flashcards: [
            { id: 'flash-prob-bayes', title: 'Bayes Concepts', cardCount: 18 },
            { id: 'flash-prob-dist', title: 'Distributions Snapshot', cardCount: 16 },
          ],
        },
      ],
    },
    {
      phaseId: 'phase-data-prep',
      title: 'Data Preparation',
      description: 'Làm sạch dữ liệu, feature engineering và đánh giá chất lượng dữ liệu.',
      durationLabel: '2 tuần',
      postLearning: {
        id: 'post-data-prep',
        title: 'Post-learning: Data Readiness Review',
        questionCount: 15,
      },
      knowledges: [
        {
          knowledgeId: 'kn-cleaning',
          title: 'Cleaning Pipelines',
          description: 'Thiết kế pipeline để xử lý missing values, outliers và duplicates.',
          quizzes: [
            { id: 'quiz-cleaning', title: 'Data Cleaning Practice', questionCount: 11 },
          ],
          flashcards: [
            { id: 'flash-cleaning', title: 'Cleaning Heuristics', cardCount: 20 },
          ],
        },
        {
          knowledgeId: 'kn-feature-engineering',
          title: 'Feature Engineering',
          description: 'Tạo, chọn và chuẩn hóa feature cho từng bài toán.',
          quizzes: [
            { id: 'quiz-feature-design', title: 'Feature Design Cases', questionCount: 13 },
          ],
          flashcards: [
            { id: 'flash-feature-types', title: 'Feature Types', cardCount: 17 },
          ],
        },
      ],
    },
    {
      phaseId: 'phase-modeling',
      title: 'Modeling',
      description: 'Huấn luyện mô hình, tối ưu tham số và đọc metric đúng ngữ cảnh.',
      durationLabel: '3 tuần',
      postLearning: {
        id: 'post-modeling',
        title: 'Post-learning: Model Selection Sprint',
        questionCount: 22,
      },
      knowledges: [
        {
          knowledgeId: 'kn-supervised',
          title: 'Supervised Models',
          description: 'Linear models, tree-based models và cách so sánh bias-variance.',
          quizzes: [
            { id: 'quiz-supervised', title: 'Supervised Modeling', questionCount: 16 },
            { id: 'quiz-metrics', title: 'Metric Interpretation', questionCount: 9 },
          ],
          flashcards: [
            { id: 'flash-model-bias', title: 'Bias vs Variance', cardCount: 19 },
          ],
        },
        {
          knowledgeId: 'kn-experimentation',
          title: 'Experiment Tracking',
          description: 'Theo dõi run, baseline và quyết định iteration tiếp theo.',
          quizzes: [
            { id: 'quiz-experiment', title: 'Experiment Tracking', questionCount: 8 },
          ],
          flashcards: [
            { id: 'flash-experiment', title: 'Experiment Checklist', cardCount: 14 },
          ],
        },
      ],
    },
    {
      phaseId: 'phase-deployment',
      title: 'Deployment',
      description: 'Đưa mô hình vào sản phẩm, giám sát chất lượng và cải tiến liên tục.',
      durationLabel: '3 tuần',
      postLearning: {
        id: 'post-deployment',
        title: 'Post-learning: Production Readiness',
        questionCount: 20,
      },
      knowledges: [
        {
          knowledgeId: 'kn-serving',
          title: 'Serving & APIs',
          description: 'Đóng gói model, tối ưu inference và thiết kế endpoint.',
          quizzes: [
            { id: 'quiz-serving', title: 'Inference Serving', questionCount: 12 },
          ],
          flashcards: [
            { id: 'flash-serving', title: 'Serving Patterns', cardCount: 15 },
          ],
        },
        {
          knowledgeId: 'kn-monitoring',
          title: 'Monitoring',
          description: 'Theo dõi drift, latency, lỗi và phản hồi người dùng.',
          quizzes: [
            { id: 'quiz-monitoring', title: 'Monitoring in Production', questionCount: 10 },
          ],
          flashcards: [
            { id: 'flash-monitoring', title: 'Monitoring Signals', cardCount: 18 },
          ],
        },
      ],
    },
  ],
};

const MOCK_ROADMAP_STORE = new Map();
let mockSequence = 1;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextMockId(prefix) {
  const id = `${prefix}-${mockSequence}`;
  mockSequence += 1;
  return id;
}

function getScopeKey({ workspaceId = null } = {}) {
  return `workspace:${workspaceId}`;
}

function getScopeLabel({ workspaceId = null } = {}) {
  return `Workspace ${workspaceId ?? 'Demo'}`;
}

function buildStats(phases) {
  return {
    phaseCount: phases.length,
    knowledgeCount: phases.reduce((sum, phase) => sum + phase.knowledges.length, 0),
    quizCount: phases.reduce(
      (sum, phase) => sum + phase.knowledges.reduce((innerSum, knowledge) => innerSum + (knowledge.quizzes?.length ?? 0), 0),
      0
    ),
    flashcardCount: phases.reduce(
      (sum, phase) => sum + phase.knowledges.reduce((innerSum, knowledge) => innerSum + (knowledge.flashcards?.length ?? 0), 0),
      0
    ),
  };
}

function buildKnowledgeMock(knowledge, phaseId, knowledgeIndex) {
  const knowledgeTitle = knowledge?.name || knowledge?.title || `Knowledge ${knowledgeIndex + 1}`;
  return {
    knowledgeId: nextMockId('knowledge'),
    phaseId,
    knowledgeIndex,
    title: knowledgeTitle,
    description: knowledge?.description || '',
    quizzes: [
      {
        id: nextMockId('quiz'),
        title: `${knowledgeTitle} Quiz`,
        questionCount: 10 + (knowledgeIndex % 4) * 2,
      },
    ],
    flashcards: [
      {
        id: nextMockId('flashcard'),
        title: `${knowledgeTitle} Flashcards`,
        cardCount: 12 + (knowledgeIndex % 3) * 4,
      },
    ],
  };
}

function buildPhaseMock(phase, roadmapId, phaseIndex) {
  const phaseId = nextMockId('phase');
  const phaseTitle = phase?.name || phase?.title || `Phase ${phaseIndex + 1}`;
  const sourceKnowledges = Array.isArray(phase?.knowledges) && phase.knowledges.length > 0
    ? phase.knowledges
    : [{ name: `${phaseTitle} Core` }, { name: `${phaseTitle} Practice` }];

  return {
    phaseId,
    title: phaseTitle,
    description: phase?.description || '',
    durationLabel: phase?.durationLabel || `${Math.max(1, Math.min(4, sourceKnowledges.length))} tuần`,
    phaseIndex,
    roadmapId,
    postLearning: {
      id: nextMockId('post-learning'),
      title: `Post-learning: ${phaseTitle} Review`,
      questionCount: 12 + sourceKnowledges.length * 4,
    },
    knowledges: sourceKnowledges.map((knowledge, knowledgeIndex) => buildKnowledgeMock(knowledge, phaseId, knowledgeIndex)),
  };
}

function buildSeedRoadmapGraph(payload = {}, { workspaceId = null } = {}) {
  const scopeLabel = getScopeLabel({ workspaceId });
  const roadmapId = nextMockId('workspace-roadmap');
  const graph = deepClone(ROADMAP_GRAPH_SEED);
  const phases = graph.phases.map((phase, phaseIndex) => {
    const phaseId = nextMockId('phase');
    return {
      ...phase,
      phaseId,
      phaseIndex,
      roadmapId,
      postLearning: {
        ...phase.postLearning,
        id: nextMockId('post-learning'),
      },
      knowledges: phase.knowledges.map((knowledge, knowledgeIndex) => ({
        ...knowledge,
        knowledgeId: nextMockId('knowledge'),
        phaseId,
        knowledgeIndex,
        quizzes: knowledge.quizzes.map((quiz) => ({
          ...quiz,
          id: nextMockId('quiz'),
        })),
        flashcards: knowledge.flashcards.map((flashcard) => ({
          ...flashcard,
          id: nextMockId('flashcard'),
        })),
      })),
    };
  });

  const title = payload?.name?.trim() || `${graph.title} - ${scopeLabel}`;
  const description = payload?.goal?.trim() || payload?.description?.trim() || graph.description;

  return {
    roadmapId,
    title,
    description,
    estimatedDuration: graph.estimatedDuration,
    canvasView: payload?.canvasView === 'view2' ? 'view2' : 'view1',
    generatedAt: new Date().toISOString(),
    phases,
    stats: buildStats(phases),
  };
}

function getStoredRoadmap(scope) {
  return MOCK_ROADMAP_STORE.get(getScopeKey(scope)) ?? null;
}

function setStoredRoadmap(scope, roadmap) {
  MOCK_ROADMAP_STORE.set(getScopeKey(scope), roadmap);
  return roadmap;
}

function mapGraphToRoadmapListItem(graph) {
  return {
    roadmapId: graph.roadmapId,
    title: graph.title,
    description: graph.description,
    status: 'ACTIVE',
    createdAt: graph.generatedAt,
    roadmapType: 'GENERAL',
    createVia: 'MOCK',
  };
}

function findStoredRoadmapById(roadmapId) {
  for (const roadmap of MOCK_ROADMAP_STORE.values()) {
    if (roadmap?.roadmapId === roadmapId) {
      return roadmap;
    }
  }
  return null;
}

function findPhaseById(phaseId) {
  for (const roadmap of MOCK_ROADMAP_STORE.values()) {
    const phase = roadmap?.phases?.find((item) => item.phaseId === phaseId);
    if (phase) {
      return { roadmap, phase };
    }
  }
  return { roadmap: null, phase: null };
}

function refreshRoadmapStats(roadmap) {
  roadmap.stats = buildStats(roadmap.phases);
  roadmap.generatedAt = new Date().toISOString();
  return roadmap;
}

function buildMockResponse(data) {
  return Promise.resolve({
    data: {
      success: true,
      data,
    },
  });
}
