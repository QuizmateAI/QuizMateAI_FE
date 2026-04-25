import {
  QUESTION_TYPE_IDS,
  clone,
  nextId,
  normalizeWorkspaceId,
  nowIso,
  readActiveUser,
  readStore,
  writeStore,
} from './groupReviewMockStateStore';
import {
  buildInitialWorkspaceState,
  buildLiveMaterial,
  buildLiveMember,
  buildQuizRecord,
  buildThread,
  ensureShowcaseMaterials,
  mergeLiveLogs,
  mergeMaterials,
  mergeMembers,
} from './groupReviewMockStateBuilders';

function getWorkspaceState(store, workspaceId) {
  return store.workspaces[String(workspaceId)] || null;
}

function setWorkspaceState(store, workspaceId, state) {
  store.workspaces[String(workspaceId)] = state;
}

export function syncGroupReviewWorkspace(payload) {
  const normalizedWorkspaceId = normalizeWorkspaceId(payload?.workspaceId);
  if (!normalizedWorkspaceId) return null;

  const store = readStore();
  const existing = getWorkspaceState(store, normalizedWorkspaceId);

  if (!existing) {
    const created = buildInitialWorkspaceState(store, normalizedWorkspaceId, payload);
    setWorkspaceState(store, normalizedWorkspaceId, created);
    writeStore(store);
    return clone(created);
  }

  const currentUser = payload.currentUser || readActiveUser();
  const liveMembers = Array.isArray(payload.members) && payload.members.length > 0
    ? payload.members.map((member, index) => buildLiveMember(member, index, currentUser))
    : existing.members;
  const liveMaterials = Array.isArray(payload.materials)
    ? payload.materials.map((material, index) => buildLiveMaterial(material, index, liveMembers))
    : existing.materials.filter((material) => material.source === 'live');

  const nextMembers = mergeMembers(existing.members, liveMembers);
  const nextState = {
    ...existing,
    group: {
      ...existing.group,
      groupName: payload.group?.groupName || payload.group?.displayTitle || payload.group?.name || existing.group?.groupName,
      description: payload.group?.description || payload.group?.groupLearningGoal || existing.group?.description,
      memberRole: payload.group?.memberRole || existing.group?.memberRole,
    },
    members: nextMembers,
    materials: ensureShowcaseMaterials(store, {
      ...existing,
      members: nextMembers,
      materials: mergeMaterials(existing.materials, liveMaterials),
    }),
    logs: mergeLiveLogs(existing.logs, payload.logs),
    updatedAt: nowIso(),
  };

  nextState.memberPerformance = nextState.memberPerformance.map((memberPerf) => {
    const liveMember = nextState.members.find((member) => Number(member.userId) === Number(memberPerf.userId));
    if (!liveMember) return memberPerf;
    return {
      ...memberPerf,
      fullName: liveMember.fullName,
      role: liveMember.role,
      lastActiveAt: memberPerf.lastActiveAt || nowIso(),
    };
  });

  nextState.quizzes = (nextState.quizzes || []).map((quiz) => ({
    ...quiz,
    workspaceId: normalizedWorkspaceId,
  }));

  setWorkspaceState(store, normalizedWorkspaceId, nextState);
  writeStore(store);
  return clone(nextState);
}

export function getGroupReviewWorkspace(workspaceId) {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!normalizedWorkspaceId) return null;
  const store = readStore();
  const state = getWorkspaceState(store, normalizedWorkspaceId);
  return state ? clone(state) : null;
}

function updateWorkspace(workspaceId, updater) {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!normalizedWorkspaceId) return null;
  const store = readStore();
  const current = getWorkspaceState(store, normalizedWorkspaceId);
  if (!current) return null;

  const nextState = updater(current, store);
  if (!nextState) return null;
  nextState.updatedAt = nowIso();
  setWorkspaceState(store, normalizedWorkspaceId, nextState);
  writeStore(store);
  return clone(nextState);
}

function appendLog(state, store, action, description, actor) {
  const entry = {
    logId: `mock-log-${nextId(store, 'message')}`,
    action,
    description,
    actorEmail: actor?.email || 'system@quizmate.local',
    actorName: actor?.fullName || 'QuizMate AI',
    logTime: nowIso(),
    source: 'mock',
  };
  state.logs = [entry, ...(state.logs || [])];
}

export function reviewGroupMaterial(workspaceId, materialId, decision, actor = readActiveUser()) {
  return updateWorkspace(workspaceId, (state, store) => {
    const nextState = clone(state);
    const material = nextState.materials.find((item) => Number(item.materialId) === Number(materialId));
    if (!material) return nextState;

    if (decision === 'approve') {
      material.status = 'APPROVED';
      material.moderation = {
        ...material.moderation,
        state: 'APPROVED',
        reviewerName: actor?.fullName || 'Leader',
        reviewedAt: nowIso(),
        suggestion: null,
      };
      appendLog(nextState, store, 'MATERIAL_APPROVED', `Da duyet tai lieu "${material.name}".`, actor);
    } else if (decision === 'reject') {
      material.status = 'REJECT';
      material.moderation = {
        ...material.moderation,
        state: 'REJECT',
        reviewerName: actor?.fullName || 'Leader',
        reviewedAt: nowIso(),
      };
      appendLog(nextState, store, 'MATERIAL_REJECTED', `Da tu choi tai lieu "${material.name}".`, actor);
    } else {
      material.status = 'NEEDS_REVIEW';
      material.moderation = {
        ...material.moderation,
        state: 'NEEDS_REVIEW',
        suggestion: 'Vui long upload lai ban sach hon hoac bo sung nguon tham chieu.',
        reviewerName: actor?.fullName || 'Leader',
        reviewedAt: nowIso(),
      };
      appendLog(nextState, store, 'MATERIAL_REUPLOAD_REQUESTED', `Da yeu cau upload lai tai lieu "${material.name}".`, actor);
    }

    const uploaderPerf = nextState.memberPerformance.find((item) => Number(item.userId) === Number(material.uploaderUserId));
    if (uploaderPerf) {
      if (decision === 'approve') {
        uploaderPerf.uploadsApproved += 1;
      } else if (decision === 'reject') {
        uploaderPerf.uploadsRejected += 1;
      } else {
        uploaderPerf.uploadsWarned += 1;
      }
      uploaderPerf.lastActiveAt = nowIso();
    }

    return nextState;
  });
}

export function updateGroupMaterial(workspaceId, materialId, updates = {}) {
  return updateWorkspace(workspaceId, (state) => {
    const nextState = clone(state);
    const material = nextState.materials.find((item) => Number(item.materialId) === Number(materialId));
    if (!material) return nextState;

    if (typeof updates.name === 'string' && updates.name.trim()) {
      material.name = updates.name.trim();
    }
    if (typeof updates.summary === 'string') {
      material.summary = updates.summary;
    }
    if (typeof updates.excerpt === 'string') {
      material.excerpt = updates.excerpt;
    }
    if (typeof updates.status === 'string' && updates.status.trim()) {
      material.status = updates.status.trim().toUpperCase();
      material.moderation = {
        ...(material.moderation || {}),
        state: material.status,
      };
    }

    return nextState;
  });
}

export function removeGroupMaterial(workspaceId, materialId) {
  return updateWorkspace(workspaceId, (state, store) => {
    const nextState = clone(state);
    const material = nextState.materials.find((item) => Number(item.materialId) === Number(materialId));
    nextState.materials = nextState.materials.filter((item) => Number(item.materialId) !== Number(materialId));

    if (material) {
      appendLog(nextState, store, 'MATERIAL_REMOVED', `Da xoa tai lieu "${material.name}".`, readActiveUser());
    }

    return nextState;
  });
}

function findQuestionRecord(state, quizId, questionId) {
  const quiz = state.quizzes.find((item) => Number(item.quizId) === Number(quizId));
  if (!quiz) return { quiz: null, question: null };

  const question = (quiz.sections || [])
    .flatMap((section) => section.questions || [])
    .find((item) => Number(item.questionId) === Number(questionId));

  return { quiz, question };
}

export function getGroupDiscussionThread(workspaceId, quizId, questionId) {
  const currentUser = readActiveUser();

  return updateWorkspace(workspaceId, (state, store) => {
    const nextState = clone(state);
    let thread = nextState.discussionThreads.find(
      (item) => Number(item.quizId) === Number(quizId) && Number(item.questionId) === Number(questionId),
    );

    if (!thread) {
      const { quiz, question } = findQuestionRecord(nextState, quizId, questionId);
      if (!quiz || !question) return nextState;
      const questionIndex = (quiz.sections || [])
        .flatMap((section) => section.questions || [])
        .findIndex((item) => Number(item.questionId) === Number(questionId));
      thread = buildThread(store, quiz, question, nextState.members, {
        questionNumber: questionIndex + 1,
        unreadCount: 0,
      });
      nextState.discussionThreads.unshift(thread);
      appendLog(nextState, store, 'DISCUSSION_CREATED', `Mo thread thao luan cho cau ${questionIndex + 1} cua "${quiz.title}".`, currentUser);
    }

    return nextState;
  });
}

export function addGroupDiscussionReply(workspaceId, quizId, questionId, body, author = readActiveUser()) {
  const trimmedBody = String(body || '').trim();
  if (!trimmedBody) {
    return getGroupReviewWorkspace(workspaceId);
  }

  return updateWorkspace(workspaceId, (state, store) => {
    const nextState = clone(state);
    let thread = nextState.discussionThreads.find(
      (item) => Number(item.quizId) === Number(quizId) && Number(item.questionId) === Number(questionId),
    );

    if (!thread) {
      return nextState;
    }

    thread.messages.push({
      messageId: nextId(store, 'message'),
      authorUserId: Number(author?.userId || 0),
      authorName: author?.fullName || 'Thanh vien',
      authorRole: author?.role || 'MEMBER',
      createdAt: nowIso(),
      body: trimmedBody,
    });
    thread.lastActivityAt = nowIso();
    thread.unreadCount = Number(thread.unreadCount || 0) + 1;
    thread.isResolved = false;

    const perf = nextState.memberPerformance.find((item) => Number(item.userId) === Number(author?.userId || 0));
    if (perf) {
      perf.discussionCount += 1;
      perf.lastActiveAt = nowIso();
    }

    appendLog(nextState, store, 'DISCUSSION_REPLIED', `${author?.fullName || 'Mot thanh vien'} da phan hoi trong thread cau hoi.`, author);
    return nextState;
  });
}

export function toggleGroupDiscussionResolved(workspaceId, threadId, isResolved, actor = readActiveUser()) {
  return updateWorkspace(workspaceId, (state, store) => {
    const nextState = clone(state);
    const thread = nextState.discussionThreads.find((item) => Number(item.threadId) === Number(threadId));
    if (!thread) return nextState;

    thread.isResolved = Boolean(isResolved);
    thread.lastActivityAt = nowIso();
    appendLog(
      nextState,
      store,
      isResolved ? 'DISCUSSION_RESOLVED' : 'DISCUSSION_REOPENED',
      `${isResolved ? 'Da resolve' : 'Da mo lai'} thread thao luan "${thread.title}".`,
      actor,
    );
    return nextState;
  });
}

export function createGroupReviewQuiz(workspaceId, input, actor = readActiveUser()) {
  return updateWorkspace(workspaceId, (state, store) => {
    const nextState = clone(state);
    const quiz = buildQuizRecord(store, workspaceId, nextState.members, nextState.materials, {
      title: input?.title || 'Quiz moi trong nhom',
      description: input?.description || '',
      quizIntent: input?.quizIntent || 'REVIEW',
      timerMode: input?.timerMode || 'TOTAL',
      questionCount: input?.questionCount || 6,
      durationMinutes: input?.durationMinutes || 12,
      passScore: input?.passScore || 70,
      materialIds: Array.isArray(input?.materialIds) ? input.materialIds : [],
      roadmapId: input?.roadmapId || nextState.roadmap?.roadmapId || null,
      phaseId: input?.phaseId || nextState.roadmap?.phases?.[0]?.phaseId || null,
      knowledgeId: input?.knowledgeId || nextState.roadmap?.phases?.[0]?.knowledges?.[0]?.knowledgeId || null,
    });

    nextState.quizzes.unshift(quiz);
    const perf = nextState.memberPerformance.find((item) => Number(item.userId) === Number(actor?.userId || 0));
    if (perf) {
      perf.quizzesCreated += 1;
      perf.lastActiveAt = nowIso();
    }
    appendLog(nextState, store, 'QUIZ_CREATED', `${actor?.fullName || 'Mot thanh vien'} da tao quiz "${quiz.title}".`, actor);
    return nextState;
  });
}

export function getGroupReviewRoadmap(workspaceId, roadmapId) {
  const state = getGroupReviewWorkspace(workspaceId);
  if (!state) return null;
  if (!roadmapId || Number(state.roadmap?.roadmapId) === Number(roadmapId)) {
    return clone(state.roadmap);
  }
  return null;
}

function mapQuestionAttemptResult(question, answerPayload) {
  const selectedAnswerIds = Array.isArray(answerPayload?.selectedAnswerIds)
    ? answerPayload.selectedAnswerIds.filter((answerId) => answerId != null)
    : [];
  const textAnswer = typeof answerPayload?.textAnswer === 'string' ? answerPayload.textAnswer.trim() : '';
  const correctAnswerIds = (question.answers || [])
    .filter((answer) => answer?.isCorrect)
    .map((answer) => answer.answerId);
  const correctTextAnswers = (question.answers || [])
    .filter((answer) => answer?.isCorrect)
    .map((answer) => String(answer?.content || '').trim())
    .filter(Boolean);
  const isTextQuestion = question.questionTypeId === QUESTION_TYPE_IDS.SHORT_ANSWER || question.questionTypeId === QUESTION_TYPE_IDS.FILL_IN_BLANK;

  const isCorrect = isTextQuestion
    ? correctTextAnswers.map((answer) => answer.toLowerCase()).includes(textAnswer.toLowerCase())
    : correctAnswerIds.length === selectedAnswerIds.length
      && correctAnswerIds.every((answerId) => selectedAnswerIds.includes(answerId));

  return {
    questionId: question.questionId,
    selectedAnswerIds,
    textAnswer: textAnswer || null,
    isCorrect,
    correct: isCorrect,
    correctAnswerIds,
    correctTextAnswers,
    explanation: question.explanation || '',
    gradingStatus: 'GRADED',
  };
}

function findWorkspaceByQuizId(store, quizId) {
  return Object.values(store.workspaces).find((workspace) =>
    workspace?.quizzes?.some((quiz) => Number(quiz.quizId) === Number(quizId)),
  ) || null;
}

function findWorkspaceByAttemptId(store, attemptId) {
  return Object.values(store.workspaces).find((workspace) =>
    workspace?.attempts?.some((attempt) => Number(attempt.attemptId) === Number(attemptId)),
  ) || null;
}

export function findGroupReviewQuiz(quizId) {
  const store = readStore();
  const workspace = findWorkspaceByQuizId(store, quizId);
  if (!workspace) return null;
  const quiz = workspace.quizzes.find((item) => Number(item.quizId) === Number(quizId));
  return quiz ? clone(quiz) : null;
}

export function updateGroupReviewQuiz(quizId, data) {
  const store = readStore();
  const workspace = findWorkspaceByQuizId(store, quizId);
  if (!workspace) return null;

  return updateWorkspace(workspace.workspaceId, (state) => {
    const nextState = clone(state);
    const quiz = nextState.quizzes.find((item) => Number(item.quizId) === Number(quizId));
    if (!quiz) return nextState;
    quiz.status = data?.status || quiz.status;
    quiz.title = data?.title || quiz.title;
    quiz.updatedAt = nowIso();
    return nextState;
  });
}

export function startGroupReviewAttempt(quizId, options = {}) {
  const store = readStore();
  const workspace = findWorkspaceByQuizId(store, quizId);
  if (!workspace) return null;

  return updateWorkspace(workspace.workspaceId, (state, draftStore) => {
    const nextState = clone(state);
    const quiz = nextState.quizzes.find((item) => Number(item.quizId) === Number(quizId));
    if (!quiz) return nextState;

    const currentUser = readActiveUser();
    const existingAttempt = nextState.attempts.find(
      (attempt) =>
        Number(attempt.quizId) === Number(quizId)
        && Number(attempt.userId) === Number(currentUser.userId || 0)
        && attempt.status === 'IN_PROGRESS'
        && Boolean(attempt.isPracticeMode) === Boolean(options?.isPracticeMode),
    );
    if (existingAttempt) {
      return nextState;
    }

    const totalSeconds = quiz.timerMode === 'TOTAL'
      ? Number(quiz.duration || 0)
      : Math.max(60, (quiz.totalQuestion || 1) * 60);
    const startedAt = nowIso();
    const timeoutAt = new Date(Date.now() + totalSeconds * 1000).toISOString();

    nextState.attempts.push({
      attemptId: nextId(draftStore, 'attempt'),
      quizId: quiz.quizId,
      workspaceId: quiz.workspaceId,
      userId: Number(currentUser.userId || 0),
      userName: currentUser.fullName || 'Nguoi dung',
      isPracticeMode: Boolean(options?.isPracticeMode),
      startedAt,
      timeoutAt,
      completedAt: null,
      status: 'IN_PROGRESS',
      savedAnswers: [],
      result: null,
    });

    return nextState;
  });
}

export function findGroupReviewAttempt(attemptId) {
  const store = readStore();
  const workspace = findWorkspaceByAttemptId(store, attemptId);
  if (!workspace) return null;
  const attempt = workspace.attempts.find((item) => Number(item.attemptId) === Number(attemptId));
  return attempt ? clone(attempt) : null;
}

export function saveGroupReviewAttemptAnswers(attemptId, answers) {
  const store = readStore();
  const workspace = findWorkspaceByAttemptId(store, attemptId);
  if (!workspace) return null;

  return updateWorkspace(workspace.workspaceId, (state) => {
    const nextState = clone(state);
    const attempt = nextState.attempts.find((item) => Number(item.attemptId) === Number(attemptId));
    if (!attempt) return nextState;

    const savedByQuestionId = new Map((attempt.savedAnswers || []).map((item) => [Number(item.questionId), item]));
    (answers || []).forEach((answer) => {
      const questionId = Number(answer?.questionId);
      if (!Number.isFinite(questionId)) return;
      savedByQuestionId.set(questionId, {
        questionId,
        selectedAnswerIds: Array.isArray(answer?.selectedAnswerIds) ? answer.selectedAnswerIds.filter((item) => item != null) : [],
        textAnswer: typeof answer?.textAnswer === 'string' ? answer.textAnswer : null,
      });
    });
    attempt.savedAnswers = Array.from(savedByQuestionId.values());
    return nextState;
  });
}

export function submitGroupReviewPracticeQuestion(attemptId, answer) {
  const store = readStore();
  const workspace = findWorkspaceByAttemptId(store, attemptId);
  if (!workspace) return null;

  updateWorkspace(workspace.workspaceId, (state) => {
    const nextState = clone(state);
    const attempt = nextState.attempts.find((item) => Number(item.attemptId) === Number(attemptId));
    if (!attempt) return nextState;

    const snapshot = {
      questionId: Number(answer?.questionId),
      selectedAnswerIds: Array.isArray(answer?.selectedAnswerIds) ? answer.selectedAnswerIds.filter((item) => item != null) : [],
      textAnswer: typeof answer?.textAnswer === 'string' ? answer.textAnswer : null,
    };
    const existingIndex = (attempt.savedAnswers || []).findIndex((item) => Number(item.questionId) === Number(snapshot.questionId));
    if (existingIndex >= 0) {
      attempt.savedAnswers[existingIndex] = snapshot;
    } else {
      attempt.savedAnswers.push(snapshot);
    }
    return nextState;
  });

  const refreshed = findGroupReviewAttempt(attemptId);
  if (!refreshed) return null;
  const quiz = findGroupReviewQuiz(refreshed.quizId);
  const question = (quiz?.sections || [])
    .flatMap((section) => section.questions || [])
    .find((item) => Number(item.questionId) === Number(answer?.questionId));
  if (!question) return null;
  return mapQuestionAttemptResult(question, answer);
}

export function submitGroupReviewAttempt(attemptId, answers) {
  const store = readStore();
  const workspace = findWorkspaceByAttemptId(store, attemptId);
  if (!workspace) return null;

  return updateWorkspace(workspace.workspaceId, (state, draftStore) => {
    const nextState = clone(state);
    const attempt = nextState.attempts.find((item) => Number(item.attemptId) === Number(attemptId));
    if (!attempt) return nextState;
    const quiz = nextState.quizzes.find((item) => Number(item.quizId) === Number(attempt.quizId));
    if (!quiz) return nextState;

    if (Array.isArray(answers) && answers.length > 0) {
      attempt.savedAnswers = answers.map((answer) => ({
        questionId: Number(answer?.questionId),
        selectedAnswerIds: Array.isArray(answer?.selectedAnswerIds) ? answer.selectedAnswerIds.filter((item) => item != null) : [],
        textAnswer: typeof answer?.textAnswer === 'string' ? answer.textAnswer : null,
      }));
    }

    const questionList = (quiz.sections || []).flatMap((section) => section.questions || []);
    const answersByQuestionId = new Map((attempt.savedAnswers || []).map((item) => [Number(item.questionId), item]));
    const questionResults = questionList.map((question) => mapQuestionAttemptResult(question, answersByQuestionId.get(Number(question.questionId))));
    const correctQuestion = questionResults.filter((question) => question.isCorrect).length;
    const totalQuestion = questionResults.length;
    const accuracy = totalQuestion > 0 ? Math.round((correctQuestion / totalQuestion) * 100) : 0;

    attempt.status = 'COMPLETED';
    attempt.completedAt = nowIso();
    attempt.result = {
      attemptId: attempt.attemptId,
      quizId: quiz.quizId,
      workspaceId: quiz.workspaceId,
      totalQuestion,
      correctQuestion,
      passScore: Number(quiz.passScore || 70),
      score: accuracy,
      maxScore: 100,
      passed: accuracy >= Number(quiz.passScore || 70),
      questions: questionResults,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      timeoutAt: attempt.timeoutAt,
      pendingGradingQuestionCount: 0,
    };

    quiz.history = [
      {
        attemptId: attempt.attemptId,
        status: attempt.status,
        score: attempt.result.score,
        passed: attempt.result.passed,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        isPracticeMode: attempt.isPracticeMode,
      },
      ...(quiz.history || []),
    ];
    quiz.updatedAt = nowIso();

    const performance = nextState.memberPerformance.find((item) => Number(item.userId) === Number(attempt.userId));
    if (performance) {
      performance.quizzesCompleted += 1;
      performance.accuracy = Math.round(((performance.accuracy * Math.max(performance.quizzesCompleted - 1, 0)) + accuracy) / Math.max(performance.quizzesCompleted, 1));
      performance.currentStreak += 1;
      performance.lastActiveAt = nowIso();
      performance.scoreTrend = [...(performance.scoreTrend || []).slice(-3), accuracy];
    }

    appendLog(nextState, draftStore, 'QUIZ_SUBMITTED', `${attempt.userName || 'Mot thanh vien'} da nop quiz "${quiz.title}" voi ${accuracy}%.`, {
      fullName: attempt.userName || 'Thanh vien',
      email: 'user@quizmate.local',
    });

    return nextState;
  });
}

export function getGroupReviewAttemptResult(attemptId) {
  const attempt = findGroupReviewAttempt(attemptId);
  if (!attempt || !attempt.result) return null;
  return clone(attempt.result);
}

export function getGroupReviewAttemptAssessment() {
  return {
    status: 'NOT_AVAILABLE',
    summary: null,
  };
}

export function getGroupReviewQuizHistory(quizId) {
  const quiz = findGroupReviewQuiz(quizId);
  if (!quiz) return [];
  return clone(quiz.history || []);
}

