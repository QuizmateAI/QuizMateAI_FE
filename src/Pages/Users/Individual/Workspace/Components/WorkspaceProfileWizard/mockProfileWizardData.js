const DOMAIN_PRESETS = [
  {
    id: 'jlpt',
    keywords: ['jlpt', 'n1', 'n2', 'n3', 'n4', 'n5', 'nihongo', 'tieng nhat', 'kanji'],
    specific: true,
    getSuggestions(text) {
      const level = ['n1', 'n2', 'n3', 'n4', 'n5'].find((item) => text.includes(item));

      if (level) {
        return [`JLPT ${level.toUpperCase()}`, 'JLPT', 'Japanese'];
      }

      return ['JLPT', 'Japanese', 'Japanese Language'];
    },
  },
  {
    id: 'topik',
    keywords: ['topik', 'tieng han', 'korean', 'hangul'],
    specific: true,
    getSuggestions() {
      return ['TOPIK', 'Korean', 'Korean Language'];
    },
  },
  {
    id: 'hsk',
    keywords: ['hsk', 'tieng trung', 'chinese', 'han ngu'],
    specific: true,
    getSuggestions() {
      return ['HSK', 'Chinese', 'Chinese Language'];
    },
  },
  {
    id: 'ielts',
    keywords: ['ielts', 'writing task 1', 'writing task 2', 'academic english'],
    specific: true,
    getSuggestions(text) {
      if (text.includes('writing')) return ['IELTS Writing', 'IELTS', 'Academic English'];
      if (text.includes('speaking')) return ['IELTS Speaking', 'IELTS', 'Academic English'];
      if (text.includes('reading')) return ['IELTS Reading', 'IELTS', 'Academic English'];
      if (text.includes('listening')) return ['IELTS Listening', 'IELTS', 'Academic English'];
      return ['IELTS', 'Academic English', 'English'];
    },
  },
  {
    id: 'toeic',
    keywords: ['toeic', 'business english'],
    specific: true,
    getSuggestions() {
      return ['TOEIC', 'Business English', 'English'];
    },
  },
  {
    id: 'english',
    keywords: ['english', 'tieng anh', 'giao tiep', 'grammar', 'vocabulary'],
    getSuggestions(text) {
      if (text.includes('giao tiep')) return ['English Communication', 'English', 'Language Skills'];
      if (text.includes('grammar')) return ['English Grammar', 'English', 'Language Skills'];
      if (text.includes('vocabulary')) return ['English Vocabulary', 'English', 'Language Skills'];
      return ['English', 'English Communication', 'Language Skills'];
    },
  },
  {
    id: 'react',
    keywords: ['react', 'hooks', 'frontend', 'jsx', 'component'],
    specific: true,
    getSuggestions() {
      return ['React', 'Frontend Development', 'JavaScript'];
    },
  },
  {
    id: 'programming',
    keywords: ['python', 'java', 'javascript', 'typescript', 'algorithm', 'lap trinh', 'coding'],
    getSuggestions(text) {
      if (text.includes('algorithm')) return ['Algorithms', 'Problem Solving', 'Programming'];
      if (text.includes('python')) return ['Python', 'Programming', 'Software Development'];
      if (text.includes('java')) return ['Java', 'Programming', 'Software Development'];
      return ['Programming', 'Software Development', 'Computer Science'];
    },
  },
  {
    id: 'probability',
    keywords: ['xac suat', 'thong ke', 'probability', 'statistics'],
    specific: true,
    getSuggestions() {
      return ['Probability & Statistics', 'Mathematics', 'STEM'];
    },
  },
  {
    id: 'mathematics',
    keywords: ['toan', 'giai tich', 'dai so', 'geometry'],
    getSuggestions() {
      return ['Mathematics', 'STEM', 'Problem Solving'];
    },
  },
  {
    id: 'marketing',
    keywords: ['marketing', 'content', 'seo', 'branding', 'digital marketing'],
    getSuggestions() {
      return ['Marketing', 'Digital Marketing', 'Content Strategy'];
    },
  },
  {
    id: 'design',
    keywords: ['design', 'thiet ke', 'ux', 'ui', 'figma'],
    getSuggestions() {
      return ['UI/UX Design', 'Product Design', 'Design'];
    },
  },
];

const GENERIC_TERMS = [
  'tieng anh',
  'english',
  'toan',
  'lap trinh',
  'coding',
  'on thi',
  'giao tiep',
  'marketing',
  'design',
  'hoc tap',
];

const SPECIFIC_TERMS = [
  'jlpt',
  'n1',
  'n2',
  'n3',
  'n4',
  'n5',
  'topik',
  'hsk',
  'ielts',
  'toeic',
  'react',
  'hooks',
  'python',
  'java',
  'algorithm',
  'xac suat',
  'thong ke',
];

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

function normalizeKeyword(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function titleizeLabel(value) {
  return value
    .split(/[,\n;/]+/)
    .map((item) => item.trim())
    .filter(Boolean)[0]
    ?.replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function matchPreset(text) {
  const ranked = DOMAIN_PRESETS.map((preset) => ({
    preset,
    score: preset.keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0),
  }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.preset.specific !== right.preset.specific) return left.preset.specific ? -1 : 1;
      return DOMAIN_PRESETS.findIndex((item) => item.id === left.preset.id) - DOMAIN_PRESETS.findIndex((item) => item.id === right.preset.id);
    });

  return ranked[0]?.preset || null;
}

function pickSignal(text, keywords = []) {
  const matchedKeywords = keywords
    .filter((keyword) => text.includes(keyword))
    .sort((left, right) => right.length - left.length);

  return matchedKeywords[0] || text.split(/\s+/).filter(Boolean)[0] || '';
}

function createDomainSuggestions(labels, signal, text) {
  const reasonTypes = ['closest', 'group', 'context'];

  return labels.slice(0, 3).map((label, index) => ({
    label,
    signal,
    knowledge: text,
    reasonType: reasonTypes[index] || 'context',
  }));
}

export function isGenericKnowledge(text) {
  const normalized = normalizeKeyword(text);

  if (!normalized) return false;
  if (SPECIFIC_TERMS.some((term) => normalized.includes(term))) return false;
  if (normalized.length < 14) return true;

  return GENERIC_TERMS.some((term) => normalized.includes(term));
}

export function analyzeKnowledgeInput(text) {
  const normalized = normalizeKeyword(text);
  const matchedPreset = matchPreset(normalized);

  if (matchedPreset) {
    const suggestionLabels = matchedPreset.getSuggestions(normalized).slice(0, 3);
    const signal = pickSignal(normalized, matchedPreset.keywords);
    const domainSuggestions = createDomainSuggestions(suggestionLabels, signal, text.trim());

    return {
      domain: domainSuggestions[0]?.label || '',
      domainSuggestions,
      isGeneric: isGenericKnowledge(text),
    };
  }

  const fallbackLabel = titleizeLabel(normalized) || 'Related Domain';
  const signal = pickSignal(normalized, []);

  return {
    domain: fallbackLabel,
    domainSuggestions: createDomainSuggestions([fallbackLabel], signal, text.trim()),
    isGeneric: isGenericKnowledge(text),
  };
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
