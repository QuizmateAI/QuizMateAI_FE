export function buildManualMockTestSections(examName = '') {
  const scope = examName.trim() || 'mock test';
  return [
    {
      name: 'Kiến thức nền tảng',
      description: `Câu hỏi kiểm tra định nghĩa, dữ kiện và khái niệm cơ bản trong phạm vi ${scope}.`,
      numQuestions: 10,
      requiresSharedContext: false,
      structure: [
        { difficulty: 'EASY', questionType: 'SINGLE_CHOICE', bloomSkill: 'REMEMBER', quantity: 6 },
        { difficulty: 'MEDIUM', questionType: 'TRUE_FALSE', bloomSkill: 'UNDERSTAND', quantity: 4 },
      ],
      subConfigs: [],
    },
    {
      name: 'Hiểu và liên hệ khái niệm',
      description: `Câu hỏi kiểm tra cách liên hệ các khái niệm, quy tắc và lỗi hiểu sai thường gặp trong ${scope}.`,
      numQuestions: 10,
      requiresSharedContext: false,
      structure: [
        { difficulty: 'MEDIUM', questionType: 'SINGLE_CHOICE', bloomSkill: 'UNDERSTAND', quantity: 7 },
        { difficulty: 'MEDIUM', questionType: 'MULTIPLE_CHOICE', bloomSkill: 'ANALYZE', quantity: 3 },
      ],
      subConfigs: [],
    },
    {
      name: 'Vận dụng thực hành',
      description: `Câu hỏi yêu cầu áp dụng kiến thức vào bài tập, tình huống ngắn hoặc ví dụ thực tế thuộc ${scope}.`,
      numQuestions: 12,
      requiresSharedContext: false,
      structure: [
        { difficulty: 'MEDIUM', questionType: 'SINGLE_CHOICE', bloomSkill: 'APPLY', quantity: 8 },
        { difficulty: 'HARD', questionType: 'MULTIPLE_CHOICE', bloomSkill: 'ANALYZE', quantity: 4 },
      ],
      subConfigs: [],
    },
    {
      name: 'Phân tích và đánh giá',
      description: `Câu hỏi kiểm tra suy luận sâu, so sánh phương án và lựa chọn kết luận đúng trong ${scope}.`,
      numQuestions: 8,
      requiresSharedContext: false,
      structure: [
        { difficulty: 'HARD', questionType: 'SINGLE_CHOICE', bloomSkill: 'ANALYZE', quantity: 5 },
        { difficulty: 'HARD', questionType: 'MULTIPLE_CHOICE', bloomSkill: 'EVALUATE', quantity: 3 },
      ],
      subConfigs: [],
    },
  ];
}
