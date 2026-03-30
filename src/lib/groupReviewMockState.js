const STORAGE_KEY = 'group_review_workspace_store_v1';
const STORE_VERSION = 1;

const QUESTION_TYPE_IDS = {
  SINGLE_CHOICE: 1,
  MULTIPLE_CHOICE: 2,
  SHORT_ANSWER: 3,
  TRUE_FALSE: 4,
  FILL_IN_BLANK: 5,
};

const DEFAULT_ID_SEEDS = {
  roadmap: 810000,
  phase: 820000,
  knowledge: 830000,
  quiz: 900000,
  attempt: 950000,
  thread: 980000,
  message: 990000,
};

function hasWindow() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function readStore() {
  if (!hasWindow()) {
    return {
      version: STORE_VERSION,
      nextIds: { ...DEFAULT_ID_SEEDS },
      workspaces: {},
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        version: STORE_VERSION,
        nextIds: { ...DEFAULT_ID_SEEDS },
        workspaces: {},
      };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid group review store');
    }

    return {
      version: STORE_VERSION,
      nextIds: {
        ...DEFAULT_ID_SEEDS,
        ...(parsed.nextIds || {}),
      },
      workspaces: parsed.workspaces && typeof parsed.workspaces === 'object'
        ? parsed.workspaces
        : {},
    };
  } catch (error) {
    console.error('[groupReviewMockState] Failed to read store:', error);
    return {
      version: STORE_VERSION,
      nextIds: { ...DEFAULT_ID_SEEDS },
      workspaces: {},
    };
  }
}

function writeStore(store) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function nextId(store, key) {
  const current = Number(store.nextIds?.[key] || DEFAULT_ID_SEEDS[key] || Date.now());
  store.nextIds[key] = current + 1;
  return current;
}

function normalizeWorkspaceId(workspaceId) {
  const normalized = Number(workspaceId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function readActiveUser() {
  if (!hasWindow()) {
    return {
      userId: 0,
      fullName: 'QuizMate User',
      email: 'user@quizmate.local',
      role: 'LEADER',
    };
  }

  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) {
      return {
        userId: 0,
        fullName: 'QuizMate User',
        email: 'user@quizmate.local',
        role: 'LEADER',
      };
    }

    const parsed = JSON.parse(raw);
    const userId = Number(parsed?.id ?? parsed?.userId ?? parsed?.userID);
    return {
      userId: Number.isFinite(userId) ? userId : 0,
      fullName: parsed?.fullName || parsed?.username || parsed?.email || 'QuizMate User',
      email: parsed?.email || 'user@quizmate.local',
      role: String(parsed?.role || 'LEADER').toUpperCase(),
    };
  } catch (error) {
    console.error('[groupReviewMockState] Failed to read active user:', error);
    return {
      userId: 0,
      fullName: 'QuizMate User',
      email: 'user@quizmate.local',
      role: 'LEADER',
    };
  }
}

function formatPersonName(person, fallback = 'Thanh vien') {
  return person?.fullName || person?.username || person?.email || fallback;
}

function resolveRoleTone(role) {
  if (role === 'LEADER') return 'LEADER';
  if (role === 'CONTRIBUTOR') return 'CONTRIBUTOR';
  return 'MEMBER';
}

function buildFallbackMembers(currentUser) {
  return [
    {
      userId: Number(currentUser?.userId || 1),
      fullName: currentUser?.fullName || 'Truong nhom',
      email: currentUser?.email || 'leader@quizmate.local',
      role: 'LEADER',
      canUpload: true,
      isCurrentUser: true,
      joinedAt: nowIso(),
    },
    {
      userId: Number(currentUser?.userId || 1) + 1,
      fullName: 'Nguyen Mai Anh',
      email: 'mai.anh@quizmate.local',
      role: 'CONTRIBUTOR',
      canUpload: true,
      isCurrentUser: false,
      joinedAt: nowIso(),
    },
    {
      userId: Number(currentUser?.userId || 1) + 2,
      fullName: 'Tran Minh Duc',
      email: 'minh.duc@quizmate.local',
      role: 'MEMBER',
      canUpload: false,
      isCurrentUser: false,
      joinedAt: nowIso(),
    },
  ];
}

function buildLiveMember(member, index, currentUser) {
  const normalizedUserId = Number(member?.userId ?? member?.id ?? index + 1);
  const currentUserId = Number(currentUser?.userId || 0);
  const isCurrentUser = Boolean(member?.isCurrentUser) || (normalizedUserId > 0 && normalizedUserId === currentUserId);

  return {
    userId: normalizedUserId,
    fullName: formatPersonName(member, `Thanh vien ${index + 1}`),
    email: member?.email || `member${index + 1}@quizmate.local`,
    role: resolveRoleTone(String(member?.role || member?.memberRole || 'MEMBER').toUpperCase()),
    canUpload: Boolean(member?.canUpload),
    isCurrentUser,
    avatar: member?.avatar || null,
    joinedAt: member?.joinedAt || member?.joinedDate || member?.createdAt || nowIso(),
    source: 'live',
  };
}

function buildLiveMaterial(material, index, members) {
  const normalizedId = Number(material?.id ?? material?.materialId);
  const uploader = members[index % Math.max(members.length, 1)] || members[0] || null;
  const rawStatus = String(material?.status || 'APPROVED').toUpperCase();
  const moderationState = rawStatus === 'WARN' || rawStatus === 'WARNED'
    ? 'WARN'
    : rawStatus === 'REJECT' || rawStatus === 'REJECTED'
      ? 'REJECT'
      : rawStatus === 'PROCESSING' || rawStatus === 'UPLOADING'
        ? 'PROCESSING'
        : 'APPROVED';

  const name = material?.name || material?.title || `Tai lieu ${index + 1}`;
  const excerpt = `Ban xem truoc tu "${name}". Noi dung duoc dung de review luong moderation, quiz generation va roadmap mapping trong group workspace.`;
  const summary = `Tai lieu nay tap trung vao ${name.toLowerCase()} va duoc nhom dung de tao quiz, roadmap va thao luan theo cau hoi.`;

  return {
    materialId: normalizedId > 0 ? normalizedId : 1000 + index,
    id: normalizedId > 0 ? normalizedId : 1000 + index,
    name,
    type: material?.type || material?.materialType || 'application/pdf',
    status: moderationState,
    uploadedAt: material?.uploadedAt || material?.createdAt || nowIso(),
    uploaderUserId: uploader?.userId || 0,
    uploaderName: uploader?.fullName || 'Nguoi dung',
    uploaderRole: uploader?.role || 'MEMBER',
    source: 'live',
    excerpt,
    summary,
    moderation: {
      state: moderationState,
      reason: moderationState === 'WARN'
        ? 'Noi dung co vai doan can kiem tra lai truoc khi phan phoi cho ca nhom.'
        : moderationState === 'REJECT'
          ? 'Tai lieu bi danh dau vi khong khop muc tieu hoc tap hoac co rui ro noi dung.'
          : moderationState === 'PROCESSING'
            ? 'Tai lieu dang duoc he thong phan tich.'
            : 'Da san sang cho nhom su dung.',
      suggestion: moderationState === 'WARN'
        ? 'Yeu cau uploader chinh lai file hoac cat bot phan khong lien quan.'
        : moderationState === 'REJECT'
          ? 'Yeu cau re-upload bang phien ban phu hop hon.'
          : null,
      reviewerName: moderationState === 'APPROVED' ? 'QuizMate AI' : null,
      reviewedAt: moderationState === 'APPROVED' ? nowIso() : null,
    },
    relatedQuizIds: [],
    relatedRoadmapNodeIds: [],
  };
}

function createMockShowcaseMaterials(store, members) {
  const leader = members.find((member) => member.role === 'LEADER') || members[0];
  const contributor = members.find((member) => member.role === 'CONTRIBUTOR') || members[1] || leader;

  return [
    {
      materialId: nextId(store, 'knowledge'),
      id: null,
      name: 'Bo note tong hop chuong nen tang',
      type: 'application/pdf',
      status: 'WARN',
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      uploaderUserId: contributor?.userId || 0,
      uploaderName: contributor?.fullName || 'Contributor',
      uploaderRole: contributor?.role || 'CONTRIBUTOR',
      source: 'mock',
      excerpt: 'Tai lieu tong hop khai niem nen tang, co vai doan trung lap va can leader xac nhan truoc khi dua vao roadmap chinh.',
      summary: 'Tong hop cac khai niem quan trong de nhom dung lam dau vao tao quiz. Co mot vai doan thieu nguon dan.',
      moderation: {
        state: 'WARN',
        reason: 'Thieu nguon tham chieu o mot so phan va co noi dung chua bam sat roadmap hien tai.',
        suggestion: 'Xem lai trich dan, cap nhat phien ban moi roi yeu cau duyet lai.',
        reviewerName: 'QuizMate AI',
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      },
      relatedQuizIds: [],
      relatedRoadmapNodeIds: [],
    },
    {
      materialId: nextId(store, 'knowledge'),
      id: null,
      name: 'Tai lieu thuc hanh cu chua con phu hop',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      status: 'REJECT',
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
      uploaderUserId: leader?.userId || 0,
      uploaderName: leader?.fullName || 'Leader',
      uploaderRole: leader?.role || 'LEADER',
      source: 'mock',
      excerpt: 'Phien ban cu cua tai lieu thuc hanh, co vi du loi thoi va khong khop domain hien tai cua nhom.',
      summary: 'Dung de demo queue moderation bi tu choi va flow yeu cau upload lai.',
      moderation: {
        state: 'REJECT',
        reason: 'Noi dung loi thoi va khong con khop voi muc tieu hoc tap trong workspace.',
        suggestion: 'Thay bang phien ban cap nhat hoac upload tai lieu thay the.',
        reviewerName: 'QuizMate AI',
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      },
      relatedQuizIds: [],
      relatedRoadmapNodeIds: [],
    },
  ];
}

function buildChoiceQuestion(questionId, index, focusLabel) {
  const correctIndex = index % 4;
  const answers = Array.from({ length: 4 }).map((_, answerIndex) => ({
    answerId: questionId * 10 + answerIndex + 1,
    content: answerIndex === correctIndex
      ? `Dap an dung cho ${focusLabel} ${index + 1}`
      : `Nhieu ${answerIndex + 1} cua ${focusLabel} ${index + 1}`,
    isCorrect: answerIndex === correctIndex,
  }));

  return {
    questionId,
    questionTypeId: QUESTION_TYPE_IDS.SINGLE_CHOICE,
    duration: 60,
    difficulty: index % 3 === 0 ? 'EASY' : index % 3 === 1 ? 'MEDIUM' : 'HARD',
    content: `Cau ${index + 1}: khai niem nao dung nhat ve ${focusLabel.toLowerCase()}?`,
    explanation: `Giai thich nhanh cho cau ${index + 1} trong quiz "${focusLabel}".`,
    answers,
  };
}

function buildShortAnswerQuestion(questionId, index, focusLabel) {
  return {
    questionId,
    questionTypeId: QUESTION_TYPE_IDS.SHORT_ANSWER,
    duration: 90,
    difficulty: 'MEDIUM',
    content: `Cau ${index + 1}: hay mo ta ngan mot luu y khi ap dung ${focusLabel.toLowerCase()}.`,
    explanation: `Cau tra loi nen neu duoc mot luu y thuc te lien quan den ${focusLabel.toLowerCase()}.`,
    answers: [
      {
        answerId: questionId * 10 + 1,
        content: `Luu y chinh cua ${focusLabel.toLowerCase()}`,
        isCorrect: true,
      },
    ],
  };
}

function buildTrueFalseQuestion(questionId, index, focusLabel) {
  const truthy = index % 2 === 0;
  return {
    questionId,
    questionTypeId: QUESTION_TYPE_IDS.TRUE_FALSE,
    duration: 45,
    difficulty: 'EASY',
    content: `Cau ${index + 1}: phat bieu ve ${focusLabel.toLowerCase()} nay la ${truthy ? 'dung' : 'sai'}?`,
    explanation: 'Dung de kiem tra hieu nhanh truoc khi vao thao luan sau hon.',
    answers: [
      {
        answerId: questionId * 10 + 1,
        content: 'True',
        isCorrect: truthy,
      },
      {
        answerId: questionId * 10 + 2,
        content: 'False',
        isCorrect: !truthy,
      },
    ],
  };
}

function buildMockQuestions(quizId, questionCount, focusLabel) {
  return Array.from({ length: questionCount }).map((_, index) => {
    const questionId = quizId * 100 + index + 1;
    if (index % 5 === 4) {
      return buildShortAnswerQuestion(questionId, index, focusLabel);
    }
    if (index % 5 === 3) {
      return buildTrueFalseQuestion(questionId, index, focusLabel);
    }
    return buildChoiceQuestion(questionId, index, focusLabel);
  });
}

function buildQuizSections(quizId, questionCount, focusLabel) {
  const questions = buildMockQuestions(quizId, questionCount, focusLabel);
  return [
    {
      sectionId: quizId * 10 + 1,
      sectionType: 'ROOT',
      content: focusLabel,
      questions,
    },
  ];
}

function buildQuizRecord(store, workspaceId, members, materials, options = {}) {
  const owner = members.find((member) => member.role !== 'MEMBER') || members[0];
  const quizId = options.quizId || nextId(store, 'quiz');
  const materialIds = Array.isArray(options.materialIds) && options.materialIds.length > 0
    ? options.materialIds
    : materials.slice(0, 2).map((material) => material.materialId);
  const focusLabel = options.title || 'Quiz nhom';
  const questionCount = Math.max(5, Number(options.questionCount) || 8);
  const timerMode = options.timerMode === 'PER_QUESTION' ? 'PER_QUESTION' : 'TOTAL';
  const sections = buildQuizSections(quizId, questionCount, focusLabel);

  return {
    quizId,
    workspaceId,
    title: focusLabel,
    description: options.description || `Quiz dung de review kien thuc va flow thao luan trong nhom cho chu de "${focusLabel}".`,
    status: options.status || 'ACTIVE',
    quizIntent: options.quizIntent || 'REVIEW',
    timerMode,
    duration: timerMode === 'TOTAL'
      ? Math.max(8, Number(options.durationMinutes) || Math.ceil(questionCount * 1.5)) * 60
      : Math.max(1, Number(options.durationMinutes) || 1),
    passScore: Math.max(50, Number(options.passScore) || 70),
    maxAttempt: options.maxAttempt ?? 3,
    maxScore: questionCount * 10,
    totalQuestion: questionCount,
    totalQuestions: questionCount,
    questionCount,
    materialIds,
    ownerUserId: owner?.userId || 0,
    ownerName: owner?.fullName || 'Nguoi tao',
    createdAt: options.createdAt || nowIso(),
    updatedAt: options.updatedAt || nowIso(),
    roadmapId: options.roadmapId || null,
    phaseId: options.phaseId || null,
    knowledgeId: options.knowledgeId || null,
    createVia: 'MOCK',
    sections,
    history: Array.isArray(options.history) ? options.history : [],
  };
}

function buildRoadmap(store, workspaceId, members, quizzes, materials) {
  const roadmapId = nextId(store, 'roadmap');
  const phases = [
    {
      phaseId: nextId(store, 'phase'),
      title: 'Khoi dong va dong bo nen tang',
      progress: 72,
      ownerUserId: members[0]?.userId || 0,
      blocker: null,
      relatedQuizIds: quizzes.slice(0, 1).map((quiz) => quiz.quizId),
      relatedMaterialIds: materials.slice(0, 2).map((material) => material.materialId),
      knowledges: [
        {
          knowledgeId: nextId(store, 'knowledge'),
          title: 'Khung khai niem chung',
          progress: 78,
          ownerUserId: members[0]?.userId || 0,
          relatedQuizIds: quizzes.slice(0, 1).map((quiz) => quiz.quizId),
          relatedMaterialIds: materials.slice(0, 1).map((material) => material.materialId),
        },
        {
          knowledgeId: nextId(store, 'knowledge'),
          title: 'Checklist khi review tai lieu',
          progress: 64,
          ownerUserId: members[1]?.userId || members[0]?.userId || 0,
          relatedQuizIds: quizzes.slice(1, 2).map((quiz) => quiz.quizId),
          relatedMaterialIds: materials.slice(1, 2).map((material) => material.materialId),
        },
      ],
    },
    {
      phaseId: nextId(store, 'phase'),
      title: 'Luyen quiz va discussion',
      progress: 48,
      ownerUserId: members[1]?.userId || members[0]?.userId || 0,
      blocker: 'Can hoan tat duyet 1 tai lieu warning truoc khi publish bo quiz tiep theo.',
      relatedQuizIds: quizzes.slice(0, 2).map((quiz) => quiz.quizId),
      relatedMaterialIds: materials.slice(0, 3).map((material) => material.materialId),
      knowledges: [
        {
          knowledgeId: nextId(store, 'knowledge'),
          title: 'Review dap an va giai thich',
          progress: 52,
          ownerUserId: members[1]?.userId || members[0]?.userId || 0,
          relatedQuizIds: quizzes.slice(0, 2).map((quiz) => quiz.quizId),
          relatedMaterialIds: materials.slice(0, 2).map((material) => material.materialId),
        },
        {
          knowledgeId: nextId(store, 'knowledge'),
          title: 'Discussion theo cau hoi',
          progress: 36,
          ownerUserId: members[2]?.userId || members[0]?.userId || 0,
          relatedQuizIds: quizzes.slice(1, 3).map((quiz) => quiz.quizId),
          relatedMaterialIds: materials.slice(1, 3).map((material) => material.materialId),
        },
      ],
    },
    {
      phaseId: nextId(store, 'phase'),
      title: 'Danh gia hieu suat va toi uu',
      progress: 31,
      ownerUserId: members[0]?.userId || 0,
      blocker: 'Chua du attempts de phan tich xu huong cho toan nhom.',
      relatedQuizIds: quizzes.slice(2).map((quiz) => quiz.quizId),
      relatedMaterialIds: materials.slice(0, 2).map((material) => material.materialId),
      knowledges: [
        {
          knowledgeId: nextId(store, 'knowledge'),
          title: 'Doc dashboard theo member',
          progress: 28,
          ownerUserId: members[0]?.userId || 0,
          relatedQuizIds: quizzes.slice(2).map((quiz) => quiz.quizId),
          relatedMaterialIds: materials.slice(0, 2).map((material) => material.materialId),
        },
      ],
    },
  ];

  return {
    roadmapId,
    workspaceId,
    title: `Roadmap nhom #${workspaceId}`,
    description: 'Lo trinh mock-first de review toan bo luong tai lieu, quiz, discussion va performance trong group workspace.',
    phases,
    stats: {
      phaseCount: phases.length,
      knowledgeCount: phases.reduce((sum, phase) => sum + phase.knowledges.length, 0),
      quizCount: quizzes.length,
      materialCount: materials.length,
    },
  };
}

function buildMemberPerformance(members) {
  return members.map((member, index) => ({
    userId: member.userId,
    fullName: member.fullName,
    role: member.role,
    accuracy: Math.max(54, 88 - index * 7),
    roadmapProgress: Math.max(28, 86 - index * 11),
    quizzesCompleted: Math.max(1, 6 - index),
    quizzesCreated: member.role === 'LEADER' ? 3 : member.role === 'CONTRIBUTOR' ? 2 : 0,
    uploadsApproved: member.canUpload ? Math.max(1, 4 - index) : 0,
    uploadsWarned: index === 1 ? 1 : 0,
    uploadsRejected: index === 2 ? 1 : 0,
    discussionCount: 4 + index * 2,
    currentStreak: Math.max(1, 6 - index),
    activeDays: 8 - index,
    scoreTrend: [62 + index * 3, 68 + index * 2, 74 + index, 79 - index],
    recentFocus: index === 0 ? 'Dieu phoi moderation va quiz' : index === 1 ? 'Soan quiz va review tai lieu' : 'Lam quiz va theo doi roadmap',
    lastActiveAt: new Date(Date.now() - index * 1000 * 60 * 60 * 6).toISOString(),
  }));
}

function buildThread(store, quiz, question, members, options = {}) {
  const leader = members.find((member) => member.role === 'LEADER') || members[0];
  const contributor = members.find((member) => member.role === 'CONTRIBUTOR') || members[1] || leader;
  const threadId = nextId(store, 'thread');
  const messageOneId = nextId(store, 'message');
  const messageTwoId = nextId(store, 'message');
  const sampleAnswer = question?.answers?.find((answer) => answer?.isCorrect)?.content || 'Dap an mau cho cau hoi nay.';

  return {
    threadId,
    quizId: quiz.quizId,
    questionId: question.questionId,
    questionNumber: options.questionNumber || 1,
    title: `Thao luan cau ${options.questionNumber || 1}`,
    sampleAnswer,
    isResolved: Boolean(options.isResolved),
    unreadCount: options.unreadCount ?? 2,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    messages: [
      {
        messageId: messageOneId,
        authorUserId: leader?.userId || 0,
        authorName: leader?.fullName || 'Leader',
        authorRole: leader?.role || 'LEADER',
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        body: `Theo minh cau nay nen bam vao dap an "${sampleAnswer}" vi day la diem nhom dang hay nham.`,
      },
      {
        messageId: messageTwoId,
        authorUserId: contributor?.userId || 0,
        authorName: contributor?.fullName || 'Contributor',
        authorRole: contributor?.role || 'CONTRIBUTOR',
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        body: 'Minh da them giai thich ngan de member de review lai sau khi lam quiz.',
      },
    ],
  };
}

function buildLogs(currentUser, groupName, members, materials) {
  const leader = members.find((member) => member.role === 'LEADER') || members[0];
  const contributor = members.find((member) => member.role === 'CONTRIBUTOR') || members[1] || leader;

  return [
    {
      logId: `mock-log-created-${groupName || 'group'}`,
      action: 'GROUP_CREATED',
      description: `Khoi tao bang review UI cho nhom "${groupName || 'Nhom hoc tap'}".`,
      actorEmail: currentUser?.email || leader?.email || 'system@quizmate.local',
      actorName: currentUser?.fullName || leader?.fullName || 'System',
      logTime: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      source: 'mock',
    },
    {
      logId: `mock-log-upload-${groupName || 'group'}`,
      action: 'MATERIAL_UPLOADED',
      description: `${contributor?.fullName || 'Contributor'} da day tai lieu moi vao workspace de chuan bi tao quiz.`,
      actorEmail: contributor?.email || 'contributor@quizmate.local',
      actorName: contributor?.fullName || 'Contributor',
      logTime: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      source: 'mock',
    },
    {
      logId: `mock-log-warning-${groupName || 'group'}`,
      action: 'MATERIAL_WARNING',
      description: `Co ${materials.filter((material) => material.moderation?.state === 'WARN').length || 1} tai lieu dang cho leader review.`,
      actorEmail: 'system@quizmate.local',
      actorName: 'QuizMate AI',
      logTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      source: 'mock',
    },
  ];
}

function mergeMembers(existingMembers, liveMembers) {
  const existingByUserId = new Map((existingMembers || []).map((member) => [Number(member.userId), member]));
  return liveMembers.map((member) => {
    const previous = existingByUserId.get(Number(member.userId));
    return {
      ...(previous || {}),
      ...member,
      role: resolveRoleTone(member.role),
    };
  });
}

function mergeMaterials(existingMaterials, liveMaterials) {
  const existingLiveById = new Map(
    (existingMaterials || [])
      .filter((material) => material.source === 'live')
      .map((material) => [Number(material.materialId), material]),
  );
  const mockMaterials = (existingMaterials || []).filter((material) => material.source === 'mock');

  return [
    ...liveMaterials.map((material) => {
      const previous = existingLiveById.get(Number(material.materialId));
      return {
        ...(previous || {}),
        ...material,
        moderation: {
          ...(previous?.moderation || {}),
          ...(material.moderation || {}),
          state: material?.moderation?.state || previous?.moderation?.state || material.status || 'APPROVED',
        },
      };
    }),
    ...mockMaterials,
  ];
}

function ensureShowcaseMaterials(store, state) {
  const hasFlagged = state.materials.some((material) => ['WARN', 'REJECT', 'NEEDS_REVIEW'].includes(String(material?.moderation?.state || material?.status || '').toUpperCase()));
  if (hasFlagged) return state.materials;
  return [...state.materials, ...createMockShowcaseMaterials(store, state.members)];
}

function buildInitialWorkspaceState(store, workspaceId, payload = {}) {
  const currentUser = payload.currentUser || readActiveUser();
  const liveMembers = Array.isArray(payload.members) && payload.members.length > 0
    ? payload.members.map((member, index) => buildLiveMember(member, index, currentUser))
    : buildFallbackMembers(currentUser);
  const liveMaterials = Array.isArray(payload.materials)
    ? payload.materials.map((material, index) => buildLiveMaterial(material, index, liveMembers))
    : [];
  const groupName = payload.group?.groupName || payload.group?.displayTitle || payload.group?.name || `Nhom ${workspaceId}`;
  const quizzes = [
    buildQuizRecord(store, workspaceId, liveMembers, liveMaterials, {
      title: 'Quiz nen tang chung cua nhom',
      quizIntent: 'PRE_LEARNING',
      questionCount: 6,
      durationMinutes: 12,
      passScore: 65,
    }),
    buildQuizRecord(store, workspaceId, liveMembers, liveMaterials, {
      title: 'Quiz review tai lieu va moderation',
      quizIntent: 'REVIEW',
      questionCount: 8,
      durationMinutes: 16,
      passScore: 70,
    }),
    buildQuizRecord(store, workspaceId, liveMembers, liveMaterials, {
      title: 'Checkpoint theo roadmap',
      quizIntent: 'POST_LEARNING',
      questionCount: 7,
      timerMode: 'PER_QUESTION',
      durationMinutes: 1,
      passScore: 72,
    }),
  ];

  const seededMaterials = ensureShowcaseMaterials(store, {
    workspaceId,
    materials: liveMaterials,
    members: liveMembers,
  });
  const roadmap = buildRoadmap(store, workspaceId, liveMembers, quizzes, seededMaterials);
  quizzes.forEach((quiz, index) => {
    quiz.roadmapId = roadmap.roadmapId;
    quiz.phaseId = roadmap.phases[index % roadmap.phases.length]?.phaseId || null;
    quiz.knowledgeId = roadmap.phases[index % roadmap.phases.length]?.knowledges?.[0]?.knowledgeId || null;
  });
  const discussionThreads = [
    buildThread(store, quizzes[0], quizzes[0].sections[0].questions[0], liveMembers, { questionNumber: 1 }),
    buildThread(store, quizzes[1], quizzes[1].sections[0].questions[1], liveMembers, { questionNumber: 2 }),
    buildThread(store, quizzes[2], quizzes[2].sections[0].questions[2], liveMembers, { questionNumber: 3, isResolved: true, unreadCount: 0 }),
  ];
  const memberPerformance = buildMemberPerformance(liveMembers);
  const liveLogs = Array.isArray(payload.logs) ? payload.logs.map((log, index) => ({
    logId: log?.logId || `live-log-${workspaceId}-${index}`,
    action: log?.action || 'GROUP_ACTIVITY',
    description: log?.description || 'Hoat dong nhom',
    actorEmail: log?.actorEmail || log?.actorName || 'system@quizmate.local',
    actorName: log?.actorName || 'System',
    logTime: log?.logTime || nowIso(),
    source: 'live',
  })) : [];

  return {
    workspaceId,
    group: {
      groupName,
      description: payload.group?.description || payload.group?.groupLearningGoal || 'Khong gian review UI cho hoc nhom.',
      memberRole: payload.group?.memberRole || currentUser?.role || 'LEADER',
    },
    members: liveMembers,
    materials: seededMaterials,
    quizzes,
    attempts: [],
    roadmap,
    discussionThreads,
    memberPerformance,
    logs: [...liveLogs, ...buildLogs(currentUser, groupName, liveMembers, seededMaterials)],
    updatedAt: nowIso(),
  };
}

function mergeLiveLogs(existingLogs, liveLogs) {
  const mockLogs = (existingLogs || []).filter((log) => log.source === 'mock');
  const normalizedLive = (liveLogs || []).map((log, index) => ({
    logId: log?.logId || `live-log-${index}-${log?.action || 'activity'}`,
    action: log?.action || 'GROUP_ACTIVITY',
    description: log?.description || 'Hoat dong nhom',
    actorEmail: log?.actorEmail || log?.actorName || 'system@quizmate.local',
    actorName: log?.actorName || 'System',
    logTime: log?.logTime || nowIso(),
    source: 'live',
  }));
  return [...normalizedLive, ...mockLogs].sort((left, right) => new Date(right.logTime).getTime() - new Date(left.logTime).getTime());
}

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
