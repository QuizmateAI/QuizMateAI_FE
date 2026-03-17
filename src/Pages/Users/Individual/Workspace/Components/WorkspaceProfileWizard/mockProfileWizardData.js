
export const PURPOSE_OPTIONS = ['STUDY_NEW', 'REVIEW', 'MOCK_TEST'];

export const ADAPTATION_MODE_OPTIONS = [
  { value: 'FLEXIBLE', accent: 'from-emerald-500 to-teal-500' },
  { value: 'BALANCED', accent: 'from-sky-500 to-blue-600' },
];

export const ROADMAP_SPEED_OPTIONS = [
  { value: 'SLOW', accent: 'bg-emerald-500/15 text-emerald-300' },
  { value: 'STANDARD', accent: 'bg-sky-500/15 text-sky-300' },
  { value: 'FAST', accent: 'bg-amber-500/15 text-amber-300' },
];

export const TEMPLATE_FORMAT_OPTIONS = ['FULL_EXAM', 'SECTION_BASED', 'PRACTICE_SET'];

export const PUBLIC_EXAMS = [
  {
    id: 'ielts',
    name: 'IELTS Academic',
    alias: ['ielts', 'academic'],
    domain: 'IELTS',
    scoreScale: 'Band 0 - 9',
    scoreSuggestions: ['5.5', '6.5', '7.0', '7.5', '8.0'],
    summary: 'Bài thi 4 kỹ năng với trọng tâm học thuật.',
  },
  {
    id: 'toeic',
    name: 'TOEIC',
    alias: ['toeic'],
    domain: 'TOEIC',
    scoreScale: 'Điểm / 990',
    scoreSuggestions: ['550', '650', '750', '850', '900'],
    summary: 'Đề thi nghe đọc phổ biến trong môi trường doanh nghiệp.',
  },
  {
    id: 'jlpt',
    name: 'JLPT',
    alias: ['jlpt', 'n5', 'n4', 'n3', 'n2', 'n1'],
    domain: 'Japanese',
    scoreScale: 'Cấp độ N5 - N1',
    scoreSuggestions: ['N4', 'N3', 'N2', 'N1'],
    summary: 'Kỳ thi năng lực tiếng Nhật theo cấp độ.',
  },
  {
    id: 'topik',
    name: 'TOPIK',
    alias: ['topik'],
    domain: 'Korean',
    scoreScale: 'Level 1 - 6',
    scoreSuggestions: ['Level 2', 'Level 3', 'Level 4', 'Level 5'],
    summary: 'Kỳ thi năng lực tiếng Hàn dành cho học tập và làm việc.',
  },
  {
    id: 'hsk',
    name: 'HSK',
    alias: ['hsk'],
    domain: 'Chinese',
    scoreScale: 'Level 1 - 9',
    scoreSuggestions: ['Level 3', 'Level 4', 'Level 5', 'Level 6'],
    summary: 'Kỳ thi năng lực tiếng Trung với lộ trình từ cơ bản đến nâng cao.',
  },
  {
    id: 'sat',
    name: 'SAT',
    alias: ['sat'],
    domain: 'Mathematics',
    scoreScale: 'Điểm / 1600',
    scoreSuggestions: ['1100', '1250', '1400', '1500'],
    summary: 'Bài thi chuẩn hóa cho tuyển sinh đại học.',
  },
];

function extractExamSignal(values) {
  return normalizeKeyword(
    [
      values?.knowledgeInput,
      values?.inferredDomain,
      values?.currentLevel,
      values?.mockExamName,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function detectJlptLevel(values) {
  const signal = extractExamSignal(values);
  return ['n1', 'n2', 'n3', 'n4', 'n5'].find((level) => signal.includes(level)) || 'n3';
}

function detectHskLevel(values) {
  const signal = extractExamSignal(values);
  const directMatch = signal.match(/\bhsk\s*([1-6])\b/);
  if (directMatch) return Number(directMatch[1]);

  const levelMatch = signal.match(/\blevel\s*([1-6])\b/);
  if (levelMatch) return Number(levelMatch[1]);

  return 4;
}

function detectTopikLevel(values) {
  const signal = extractExamSignal(values);
  const levelMatch = signal.match(/\blevel\s*([1-6])\b/);
  if (levelMatch) return Number(levelMatch[1]);
  return signal.includes('topik ii') ? 4 : 3;
}

function createPublicSection(name, detail, questionLabel, durationLabel, supported = true, supportReason = '') {
  return {
    name,
    detail,
    questionLabel,
    durationLabel,
    supported,
    supportReason,
  };
}

function buildJlptPreview(values) {
  const level = detectJlptLevel(values).toUpperCase();
  const levelConfig = {
    N1: {
      supportedDuration: 110,
      totalDurationLabel: '165 phút',
      scoring: 'Tổng điểm scaled 0-180, cần đạt ngưỡng từng phần.',
    },
    N2: {
      supportedDuration: 105,
      totalDurationLabel: '155 phút',
      scoring: 'Tổng điểm scaled 0-180, cần đạt ngưỡng từng phần.',
    },
    N3: {
      supportedDuration: 100,
      totalDurationLabel: '140 phút',
      scoring: 'Tổng điểm scaled 0-180, cần đạt ngưỡng từng phần.',
    },
    N4: {
      supportedDuration: 80,
      totalDurationLabel: '115 phút',
      scoring: 'Tổng điểm scaled 0-180, cần đạt ngưỡng từng phần.',
    },
    N5: {
      supportedDuration: 60,
      totalDurationLabel: '90 phút',
      scoring: 'Tổng điểm scaled 0-180, cần đạt ngưỡng từng phần.',
    },
  }[level];

  return {
    kind: 'public',
    title: `JLPT ${level} - template công khai`,
    summary: `Hiển thị theo bố cục công khai của ${level} để bạn hình dung ngay cấu trúc bài thi.`,
    metadata: [
      { labelKey: 'duration', value: levelConfig.totalDurationLabel },
      { labelKey: 'questions', value: 'Câu hỏi trắc nghiệm theo từng section JLPT' },
      { labelKey: 'scoring', value: levelConfig.scoring },
      { labelKey: 'support', value: `Quizmate AI sẽ ưu tiên phần Language Knowledge + Reading của ${level}` },
    ],
    sections: [
      createPublicSection(
        'Language Knowledge + Reading',
        `Mô phỏng nhóm câu hỏi từ vựng, ngữ pháp và đọc hiểu của ${level}.`,
        'Khoảng 60 câu trắc nghiệm',
        `${levelConfig.supportedDuration} phút`,
        true
      ),
      createPublicSection(
        'Listening',
        `Giúp bạn thấy rõ đây là phần nghe của đề công khai ${level}.`,
        'Audio tasks',
        level === 'N1' ? '55 phút' : level === 'N2' ? '50 phút' : level === 'N3' ? '40 phút' : level === 'N4' ? '35 phút' : '30 phút',
        false,
        'Quizmate AI chưa hỗ trợ listening.'
      ),
    ],
    notes: [
      `Template AI sinh ra sẽ chỉ tập trung vào phần trắc nghiệm không cần audio của ${level}.`,
      'Bố cục công khai vẫn được hiển thị đầy đủ để bạn đối chiếu với kỳ thi thật.',
    ],
    defaults: {
      templateFormat: 'FULL_EXAM',
      templateDurationMinutes: levelConfig.supportedDuration,
      templateQuestionCount: 60,
    },
  };
}

function buildIeltsPreview() {
  return {
    kind: 'public',
    title: 'IELTS Academic - template công khai',
    summary: 'Hiển thị bố cục công khai của IELTS Academic để bạn dễ hình dung tổng thể bài thi.',
    metadata: [
      { labelKey: 'duration', value: 'Khoảng 2 giờ 44 phút' },
      { labelKey: 'questions', value: '80 câu objective + Writing/Speaking tasks' },
      { labelKey: 'scoring', value: 'Band 0 - 9, overall là trung bình 4 kỹ năng' },
      { labelKey: 'support', value: 'Quizmate AI chỉ tạo được bài luyện trắc nghiệm theo Reading-style' },
    ],
    sections: [
      createPublicSection('Listening', '4 parts, mỗi part 10 câu.', '40 câu', '30 phút + 10 phút transfer', false, 'Quizmate AI chưa hỗ trợ listening.'),
      createPublicSection('Reading', '3 sections theo format Academic Reading.', '40 câu', '60 phút', true),
      createPublicSection('Writing', 'Task 1 và Task 2 theo tiêu chí chấm viết.', '2 tasks', '60 phút', false, 'Quizmate AI chưa hỗ trợ writing.'),
      createPublicSection('Speaking', 'Interview trực tiếp với 3 parts.', '3 parts', '11-14 phút', false, 'Quizmate AI chưa hỗ trợ speaking.'),
    ],
    notes: [
      'Template AI tạo sẽ ưu tiên phần đọc hiểu dạng trắc nghiệm để đối chiếu.',
      'Listening, Writing và Speaking hiện chỉ được hiển thị để bạn tham khảo cấu trúc công khai.',
    ],
    defaults: {
      templateFormat: 'FULL_EXAM',
      templateDurationMinutes: 60,
      templateQuestionCount: 40,
    },
  };
}

function buildToeicPreview() {
  return {
    kind: 'public',
    title: 'TOEIC Listening & Reading - template công khai',
    summary: 'Bố cục công khai của TOEIC L&R gồm 200 câu trong khoảng 2 giờ.',
    metadata: [
      { labelKey: 'duration', value: '120 phút' },
      { labelKey: 'questions', value: '200 câu' },
      { labelKey: 'scoring', value: 'Điểm 10 - 990' },
      { labelKey: 'support', value: 'Quizmate AI ưu tiên Reading (Part 5-7) vì không cần audio' },
    ],
    sections: [
      createPublicSection('Listening Part 1-4', 'Photographs, Question-Response, Conversations, Talks.', '100 câu', '45 phút', false, 'Quizmate AI chưa hỗ trợ listening.'),
      createPublicSection('Reading Part 5', 'Incomplete Sentences.', '30 câu', 'Trong 75 phút Reading', true),
      createPublicSection('Reading Part 6', 'Text Completion.', '16 câu', 'Trong 75 phút Reading', true),
      createPublicSection('Reading Part 7', 'Single passages + multiple passages.', '54 câu', 'Trong 75 phút Reading', true),
    ],
    notes: [
      'Template AI tạo sẽ bám sát phần Reading của TOEIC L&R.',
      'Bố cục Listening vẫn được hiển thị để bạn thấy rõ format công khai của đề thật.',
    ],
    defaults: {
      templateFormat: 'FULL_EXAM',
      templateDurationMinutes: 75,
      templateQuestionCount: 100,
    },
  };
}

function buildSatPreview() {
  return {
    kind: 'public',
    title: 'Digital SAT - template công khai',
    summary: 'Bố cục công khai của Digital SAT gồm 2 sections, mỗi section chia thành 2 modules.',
    metadata: [
      { labelKey: 'duration', value: '134 phút + 10 phút break' },
      { labelKey: 'questions', value: '98 câu/tasks' },
      { labelKey: 'scoring', value: 'Tổng điểm 400 - 1600' },
      { labelKey: 'support', value: 'Quizmate AI ưu tiên câu hỏi multiple-choice; math free-response sẽ không đầy đủ' },
    ],
    sections: [
      createPublicSection('Reading and Writing', '2 modules, adaptive by module 1 performance.', '54 câu', '64 phút', true),
      createPublicSection('Math', '2 modules, adaptive; một số câu yêu cầu tự nhập đáp án.', '44 câu', '70 phút', true, 'Một số câu Math tự nhập đáp án sẽ được quy đổi sang dạng trắc nghiệm để luyện tập.'),
    ],
    notes: [
      'Template AI tạo sẽ ưu tiên phần multiple-choice để bạn luyện tốc độ và nhận dạng dạng bài.',
      'Những câu Math cần tự nhập đáp án không được mô phỏng đầy đủ như bài thi gốc.',
    ],
    defaults: {
      templateFormat: 'FULL_EXAM',
      templateDurationMinutes: 134,
      templateQuestionCount: 98,
    },
  };
}

function buildHskPreview(values) {
  const level = detectHskLevel(values);
  const levelDefaults = {
    3: { duration: 85, questions: 80 },
    4: { duration: 100, questions: 100 },
    5: { duration: 125, questions: 100 },
    6: { duration: 140, questions: 101 },
  }[level] || { duration: 100, questions: 100 };

  return {
    kind: 'public',
    title: `HSK ${level} - template công khai`,
    summary: 'Bố cục công khai tham khảo của HSK theo level đã suy ra từ knowledge hiện tại.',
    metadata: [
      { labelKey: 'duration', value: `${levelDefaults.duration} phút` },
      { labelKey: 'questions', value: `${levelDefaults.questions} câu / tasks` },
      { labelKey: 'scoring', value: `Level ${level} theo score scale của HSK` },
      { labelKey: 'support', value: 'Quizmate AI ưu tiên Reading; Listening/Writing chưa hỗ trợ đầy đủ' },
    ],
    sections: [
      createPublicSection('Listening', 'Phần nghe theo level HSK.', 'Audio tasks', 'Theo lịch thi từng level', false, 'Quizmate AI chưa hỗ trợ listening.'),
      createPublicSection('Reading', 'Phần đọc hiểu và nhận diện ngôn ngữ.', 'Reading items', 'Trong tổng thời gian đề', true),
      createPublicSection('Writing', 'Phần viết/tạo câu nếu level có yêu cầu.', 'Writing tasks', 'Trong tổng thời gian đề', false, 'Quizmate AI chưa hỗ trợ writing.'),
    ],
    notes: [
      'Với HSK, Quizmate AI sẽ tạo bản luyện phần đọc và câu hỏi trắc nghiệm gần với format công khai.',
      'Listening và Writing hiện chỉ hiển thị để tham khảo cấu trúc.',
    ],
    defaults: {
      templateFormat: 'FULL_EXAM',
      templateDurationMinutes: levelDefaults.duration,
      templateQuestionCount: levelDefaults.questions,
    },
  };
}

function buildTopikPreview(values) {
  const level = detectTopikLevel(values);

  return {
    kind: 'public',
    title: 'TOPIK - template công khai',
    summary: `Bố cục công khai tham khảo của TOPIK gần với mức level ${level}.`,
    metadata: [
      { labelKey: 'duration', value: 'Tùy cấp độ và kỳ thi TOPIK I / II' },
      { labelKey: 'questions', value: 'Nghe + Đọc + Viết tùy cấp độ' },
      { labelKey: 'scoring', value: 'Scale theo level TOPIK' },
      { labelKey: 'support', value: 'Quizmate AI ưu tiên phần đọc dạng trắc nghiệm' },
    ],
    sections: [
      createPublicSection('Listening', 'Phần nghe của TOPIK công khai.', 'Audio tasks', 'Theo lịch thi', false, 'Quizmate AI chưa hỗ trợ listening.'),
      createPublicSection('Reading', 'Phần đọc hiểu của TOPIK.', 'Reading items', 'Theo lịch thi', true),
      createPublicSection('Writing', 'Phần viết của TOPIK II nếu có.', 'Writing tasks', 'Theo lịch thi', false, 'Quizmate AI chưa hỗ trợ writing.'),
    ],
    notes: [
      'TOPIK có phần nghe và viết không được Quizmate AI hỗ trợ ở giai đoạn hiện tại.',
      'Template AI sinh ra sẽ ưu tiên phần đọc dạng trắc nghiệm để bạn luyện cấu trúc đề.',
    ],
    defaults: {
      templateFormat: 'FULL_EXAM',
      templateDurationMinutes: 70,
      templateQuestionCount: 50,
    },
  };
}

export function getPublicExamTemplateConfig(values, selectedExam) {
  if (!selectedExam?.id) return null;

  switch (selectedExam.id) {
    case 'ielts':
      return buildIeltsPreview();
    case 'toeic':
      return buildToeicPreview();
    case 'jlpt':
      return buildJlptPreview(values);
    case 'topik':
      return buildTopikPreview(values);
    case 'hsk':
      return buildHskPreview(values);
    case 'sat':
      return buildSatPreview(values);
    default:
      return null;
  }
}

export function getPublicExamTemplateDefaults(values, selectedExam) {
  return getPublicExamTemplateConfig(values, selectedExam)?.defaults || null;
}

function normalizeKeyword(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


export function getPublicExamById(examId) {
  return PUBLIC_EXAMS.find((exam) => exam.id === examId) || null;
}

export function getPublicExamByName(examName) {
  const normalizedExamName = normalizeKeyword(examName);
  if (!normalizedExamName) return null;

  return (
    PUBLIC_EXAMS.find((exam) => normalizeKeyword(exam.name) === normalizedExamName)
    || PUBLIC_EXAMS.find((exam) => exam.alias.some((alias) => normalizedExamName.includes(normalizeKeyword(alias))))
    || null
  );
}

function getExamRelevanceScore(exam, valuesOrText, searchQuery = '') {
  const baseText = typeof valuesOrText === 'string'
    ? valuesOrText
    : [
        valuesOrText?.knowledgeInput,
        valuesOrText?.inferredDomain,
        valuesOrText?.mockExamName,
      ].filter(Boolean).join(' ');
  const normalizedBaseText = normalizeKeyword(`${baseText} ${searchQuery}`.trim());
  if (!normalizedBaseText) return 0;

  const haystack = normalizeKeyword(`${exam.name} ${exam.domain} ${exam.alias.join(' ')}`);
  let score = 0;

  if (normalizedBaseText.includes(normalizeKeyword(exam.name))) {
    score += 8;
  }

  if (normalizedBaseText.includes(normalizeKeyword(exam.domain))) {
    score += 5;
  }

  exam.alias.forEach((alias) => {
    const normalizedAlias = normalizeKeyword(alias);
    if (normalizedBaseText.includes(normalizedAlias)) {
      score += normalizedAlias.length >= 3 ? 6 : 4;
    }
  });

  return score;
}

export function getSuggestedPublicExams(values, searchQuery = '') {
  const ranked = PUBLIC_EXAMS.map((exam) => ({
    exam,
    score: getExamRelevanceScore(exam, values, searchQuery),
  }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return PUBLIC_EXAMS.findIndex((item) => item.id === left.exam.id) - PUBLIC_EXAMS.findIndex((item) => item.id === right.exam.id);
    });

  const matched = ranked.filter((item) => item.score > 0).map((item) => item.exam);
  if (matched.length > 0) {
    return matched;
  }

  return ranked.map((item) => item.exam);
}

function collectFocusItems(rawText) {
  return rawText
    .split(/[,\n;/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function generateImprovementRecommendations(values, selectedExam) {
  const suggestions = [];
  const weakAreas = collectFocusItems(values.weakAreas || '');
  const strongAreas = collectFocusItems(values.strongAreas || '');
  const focusKnowledge = values.knowledgeInput;

  weakAreas.forEach((item) => suggestions.push(item));

  if (focusKnowledge) {
    suggestions.push(`Củng cố ${focusKnowledge}`);
  }

  if (values.learningGoal) {
    suggestions.push('Bám sát mục tiêu học tập ưu tiên');
  }

  if (values.currentLevel) {
    suggestions.push(`Nâng từ mức ${values.currentLevel} lên cấp độ tiếp theo`);
  }

  if (strongAreas.length > 0) {
    suggestions.push(`Tận dụng thế mạnh: ${strongAreas[0]}`);
  }

  if (values.inferredDomain) {
    suggestions.push(`Đào sâu trong ${values.inferredDomain}`);
  }

  if (values.workspacePurpose === 'REVIEW') {
    suggestions.push('Ôn lại phần sai thường gặp');
    suggestions.push('Tăng tần suất nhắc lại chủ đề trọng tâm');
  }

  if (values.workspacePurpose === 'MOCK_TEST') {
    suggestions.push('Làm quen áp lực thời gian');
    suggestions.push('Chuẩn hóa chiến lược phân bổ thời gian');
  }

  if (selectedExam?.name) {
    suggestions.push(`Luyện đúng format ${selectedExam.name}`);
  }

  return suggestions.filter((item, index, array) => array.indexOf(item) === index).slice(0, 8);
}

export function generateTemplateSuggestion(values, selectedExam) {
  const publicExamTemplate = values.mockExamMode === 'PUBLIC' ? getPublicExamTemplateConfig(values, selectedExam) : null;
  if (publicExamTemplate) {
    return publicExamTemplate;
  }

  const examName = selectedExam?.name || values.mockExamName || 'Mock test cá nhân';
  const format = values.templateFormat || 'FULL_EXAM';
  const questionCount = Number(values.templateQuestionCount) || 60;
  const duration = Number(values.templateDurationMinutes) || 90;
  const sectionSet = {
    FULL_EXAM: [
      'Khởi động theo format đề',
      'Phần trọng tâm mô phỏng đề thật',
      'Phần tăng tốc cuối bài',
    ],
    SECTION_BASED: [
      'Section kỹ năng 1',
      'Section kỹ năng 2',
      'Section tổng hợp lỗi cần chú ý',
    ],
    PRACTICE_SET: [
      'Bài luyện mục tiêu',
      'Bộ câu hỏi khó',
      'Tự đánh giá nhanh cuối buổi',
    ],
  }[format];

  return {
    title: `${examName} - template gợi ý`,
    summary: `Template gồm ${sectionSet.length} phần, khoảng ${questionCount} câu trong ${duration} phút.`,
    sections: sectionSet.map((item, index) => ({
      name: item,
      detail: `Ưu tiên ${Math.max(6, Math.round(questionCount / sectionSet.length))} câu ở phần ${index + 1}.`,
    })),
    notes: [
      values.templatePrompt || 'Bám sát mục tiêu người học đã nhập.',
      values.templateNotes || 'Giữ mức độ khó tăng dần và có checkpoint giữa bài.',
    ],
  };
}

function uniqueTokens(value) {
  return Array.from(
    new Set(
      normalizeKeyword(value)
        .split(/[^a-z0-9]+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
    )
  );
}

function pickFirstValue(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.find((item) => typeof item === 'string' && item.trim())?.trim() || '';
  }

  if (typeof rawValue === 'string') {
    return rawValue
      .split(/[,\n;/]+/)
      .map((item) => item.trim())
      .find(Boolean) || '';
  }

  return '';
}

function collectMaterialContext(values, selectedExam) {
  const currentExam = selectedExam?.name || values.mockExamName || '';

  return [
    { key: 'knowledge', value: values.knowledgeInput, weight: 3 },
    { key: 'domain', value: values.inferredDomain, weight: 3 },
    { key: 'level', value: values.currentLevel, weight: 2 },
    { key: 'goal', value: values.learningGoal, weight: 1 },
    { key: 'weakAreas', value: pickFirstValue(values.weakAreas), weight: 2 },
    { key: 'strongAreas', value: pickFirstValue(values.strongAreas), weight: 1 },
    { key: 'exam', value: currentExam, weight: 2 },
  ].filter((item) => typeof item.value === 'string' && item.value.trim());
}

export function evaluateMaterialFit(material, values, selectedExam) {
  const materialName = material?.name || material?.title || 'Untitled material';
  const materialType = material?.type || material?.materialType || '';
  const sourceText = normalizeKeyword(`${materialName} ${materialType}`);
  const matchedContexts = collectMaterialContext(values, selectedExam)
    .map((context) => {
      const matchedTokens = uniqueTokens(context.value).filter((token) => sourceText.includes(token));

      if (matchedTokens.length === 0) {
        return null;
      }

      return {
        ...context,
        match: matchedTokens[0],
      };
    })
    .filter(Boolean);

  const backendStatus = (material?.status || '').toUpperCase();
  const score = matchedContexts.reduce((total, item) => total + item.weight, 0);
  const hasStrongContext = matchedContexts.some((item) => item.key === 'knowledge' || item.key === 'domain');

  let tone = 'weak';

  if (backendStatus === 'PROCESSING' || backendStatus === 'UPLOADING' || backendStatus === 'PENDING' || backendStatus === 'QUEUED' || backendStatus === 'PENDING_UPLOAD') {
    tone = 'processing';
  } else if (backendStatus === 'REJECT' || backendStatus === 'REJECTED' || backendStatus === 'ERROR') {
    tone = 'critical';
  } else if (score >= 6 || (score >= 4 && hasStrongContext)) {
    tone = 'strong';
  } else if (score >= 2) {
    tone = 'partial';
  }

  return {
    id: material?.id || material?.materialId || materialName,
    name: materialName,
    type: materialType,
    tone,
    score,
    matchedContexts: matchedContexts.slice(0, 4),
    isPendingUpload: Boolean(material?.isPendingUpload),
    backendStatus,
  };
}
