
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

function normalizeKeyword(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
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

export function generateTemplateSuggestion(values) {
  const examName = values.mockExamName || 'Mock test';
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
    title: `${examName} - template gợi ý`.normalize('NFC'),
    summary: `Template gồm ${sectionSet.length} phần, khoảng ${questionCount} câu trong ${duration} phút.`.normalize('NFC'),
    sections: sectionSet.map((item, index) => {
      const qCount = Math.max(6, Math.round(questionCount / sectionSet.length));
      const sectionStartId = index * qCount;
      const displayCount = Math.min(3, qCount);
      const isChinese = (values.knowledgeInput || '').toLowerCase().includes('trung') || (values.mockExamName || '').toLowerCase().includes('hsk');
      
      const mockQuestions = [];
      for (let i = 0; i < displayCount; i++) {
        const qIndex = sectionStartId + i + 1;
        let content = `[Nội dung câu hỏi ${qIndex} được AI tạo tự động dựa trên ${values.knowledgeInput || 'kiến thức của bạn'}]`.normalize('NFC');
        let options = ['A. Lựa chọn 1', 'B. Lựa chọn 2', 'C. Lựa chọn 3', 'D. Lựa chọn 4'].map(o => o.normalize('NFC'));
        
        if (isChinese) {
          content = i === 0 ? "我叫大卫" : i === 1 ? "Điền từ vào chỗ trống\n玛丽: 你叫什么______?\n李军: 我叫李军。" : "你是______吗?\n李军: 我不是老师，我是______，她是老师。";
          options = i === 0 ? ['A. Wǒ jiào mǎlì', 'B. Wǒ jiào lǐ jūn', 'C. Wǒ jiào dà wèi'] : i === 1 ? ['A. 学生', 'B. 老师', 'C. 名字'] : ['A. 老师 / 学生', 'B. 学生 / 名字', 'C. 老师 / 谢谢'];
        }

        mockQuestions.push({
          index: qIndex,
          content,
          options
        });
      }

      return {
        name: item.normalize('NFC'),
        detail: `Dự kiến phần này có ${qCount} câu hỏi.`.normalize('NFC'),
        totalQuestions: qCount,
        mockQuestions
      };
    }),
    notes: [
      (values.templatePrompt || 'Bám sát mục tiêu người học đã nhập.').normalize('NFC'),
      (values.templateNotes || 'Giữ mức độ khó tăng dần và có checkpoint giữa bài.').normalize('NFC'),
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

function collectMaterialContext(values) {
  const currentExam = values.mockExamName || '';

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

export function evaluateMaterialFit(material, values) {
  const materialName = material?.name || material?.title || 'Untitled material';
  const materialType = material?.type || material?.materialType || '';
  const sourceText = normalizeKeyword(`${materialName} ${materialType}`);
  const matchedContexts = collectMaterialContext(values)
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
