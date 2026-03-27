import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceProfileStepTwo from '@/Pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/WorkspaceProfileStepTwo';

const templateStructure = {
  overview: 'Mau de theo sat JLPT N4',
  totalDurationMinutes: 95,
  recommendedTotalQuestions: 60,
  sections: [
    {
      name: 'Tu vung',
      parts: [
        { name: 'Tu dong nghia', questionCount: 12 },
        { name: 'Ngu canh', questionCount: 8 },
      ],
    },
  ],
};

const templateNotes = [
  '- Overview: Mau de theo sat JLPT N4',
  '- Tu vung: Tu dong nghia (12 câu), Ngu canh (8 câu)',
].join('\n');

const examTemplateSuggestions = [
  {
    templateId: 'jlpt-n4-standard',
    examName: 'JLPT N4',
    templateName: 'JLPT N4 Standard',
    enforcedLanguage: 'JP',
    structure: templateStructure,
  },
  {
    templateId: 'jlpt-n4-compact',
    examName: 'JLPT N4',
    templateName: 'JLPT N4 Compact',
    enforcedLanguage: 'JP',
    structure: {
      overview: 'Ban de ngan gon de luyen de nhanh',
      totalDurationMinutes: 70,
      recommendedTotalQuestions: 40,
      sections: [
        {
          name: 'Ngu phap',
          parts: [{ name: 'Chon dap an', questionCount: 15 }],
        },
      ],
    },
  },
];

function createProps(overrides = {}) {
  const { values: valueOverrides = {}, ...restOverrides } = overrides;

  return {
    t: (key) => key,
    isDarkMode: false,
    values: {
      workspacePurpose: 'MOCK_TEST',
      currentLevel: '',
      learningGoal: '',
      strongAreas: '',
      weakAreas: '',
      mockExamName: '',
      templatePrompt: '',
      templateNotes: '',
      templateDurationMinutes: 90,
      templateQuestionCount: 60,
      templateTotalSectionPoints: 100,
      ...valueOverrides,
    },
    errors: {},
    templateStatus: 'idle',
    templatePreview: null,
    fieldSuggestions: {
      examNameSuggestions: ['JLPT N4'],
    },
    fieldSuggestionStatus: 'success',
    examTemplateSuggestions,
    examTemplateSuggestionStatus: 'success',
    consistencyResult: null,
    consistencyStatus: 'idle',
    disabled: false,
    onFieldChange: vi.fn(),
    onGenerateTemplate: vi.fn(),
    onApplySuggestion: vi.fn(),
    mockTestGenerationMessage: '',
    generationBannerClassName: '',
    mockTestGenerationState: 'idle',
    progressValue: 0,
    ...restOverrides,
  };
}

function openMockTestConfig() {
  fireEvent.click(screen.getByRole('button', { name: /cấu hình đề thi/i }));
}

describe('WorkspaceProfileStepTwo', () => {
  it('shows beginner-aware suggestions when the current level says the learner is just starting', () => {
    render(
      <WorkspaceProfileStepTwo
        {...createProps({
          values: {
            workspacePurpose: 'STUDY_NEW',
            knowledgeInput: 'Tiếng Nhật',
            inferredDomain: 'Tiếng Nhật',
            currentLevel: 'Mới bắt đầu học tiếng Nhật',
          },
          fieldSuggestions: {
            currentLevelSuggestions: ['Đã học xong N5'],
            strongAreaSuggestions: ['Chữ Hán cơ bản'],
            weakAreaSuggestions: ['Ngữ pháp N4 dễ nhầm'],
            learningGoalSuggestions: [],
          },
          examTemplateSuggestions: [],
        })}
      />
    );

    expect(screen.getByText('Bạn đang ở giai đoạn mới bắt đầu')).toBeInTheDocument();
    expect(screen.getByText('Mới bắt đầu học nên chưa xác định được điểm mạnh rõ ràng.')).toBeInTheDocument();
    expect(screen.getByText('Chữ Hán cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Mới bắt đầu học nên chưa xác định được điểm yếu rõ ràng.')).toBeInTheDocument();
    expect(screen.getByText('Ngữ pháp N4 dễ nhầm')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('VD: mới bắt đầu học nên chưa xác định được điểm mạnh rõ ràng...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('VD: mới bắt đầu học nên chưa xác định được điểm yếu rõ ràng...')).toBeInTheDocument();
    expect(screen.getByText('Bạn vẫn có thể đặt mục tiêu học tập ngay từ đầu')).toBeInTheDocument();
    expect(screen.getByText('Nắm hiragana, katakana và từ vựng cơ bản trước khi lên mục tiêu cao hơn.')).toBeInTheDocument();
  });

  it('shows which popular template is selected after choosing one', () => {
    const props = createProps();
    render(<WorkspaceProfileStepTwo {...props} />);

    openMockTestConfig();

    expect(screen.getByText('Chưa áp dụng template nào')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Dùng template này' })[0]);

    expect(screen.getByText('Đang áp dụng: JLPT N4 Standard')).toBeInTheDocument();
    expect(screen.getByText('Đang chọn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đang dùng template này' })).toHaveAttribute('aria-pressed', 'true');
    expect(props.onFieldChange).toHaveBeenCalledWith('mockExamName', 'JLPT N4');
    expect(props.onFieldChange).toHaveBeenCalledWith('templateDurationMinutes', 95);
    expect(props.onFieldChange).toHaveBeenCalledWith('templateQuestionCount', 60);
    expect(props.onFieldChange).toHaveBeenCalledWith('templateNotes', templateNotes);
  });

  it('infers the active popular template from current form values', () => {
    render(
      <WorkspaceProfileStepTwo
        {...createProps({
          values: {
            mockExamName: 'JLPT N4',
            templateNotes,
            templateDurationMinutes: 95,
            templateQuestionCount: 60,
          },
        })}
      />
    );

    openMockTestConfig();

    expect(screen.getByText('Đang áp dụng: JLPT N4 Standard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đang dùng template này' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('humanizes learning mode enums in the AI overall review summary', () => {
    render(
      <WorkspaceProfileStepTwo
        {...createProps({
          values: {
            workspacePurpose: 'STUDY_NEW',
            currentLevel: 'Mới bắt đầu học tiếng Nhật',
          },
          consistencyStatus: 'success',
          consistencyResult: {
            isConsistent: true,
            message: 'Thông tin đang khớp tốt với hồ sơ học tập hiện tại.',
            alignmentHighlights: [
              'Chế độ học STUDY_NEW phù hợp khi chưa có điểm mạnh và điểm yếu rõ ràng.',
            ],
            issues: [],
            recommendations: [],
          },
        })}
      />
    );

    expect(
      screen.getByText((content) =>
        content.includes('Chế độ học mới phù hợp khi chưa có điểm mạnh và điểm yếu rõ ràng.')
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Chế độ học STUDY_NEW/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Chế độ học Học mới/)).not.toBeInTheDocument();
  });
});
