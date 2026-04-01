import api from './api';


const QUESTION_TYPE_SINGLE_CHOICE_ID = 1;
const MOCK_TEST_DIFFICULTY = 'MEDIUM';
const MOCK_TEST_POLL_ATTEMPTS = 30;
const MOCK_TEST_POLL_INTERVAL_MS = 1500;

function trimToNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeListField(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n;/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function extractApiData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function normalizeRoadmapKnowledgeLoad(value) {
  if (value === 'INTERMEDIATE') return 'INTERMEDIATE';
  if (value === 'ADVANCED') return 'ADVANCED';
  if (value === 'FULL') return 'ADVANCED';
  return value === 'BASIC' ? 'BASIC' : '';
}

function deriveCurrentStep(profile) {
  const setupStatus = profile?.workspaceSetupStatus;
  if (setupStatus === 'DONE') return 3;
  if (setupStatus === 'PROFILE_DONE') return 3;
  if (profile?.profileStatus === 'BASIC_DONE' || profile?.profileStatus === 'DONE') return 2;
  return 1;
}

export function normalizeIndividualWorkspaceProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const learningMode = profile.workspacePurpose || profile.learningMode || '';
  const mockExamCatalogId = profile.mockExamCatalogId || '';
  const mockExamMode = profile.mockExamMode || null;
  const materialCount = Number(profile.materialCount);
  const normalizedMaterialCount = Number.isFinite(materialCount) && materialCount > 0 ? materialCount : 0;

  return {
    ...profile,
    workspacePurpose: learningMode,
    learningMode,
    currentStep: Number(profile.currentStep) || deriveCurrentStep(profile),
    totalSteps: Number(profile.totalSteps) || 3,
    onboardingCompleted: Boolean(profile.onboardingCompleted ?? profile.workspaceSetupStatus === 'DONE'),
    materialCount: normalizedMaterialCount,
    hasMaterials: Boolean(profile.hasMaterials ?? normalizedMaterialCount > 0),
    knowledgeInput: profile.knowledgeInput ?? profile.knowledge ?? '',
    inferredDomain: profile.inferredDomain ?? profile.domain ?? '',
    enableRoadmap:
      learningMode === 'STUDY_NEW'
        ? true
        : Boolean(profile.enableRoadmap ?? profile.roadmapEnabled),
    mockExamCatalogId,
    mockExamMode,
    mockExamName: profile.mockExamName ?? profile.examName ?? '',
    knowledgeLoad: normalizeRoadmapKnowledgeLoad(profile.knowledgeLoad ?? profile.roadmapKnowledgeLoad ?? ''),
    roadmapSpeedMode:
      profile.roadmapSpeedMode
      || (profile.speedMode === 'MEDIUM' ? 'STANDARD' : profile.speedMode || ''),
    recommendedMinutesPerDay:
      profile.recommendedMinutesPerDay
      ?? profile.estimatedMinutesPerDay
      ?? null,
    templatePrompt: profile.templatePrompt ?? '',
    templateDurationMinutes: profile.templateDurationMinutes ?? null,
    templateQuestionCount: profile.templateQuestionCount ?? null,
  };
}

function mapAdaptationMode(value) {
  if (value === 'FLEXIBLE') return 'FLEXIBLE';
  if (value === 'STRICT') return 'STRICT';
  if (value === 'BALANCED') return 'STRICT';
  return null;
}

function mapRoadmapSpeedMode(value) {
  if (value === 'SLOW') return 'SLOW';
  if (value === 'FAST') return 'FAST';
  if (value === 'MEDIUM' || value === 'STANDARD') return 'MEDIUM';
  return null;
}

function resolveOutputLanguage() {
  if (typeof window !== 'undefined') {
    const appLanguage = window.localStorage?.getItem('app_language');
    if (appLanguage === 'en') return 'English';
  }

  return 'Vietnamese';
}

function splitQuestionsAcrossSections(totalQuestions, sectionCount) {
  const safeTotal = Math.max(1, Number(totalQuestions) || 1);
  const safeSectionCount = Math.max(1, sectionCount);
  const baseCount = Math.floor(safeTotal / safeSectionCount);
  const remainder = safeTotal % safeSectionCount;

  return Array.from({ length: safeSectionCount }, (_, index) => baseCount + (index < remainder ? 1 : 0))
    .filter((count) => count > 0);
}

function extractLeadingNumber(value) {
  const matched = `${value || ''}`.match(/\d+/);
  return matched ? Number(matched[0]) : 0;
}

function buildSectionConfigs(payload, examName) {
  const defaultQuestionCount =
    Number(payload.templateQuestionCount)
    || 60;



  const totalQuestions = Math.max(1, defaultQuestionCount);
  const focusLabel = trimToNull(payload.inferredDomain) || trimToNull(payload.knowledgeInput) || examName || 'Mock Test';
  const format = payload.templateFormat || 'FULL_EXAM';

  const sectionTemplates = {
    FULL_EXAM: ['Full Exam'],
    SECTION_BASED: ['Section 1', 'Section 2', 'Section 3'],
    PRACTICE_SET: ['Core Practice', 'Mixed Review'],
  };

  const sectionNames = sectionTemplates[format] || sectionTemplates.FULL_EXAM;
  const questionCounts = splitQuestionsAcrossSections(totalQuestions, sectionNames.length);

  return questionCounts.map((numQuestions, index) => ({
    name: sectionNames[index] || `Section ${index + 1}`,
    description: `Tap trung vao ${focusLabel}.`,
    numQuestions,
    questionTypes: [
      {
        questionTypeId: QUESTION_TYPE_SINGLE_CHOICE_ID,
      },
    ],
  }));
}

function buildMockTestPrompt(payload) {
  const parts = [trimToNull(payload.templatePrompt), trimToNull(payload.templateNotes)].filter(Boolean);
  return parts.length > 0 ? parts.join('\n\n') : null;
}

function buildBasicStepRequest(payload) {
  const learningMode = payload.workspacePurpose || payload.learningMode;

  return {
    learningMode,
    domain: trimToNull(payload.inferredDomain) || trimToNull(payload.customDomain) || trimToNull(payload.domain),
    knowledge: trimToNull(payload.knowledgeInput) || trimToNull(payload.customKnowledge) || trimToNull(payload.knowledge),
    roadmapEnabled: learningMode === 'STUDY_NEW' ? true : Boolean(payload.enableRoadmap ?? payload.roadmapEnabled),
  };
}

function buildPersonalInfoStepRequest(payload) {
  return {
    currentLevel: trimToNull(payload.currentLevel) || trimToNull(payload.customCurrentLevel),
    learningGoal: trimToNull(payload.learningGoal),
    weakAreas: normalizeListField(payload.weakAreas),
    strongAreas: normalizeListField(payload.strongAreas),
  };
}

function buildMockTestPersonalInfoRequest(payload) {
  const examName = trimToNull(payload.mockExamName) || trimToNull(payload.examName);

  return {
    currentLevel: trimToNull(payload.currentLevel) || trimToNull(payload.customCurrentLevel),
    learningGoal: trimToNull(payload.learningGoal),
    examName,
    weakAreas: normalizeListField(payload.weakAreas),
    strongAreas: normalizeListField(payload.strongAreas),
    mockTestRequest: {
      title: `${examName || trimToNull(payload.inferredDomain) || 'Mock Test'} Template`,
      materialIds: [],
      overallDifficulty: MOCK_TEST_DIFFICULTY,
      durationInMinute: Math.max(
        1,
        Number(payload.templateDurationMinutes)
        || 90
      ),
      durationInSecond: 0,
      totalQuestion: Math.max(
        1,
        Number(payload.templateQuestionCount)
        || 60
      ),
      prompt: buildMockTestPrompt(payload),
      outputLanguage: resolveOutputLanguage(),
      sectionConfigs: buildSectionConfigs(payload, examName),
    },
  };
}

function buildRoadmapConfigStepRequest(payload) {
  const roadmapEnabled = payload.workspacePurpose === 'STUDY_NEW' ? true : Boolean(payload.enableRoadmap ?? payload.roadmapEnabled);

  if (!roadmapEnabled) {
    return {
      adaptationMode: null,
      speedMode: null,
      estimatedTotalDays: null,
      estimatedMinutesPerDay: null,
    };
  }

  return {
    knowledgeLoad: payload.knowledgeLoad || null,
    adaptationMode: mapAdaptationMode(payload.adaptationMode),
    speedMode: mapRoadmapSpeedMode(payload.roadmapSpeedMode),
    estimatedTotalDays: Number(payload.estimatedTotalDays) || null,
    estimatedMinutesPerDay: Number(payload.recommendedMinutesPerDay) || Number(payload.estimatedMinutesPerDay) || null,
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function waitForMockTestPersonalInfoDone(workspaceId) {
  for (let attempt = 0; attempt < MOCK_TEST_POLL_ATTEMPTS; attempt += 1) {
    const response = await getIndividualWorkspaceProfile(workspaceId);
    const profile = normalizeIndividualWorkspaceProfile(extractApiData(response));

    if (profile?.currentStep >= 3 || ['PROFILE_DONE', 'DONE'].includes(profile?.workspaceSetupStatus)) {
      return response;
    }

    await delay(MOCK_TEST_POLL_INTERVAL_MS);
  }

  throw new Error('Mock test onboarding chưa hoàn tất ở bước 2. Vui lòng thử lại sau ít phút.');
}

// Lấy danh sách workspace theo user đang đăng nhập (có hỗ trợ phân trang)
export const getWorkspacesByUser = async (page = 0, size = 10) => {
  const response = await api.get(`/workspace/getByUser?page=${page}&size=${size}`);
  return response;
};

// Tạo individual workspace mới
export const createWorkspace = async (data) => {
  const payload = { ...(data || {}) };
  if (payload.title !== undefined && payload.name === undefined) {
    payload.name = payload.title;
  }
  delete payload.title;

  const response = await api.post('/workspace/create/individual', payload);
  return response;
};

// Tạo group workspace mới
export const createGroupWorkspace = async (data) => {
  const payload = { ...(data || {}) };
  if (payload.title !== undefined && payload.name === undefined) {
    payload.name = payload.title;
  }
  delete payload.title;

  const response = await api.post('/workspace/create/group', payload);
  return response;
};

// Cập nhật thông tin workspace
export const updateWorkspace = async (workspaceId, data) => {
  const payload = { ...(data || {}) };
  if (payload.title !== undefined && payload.name === undefined) {
    payload.name = payload.title;
  }
  delete payload.title;

  const response = await api.put(`/workspace/${workspaceId}`, payload);
  return response;
};

// Xóa workspace
export const deleteIndividualWorkspace = async (workspaceId) => {
  const response = await api.delete(`/workspace/individual/${workspaceId}`);
  return response;
};

export const deleteWorkspace = async (workspaceId) => {
  return deleteIndividualWorkspace(workspaceId);
};

// Lấy chi tiết workspace
export const getWorkspaceById = async (workspaceId) => {
  const response = await api.get(`/workspace/${workspaceId}`);
  return response;
};

export const getWorkspaceQuizRecommendations = async (workspaceId) => {
  const response = await api.get(`/workspace/${workspaceId}/quiz-recommendations`);
  return response;
};

export const getWorkspacePersonalization = async (workspaceId) => {
  const response = await api.get(`/workspace/${workspaceId}/personalization`);
  return response;
};

export const getWorkspaceCommunityQuizzes = async (workspaceId) => {
  const response = await api.get(`/workspace/${workspaceId}/community-quizzes`);
  return response;
};

export const logWorkspaceQuizRecommendationEvents = async (workspaceId, data) => {
  const response = await api.post(`/workspace/${workspaceId}/quiz-recommendations/events`, data);
  return response;
};

export const getWorkspaceQuizRecommendationMetrics = async (workspaceId, days = 30) => {
  const response = await api.get(`/workspace/${workspaceId}/quiz-recommendations/metrics?days=${days}`);
  return response;
};

export const getWorkspaceQuizRecommendationOfflineComparison = async (workspaceId, days = 30) => {
  const response = await api.get(`/workspace/${workspaceId}/quiz-recommendations/offline-comparison?days=${days}`);
  return response;
};

export const getWorkspaceQuizRecommendationSampleRequests = async (workspaceId, days = 30, limit = 8) => {
  const response = await api.get(`/workspace/${workspaceId}/quiz-recommendations/sample-requests?days=${days}&limit=${limit}`);
  return response;
};

// Lấy danh sách roadmap của workspace (có phân trang)
export const getRoadmapsByWorkspace = async (workspaceId, page = 0, size = 10) => {
  const response = await api.get(`/roadmap/workspace/${workspaceId}?page=${page}&size=${size}`);
  return response;
};


export const saveIndividualWorkspaceBasicStep = async (workspaceId, data) => {
  const response = await api.put(`/workspace-profile/individual/${workspaceId}/steps/basic`, buildBasicStepRequest(data));
  return response;
};

export const saveIndividualWorkspacePersonalInfoStep = async (workspaceId, data) => {
  const response = await api.put(`/workspace-profile/individual/${workspaceId}/steps/personal-info`, buildPersonalInfoStepRequest(data));
  return response;
};

export const startIndividualWorkspaceMockTestPersonalInfoStep = async (workspaceId, data) => {
  const response = await api.post(
    `/workspace-profile/individual/${workspaceId}/steps/personal-info/mock-test`,
    buildMockTestPersonalInfoRequest(data)
  );
  return response;
};

export const saveIndividualWorkspaceRoadmapConfigStep = async (workspaceId, data) => {
  const response = await api.put(
    `/workspace-profile/individual/${workspaceId}/steps/roadmap-config`,
    buildRoadmapConfigStepRequest(data)
  );
  return response;
};

export const confirmIndividualWorkspaceProfile = async (workspaceId) => {
  const response = await api.post(`/workspace-profile/individual/${workspaceId}/steps/confirm`);
  return response;
};

// Cấu hình Individual Workspace Profile theo flow 3 bước mới
export const configureIndividualWorkspaceProfile = async (workspaceId, data) => {
  await saveIndividualWorkspaceBasicStep(workspaceId, data);

  if ((data.workspacePurpose || data.learningMode) === 'MOCK_TEST') {
    await startIndividualWorkspaceMockTestPersonalInfoStep(workspaceId, data);
    await waitForMockTestPersonalInfoDone(workspaceId);
  } else {
    await saveIndividualWorkspacePersonalInfoStep(workspaceId, data);
  }

  return await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, data);
};

// Lấy Profile Cá nhân của Workspace
export const getIndividualWorkspaceProfile = async (workspaceId) => {
  const response = await api.get(`/workspace-profile/individual/${workspaceId}`);
  return response;
};

// ====== Group Workspace Profile ======

function trimToNullSafe(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeGroupWorkspaceProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;

  const materialCount = Number(profile.materialCount);
  const normalizedMaterialCount = Number.isFinite(materialCount) && materialCount > 0 ? materialCount : 0;
  const workspaceSetupStatus = profile.workspaceSetupStatus;
  const onboardingCompleted = Boolean(
    profile.onboardingCompleted
    ?? (workspaceSetupStatus === 'DONE' || workspaceSetupStatus === 'PROFILE_DONE')
  );
  const currentStep = Number(profile.currentStep)
    || (workspaceSetupStatus === 'DONE' || workspaceSetupStatus === 'PROFILE_DONE' ? 2 : 1);

  return {
    ...profile,
    currentStep,
    totalSteps: Number(profile.totalSteps) || 2,
    onboardingCompleted,
    materialCount: normalizedMaterialCount,
    hasMaterials: Boolean(profile.hasMaterials ?? normalizedMaterialCount > 0),
  };
}

export const getGroupWorkspaceProfile = async (workspaceId) => {
  const response = await api.get(`/workspace-profile/group/${workspaceId}`);
  return response;
};

export const saveGroupBasicStep = async (workspaceId, data) => {
  const payload = {
    groupName: trimToNullSafe(data.groupName),
    rules: trimToNullSafe(data.rules),
    defaultRoleOnJoin: trimToNullSafe(data.defaultRoleOnJoin),
  };
  const response = await api.put(`/workspace-profile/group/${workspaceId}/steps/basic`, payload);
  return response;
};

export const saveGroupConfigStep = async (workspaceId, data) => {
  const payload = {
    domain: trimToNullSafe(data.domain),
    knowledge: trimToNullSafe(data.knowledge),
    learningMode: data.learningMode || null,
    roadmapEnabled: Boolean(data.roadmapEnabled),
    groupLearningGoal: trimToNullSafe(data.groupLearningGoal),
    examName: trimToNullSafe(data.examName),
    preLearningRequired: Boolean(data.preLearningRequired),
  };
  const response = await api.put(`/workspace-profile/group/${workspaceId}/steps/config`, payload);
  return response;
};

export const confirmGroupWorkspaceProfile = async (workspaceId) => {
  const response = await api.post(`/workspace-profile/group/${workspaceId}/steps/confirm`);
  return response;
};

// ====== Individual Workspace Question Stats ======

export const getIndividualWorkspaceQuestionStats = async (workspaceId, attemptMode = 'OFFICIAL') => {
  const response = await api.get(`/workspace/${workspaceId}/question-stats?attemptMode=${attemptMode}`);
  return response;
};
