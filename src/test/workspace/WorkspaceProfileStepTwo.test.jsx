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
    expect(screen.getByText('Bạn vẫn có thể đặt mục tiêu học tập ngay từ đầu')).toBeInTheDocument();
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
});
