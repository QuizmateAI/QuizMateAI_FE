import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, { i18nReady, preloadNamespaces } from '@/i18n';
import WorkspaceProfileStepTwo from '@/pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/WorkspaceProfileStepTwo';

function createProps(overrides = {}) {
  const { values: valueOverrides = {}, ...restOverrides } = overrides;

  return {
    t: (key, options) => i18n.t(key, options),
    isDarkMode: false,
    values: {
      workspacePurpose: 'STUDY_NEW',
      currentLevel: '',
      learningGoal: '',
      strongAreas: '',
      weakAreas: '',
      ...valueOverrides,
    },
    errors: {},
    templateStatus: 'idle',
    templatePreview: null,
    fieldSuggestions: {},
    fieldSuggestionStatus: 'success',
    consistencyResult: null,
    consistencyStatus: 'idle',
    disabled: false,
    onFieldChange: vi.fn(),
    onGenerateTemplate: vi.fn(),
    onApplySuggestion: vi.fn(),
    ...restOverrides,
  };
}

describe('WorkspaceProfileStepTwo', () => {
  beforeEach(async () => {
    window.localStorage.setItem('app_language', 'vi');
    await i18nReady;
    await preloadNamespaces(['common', 'workspace'], 'vi');
    await i18n.changeLanguage('vi');
  });

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
    // Beginner-specific learning-goal suggestions still appear directly (no longer gated by an
    // encouragement notice — current level alone unlocks the goal chips).
    expect(screen.getByText('Nắm hiragana, katakana và từ vựng cơ bản trước khi lên mục tiêu cao hơn.')).toBeInTheDocument();
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

  it('prompts to fill current level (no longer strengths/weaknesses) when learning goal lacks context', () => {
    render(
      <WorkspaceProfileStepTwo
        {...createProps({
          values: {
            workspacePurpose: 'REVIEW',
            knowledgeInput: 'Toán 1',
            inferredDomain: 'Mathematics',
            currentLevel: '',
            learningGoal: '',
            strongAreas: '',
            weakAreas: '',
          },
          fieldSuggestions: {
            learningGoalSuggestions: ['Ôn lại phần dễ sai trước kỳ kiểm tra'],
          },
        })}
      />
    );

    expect(
      screen.getByText('Điền trình độ hiện tại để Quizmate AI gợi ý mục tiêu')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Bổ sung điểm mạnh và điểm yếu để Quizmate AI gợi ý mục tiêu/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Ôn lại phần dễ sai trước kỳ kiểm tra')
    ).not.toBeInTheDocument();
  });

  it('shows AI learning-goal suggestions as soon as current level is filled even when strengths/weaknesses are empty', () => {
    render(
      <WorkspaceProfileStepTwo
        {...createProps({
          values: {
            workspacePurpose: 'REVIEW',
            knowledgeInput: 'Toán 1',
            inferredDomain: 'Mathematics',
            currentLevel: 'Đã học giải tích cơ bản, vững phần đạo hàm',
            learningGoal: '',
            strongAreas: '',
            weakAreas: '',
          },
          fieldSuggestions: {
            learningGoalSuggestions: ['Ôn lại phần tích phân từng phần'],
          },
        })}
      />
    );

    expect(
      screen.queryByText('Điền trình độ hiện tại để Quizmate AI gợi ý mục tiêu')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Bổ sung điểm mạnh và điểm yếu/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText('Ôn lại phần tích phân từng phần')).toBeInTheDocument();
  });

  it('renders legitimate field-suggestion warnings (e.g. red flag in user-provided fields)', () => {
    // Per the BE field-suggestion prompt's Validation Contract, `warning=true` is now
    // reserved for genuine issues with the user's step-2 fields (off-topic currentLevel,
    // profanity, contradictions) — NOT for asking the user to refine knowledge.
    render(
      <WorkspaceProfileStepTwo
        {...createProps({
          values: {
            workspacePurpose: 'REVIEW',
            knowledgeInput: 'Toán 1',
            inferredDomain: 'Mathematics',
            currentLevel: 'tôi thích nấu ăn',
            learningGoal: '',
            strongAreas: '',
            weakAreas: '',
          },
          fieldSuggestions: {
            warning: true,
            message: 'Trình độ hiện tại bạn nhập không liên quan đến Toán 1.',
            warnings: ['"tôi thích nấu ăn" không phải trình độ học toán.'],
            learningGoalSuggestions: [],
          },
        })}
      />
    );

    expect(
      screen.getByText('Trình độ hiện tại bạn nhập không liên quan đến Toán 1.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/không phải trình độ học toán/i)
    ).toBeInTheDocument();
  });
});
