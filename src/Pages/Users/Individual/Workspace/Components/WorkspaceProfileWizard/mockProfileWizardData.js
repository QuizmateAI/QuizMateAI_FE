
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
    summary: 'Bai thi 4 ky nang voi trong tam hoc thuat.',
  },
  {
    id: 'toeic',
    name: 'TOEIC',
    alias: ['toeic'],
    domain: 'TOEIC',
    scoreScale: 'Diem / 990',
    scoreSuggestions: ['550', '650', '750', '850', '900'],
    summary: 'De thi nghe doc pho bien trong moi truong doanh nghiep.',
  },
  {
    id: 'jlpt',
    name: 'JLPT',
    alias: ['jlpt', 'n5', 'n4', 'n3', 'n2', 'n1'],
    domain: 'Japanese',
    scoreScale: 'Cap do N5 - N1',
    scoreSuggestions: ['N4', 'N3', 'N2', 'N1'],
    summary: 'Ky thi nang luc tieng Nhat theo cap do.',
  },
  {
    id: 'topik',
    name: 'TOPIK',
    alias: ['topik'],
    domain: 'Korean',
    scoreScale: 'Level 1 - 6',
    scoreSuggestions: ['Level 2', 'Level 3', 'Level 4', 'Level 5'],
    summary: 'Ky thi nang luc tieng Han danh cho hoc tap va lam viec.',
  },
  {
    id: 'hsk',
    name: 'HSK',
    alias: ['hsk'],
    domain: 'Chinese',
    scoreScale: 'Level 1 - 9',
    scoreSuggestions: ['Level 3', 'Level 4', 'Level 5', 'Level 6'],
    summary: 'Ky thi nang luc tieng Trung voi lo trinh tu co ban den nang cao.',
  },
  {
    id: 'sat',
    name: 'SAT',
    alias: ['sat'],
    domain: 'Mathematics',
    scoreScale: 'Diem / 1600',
    scoreSuggestions: ['1100', '1250', '1400', '1500'],
    summary: 'Bai thi chuan hoa cho tuyen sinh dai hoc.',
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
      totalDurationLabel: '165 phut',
      scoring: 'Tong diem scaled 0-180, can dat nguong tung phan.',
    },
    N2: {
      supportedDuration: 105,
      totalDurationLabel: '155 phut',
      scoring: 'Tong diem scaled 0-180, can dat nguong tung phan.',
    },
    N3: {
      supportedDuration: 100,
      totalDurationLabel: '140 phut',
      scoring: 'Tong diem scaled 0-180, can dat nguong tung phan.',
    },
    N4: {
      supportedDuration: 80,
      totalDurationLabel: '115 phut',
      scoring: 'Tong diem scaled 0-180, can dat nguong tung phan.',
    },
    N5: {
      supportedDuration: 60,
      totalDurationLabel: '90 phut',
      scoring: 'Tong diem scaled 0-180, can dat nguong tung phan.',
    },
  }[level];

  return {
    kind: 'public',
    title: `JLPT ${level} - template cong khai`,
    summary: `Hien thi theo bo cuc cong khai cua ${level} de ban hinh dung ngay cau truc bai thi.`,
    metadata: [
      { labelKey: 'duration', value: levelConfig.totalDurationLabel },
      { labelKey: 'questions', value: 'Cau hoi trac nghiem theo tung section JLPT' },
      { labelKey: 'scoring', value: levelConfig.scoring },
      { labelKey: 'support', value: `Quizmate AI se uu tien phan Language Knowledge + Reading cua ${level}` },
    ],
    sections: [
      createPublicSection(
        'Language Knowledge + Reading',
        `Mo phong nhom cau hoi tu vung, ngu phap va doc hieu cua ${level}.`,
        'Khoang 60 cau trac nghiem',
        `${levelConfig.supportedDuration} phut`,
        true
      ),
      createPublicSection(
        'Listening',
        `Giup ban thay ro day la phan nghe cua de cong khai ${level}.`,
        'Audio tasks',
        level === 'N1' ? '55 phut' : level === 'N2' ? '50 phut' : level === 'N3' ? '40 phut' : level === 'N4' ? '35 phut' : '30 phut',
        false,
        'Quizmate AI chua ho tro listening.'
      ),
    ],
    notes: [
      `Template AI sinh ra se chi tap trung vao phan trac nghiem khong can audio cua ${level}.`,
      'Bo cuc cong khai van duoc hien thi day du de ban doi chieu voi ky thi that.',
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
    title: 'IELTS Academic - template cong khai',
    summary: 'Hien thi bo cuc cong khai cua IELTS Academic de ban de hinh dung tong the bai thi.',
    metadata: [
      { labelKey: 'duration', value: 'Khoang 2 gio 44 phut' },
      { labelKey: 'questions', value: '80 cau objective + Writing/Speaking tasks' },
      { labelKey: 'scoring', value: 'Band 0 - 9, overall la trung binh 4 ky nang' },
      { labelKey: 'support', value: 'Quizmate AI chi tao duoc bai luyen trac nghiem theo Reading-style' },
    ],
    sections: [
      createPublicSection('Listening', '4 parts, moi part 10 cau.', '40 cau', '30 phut + 10 phut transfer', false, 'Quizmate AI chua ho tro listening.'),
      createPublicSection('Reading', '3 sections theo format Academic Reading.', '40 cau', '60 phut', true),
      createPublicSection('Writing', 'Task 1 va Task 2 theo tieu chi cham viet.', '2 tasks', '60 phut', false, 'Quizmate AI chua ho tro writing.'),
      createPublicSection('Speaking', 'Interview truc tiep voi 3 parts.', '3 parts', '11-14 phut', false, 'Quizmate AI chua ho tro speaking.'),
    ],
    notes: [
      'Template AI tao se uu tien phan doc hieu dang trac nghiem/de doi chieu.',
      'Listening, Writing va Speaking hien chi duoc hien thi de ban tham khao cau truc cong khai.',
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
    title: 'TOEIC Listening & Reading - template cong khai',
    summary: 'Bo cuc cong khai cua TOEIC L&R gom 200 cau trong khoang 2 gio.',
    metadata: [
      { labelKey: 'duration', value: '120 phut' },
      { labelKey: 'questions', value: '200 cau' },
      { labelKey: 'scoring', value: 'Diem 10 - 990' },
      { labelKey: 'support', value: 'Quizmate AI uu tien Reading (Part 5-7) vi khong can audio' },
    ],
    sections: [
      createPublicSection('Listening Part 1-4', 'Photographs, Question-Response, Conversations, Talks.', '100 cau', '45 phut', false, 'Quizmate AI chua ho tro listening.'),
      createPublicSection('Reading Part 5', 'Incomplete Sentences.', '30 cau', 'Trong 75 phut Reading', true),
      createPublicSection('Reading Part 6', 'Text Completion.', '16 cau', 'Trong 75 phut Reading', true),
      createPublicSection('Reading Part 7', 'Single passages + multiple passages.', '54 cau', 'Trong 75 phut Reading', true),
    ],
    notes: [
      'Template AI tao se bam sat phan Reading cua TOEIC L&R.',
      'Bo cuc Listening van duoc hien thi de ban thay ro format cong khai cua de that.',
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
    title: 'Digital SAT - template cong khai',
    summary: 'Bo cuc cong khai cua Digital SAT gom 2 sections, moi section chia thanh 2 modules.',
    metadata: [
      { labelKey: 'duration', value: '134 phut + 10 phut break' },
      { labelKey: 'questions', value: '98 cau/tasks' },
      { labelKey: 'scoring', value: 'Tong diem 400 - 1600' },
      { labelKey: 'support', value: 'Quizmate AI uu tien cau hoi multiple-choice; math free-response se khong day du' },
    ],
    sections: [
      createPublicSection('Reading and Writing', '2 modules, adaptive by module 1 performance.', '54 cau', '64 phut', true),
      createPublicSection('Math', '2 modules, adaptive; mot so cau yeu cau tu nhap dap an.', '44 cau', '70 phut', true, 'Mot so cau Math tu nhap dap an se duoc quy doi sang dang trac nghiem de luyen tap.'),
    ],
    notes: [
      'Template AI tao se uu tien phan multiple-choice de ban luyen toc do va nhan dang dang bai.',
      'Nhung cau Math can tu nhap dap an khong duoc mo phong day du nhu bai thi goc.',
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
    title: `HSK ${level} - template cong khai`,
    summary: 'Bo cuc cong khai tham khao cua HSK theo level da suy ra tu knowledge hien tai.',
    metadata: [
      { labelKey: 'duration', value: `${levelDefaults.duration} phut` },
      { labelKey: 'questions', value: `${levelDefaults.questions} cau / tasks` },
      { labelKey: 'scoring', value: `Level ${level} theo score scale cua HSK` },
      { labelKey: 'support', value: 'Quizmate AI uu tien Reading; Listening/Writing chua ho tro day du' },
    ],
    sections: [
      createPublicSection('Listening', 'Phan nghe theo level HSK.', 'Audio tasks', 'Theo lich thi tung level', false, 'Quizmate AI chua ho tro listening.'),
      createPublicSection('Reading', 'Phan doc hieu va nhan dien ngon ngu.', 'Reading items', 'Trong tong thoi gian de', true),
      createPublicSection('Writing', 'Phan viet/tao cau neu level co yeu cau.', 'Writing tasks', 'Trong tong thoi gian de', false, 'Quizmate AI chua ho tro writing.'),
    ],
    notes: [
      'Voi HSK, Quizmate AI se tao ban luyen phan doc va cau hoi trac nghiem gan voi format cong khai.',
      'Listening va Writing hien chi hien de tham khao cau truc.',
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
    title: `TOPIK - template cong khai`,
    summary: `Bo cuc cong khai tham khao cua TOPIK gan voi muc level ${level}.`,
    metadata: [
      { labelKey: 'duration', value: 'Tuy cap do va ky thi TOPIK I / II' },
      { labelKey: 'questions', value: 'Nghe + Doc + Viet tuy cap do' },
      { labelKey: 'scoring', value: 'Scale theo level TOPIK' },
      { labelKey: 'support', value: 'Quizmate AI uu tien phan doc dang trac nghiem' },
    ],
    sections: [
      createPublicSection('Listening', 'Phan nghe cua TOPIK cong khai.', 'Audio tasks', 'Theo lich thi', false, 'Quizmate AI chua ho tro listening.'),
      createPublicSection('Reading', 'Phan doc hieu cua TOPIK.', 'Reading items', 'Theo lich thi', true),
      createPublicSection('Writing', 'Phan viet cua TOPIK II neu co.', 'Writing tasks', 'Theo lich thi', false, 'Quizmate AI chua ho tro writing.'),
    ],
    notes: [
      'TOPIK co phan nghe va viet khong duoc Quizmate AI ho tro o giai doan hien tai.',
      'Template AI sinh ra se uu tien phan doc dang trac nghiem de ban luyen cau truc de.',
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
    suggestions.push(`Cung co ${focusKnowledge}`);
  }

  if (values.learningGoal) {
    suggestions.push('Bam sat muc tieu hoc tap uu tien');
  }

  if (values.currentLevel) {
    suggestions.push(`Nang tu muc ${values.currentLevel} len cap do tiep theo`);
  }

  if (strongAreas.length > 0) {
    suggestions.push(`Tan dung the manh: ${strongAreas[0]}`);
  }

  if (values.inferredDomain) {
    suggestions.push(`Dao sau trong ${values.inferredDomain}`);
  }

  if (values.workspacePurpose === 'REVIEW') {
    suggestions.push('On lai phan sai thuong gap');
    suggestions.push('Tang tan suat nhac lai chu de trong tam');
  }

  if (values.workspacePurpose === 'MOCK_TEST') {
    suggestions.push('Lam quen ap luc thoi gian');
    suggestions.push('Chuan hoa chien luoc phan bo thoi gian');
  }

  if (selectedExam?.name) {
    suggestions.push(`Luyen dung format ${selectedExam.name}`);
  }

  return suggestions.filter((item, index, array) => array.indexOf(item) === index).slice(0, 8);
}

export function generateTemplateSuggestion(values, selectedExam) {
  const publicExamTemplate = values.mockExamMode === 'PUBLIC' ? getPublicExamTemplateConfig(values, selectedExam) : null;
  if (publicExamTemplate) {
    return publicExamTemplate;
  }

  const examName = selectedExam?.name || values.mockExamName || 'Mock test ca nhan';
  const format = values.templateFormat || 'FULL_EXAM';
  const questionCount = Number(values.templateQuestionCount) || 60;
  const duration = Number(values.templateDurationMinutes) || 90;
  const sectionSet = {
    FULL_EXAM: [
      'Khoi dong theo format de',
      'Phan trong tam mo phong de that',
      'Phan tang toc cuoi bai',
    ],
    SECTION_BASED: [
      'Section ky nang 1',
      'Section ky nang 2',
      'Section tong hop loi can chu y',
    ],
    PRACTICE_SET: [
      'Bai luyen muc tieu',
      'Bo cau hoi kho',
      'Tu danh gia nhanh cuoi buoi',
    ],
  }[format];

  return {
    title: `${examName} - template goi y`,
    summary: `Template gom ${sectionSet.length} phan, khoang ${questionCount} cau trong ${duration} phut.`,
    sections: sectionSet.map((item, index) => ({
      name: item,
      detail: `Uu tien ${Math.max(6, Math.round(questionCount / sectionSet.length))} cau o phan ${index + 1}.`,
    })),
    notes: [
      values.templatePrompt || 'Bam sat muc tieu nguoi hoc da nhap.',
      values.templateNotes || 'Giu muc do kho tang dan va co checkpoint giua bai.',
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

  if (backendStatus === 'PROCESSING' || backendStatus === 'UPLOADING' || backendStatus === 'PENDING' || backendStatus === 'QUEUED') {
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
