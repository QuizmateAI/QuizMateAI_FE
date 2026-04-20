import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateQuizForm from '@/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizFormContainer';
import {
  getDifficultyDefinitions,
  getBloomSkills,
  getQuestionTypes,
  previewAIQuizStructure,
} from '@/api/AIAPI';
import { getRoadmapsByWorkspace } from '@/api/RoadmapAPI';
import { getPendingRecommendations } from '@/api/QuizAPI';

const mockNavigate = vi.fn();
let mockLocationState = null;

vi.mock('@/Pages/Users/Individual/Workspace/Components/QuickCreateDialog', () => ({
  default: () => null,
}));

vi.mock('@/api/AIAPI', () => ({
  generateAIQuiz: vi.fn(),
  getQuestionTypes: vi.fn(),
  getDifficultyDefinitions: vi.fn(),
  getBloomSkills: vi.fn(),
  previewAIQuizStructure: vi.fn(),
}));

vi.mock('@/api/RoadmapAPI', () => ({
  getRoadmapsByWorkspace: vi.fn(),
  getPhasesByRoadmap: vi.fn(),
  getKnowledgesByPhase: vi.fn(),
  createRoadmapForWorkspace: vi.fn(),
  createPhase: vi.fn(),
  createKnowledge: vi.fn(),
}));

vi.mock('@/api/QuizAPI', () => ({
  createFullQuiz: vi.fn(),
  getPendingRecommendations: vi.fn(),
  generateQuizFromWorkspaceAssessment: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') {
        return fallbackOrOptions;
      }
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object' && typeof fallbackOrOptions.defaultValue === 'string') {
        return fallbackOrOptions.defaultValue;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/workspaces/42/quizzes/create',
      search: '',
      state: mockLocationState,
    }),
  };
});

describe('CreateQuizForm personalization preset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = null;

    getRoadmapsByWorkspace.mockResolvedValue({ data: [] });
    getPendingRecommendations.mockResolvedValue({ data: [] });
    getQuestionTypes.mockResolvedValue({
      data: [
        { questionTypeId: 1, questionType: 'SINGLE_CHOICE' },
        { questionTypeId: 2, questionType: 'TRUE_FALSE' },
      ],
    });
    getDifficultyDefinitions.mockResolvedValue({
      data: [
        { id: 1, difficultyName: 'EASY', easyRatio: 60, mediumRatio: 30, hardRatio: 10 },
        { id: 2, difficultyName: 'MEDIUM', easyRatio: 20, mediumRatio: 60, hardRatio: 20 },
      ],
    });
    getBloomSkills.mockResolvedValue({
      data: [
        { bloomId: 1, bloomName: 'Remember', description: 'Recall facts' },
      ],
    });
  });

  it('prefills the AI form from personalization route state and clears the state once applied', async () => {
    mockLocationState = {
      personalizationPreset: {
        quizIntent: 'REVIEW',
        focusTopics: ['Cohesion'],
        targetDifficulty: 'MEDIUM',
        questionCount: 12,
        reviewTopic: 'Cohesion',
      },
      personalizationTask: {
        type: 'REVIEW_QUEUE',
        title: 'Review Cohesion',
        reason: 'Revisit the topic that slipped in your last attempt.',
      },
    };

    render(
      <CreateQuizForm
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onBack={vi.fn()}
        contextId={42}
      />
    );

    expect(await screen.findByDisplayValue('Review Cohesion')).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue(/Create a concise review quiz focused on Cohesion\./i)
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue('12')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/workspaces/42/quizzes/create', {
        replace: true,
        state: null,
      });
    });
  });

  it('does not auto-prefill or mutate navigation state when no personalization preset is present', async () => {
    render(
      <CreateQuizForm
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onBack={vi.fn()}
        contextId={42}
      />
    );

    await waitFor(() => {
      expect(getDifficultyDefinitions).toHaveBeenCalled();
    });

    expect(screen.queryByDisplayValue('Review Cohesion')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides the AI recommendations panel when there are no recommendations', async () => {
    render(
      <CreateQuizForm
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onBack={vi.fn()}
        contextId={42}
      />
    );

    await waitFor(() => {
      expect(getPendingRecommendations).toHaveBeenCalledWith(42);
      expect(screen.queryByText('workspace.quiz.aiRecommendations.inlineTitle')).not.toBeInTheDocument();
      expect(screen.queryByText('workspace.quiz.aiRecommendations.empty')).not.toBeInTheDocument();
    });
  });

  it('locks quiz structure preview when the current plan lacks advanced quiz config', async () => {
    render(
      <CreateQuizForm
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onBack={vi.fn()}
        contextId={42}
        planEntitlements={{ hasAdvanceQuizConfig: false }}
      />
    );

    const structureButton = await screen.findByRole('button', {
      name: /Fetch detailed configuration/i,
    });

    expect(structureButton).toBeDisabled();
    fireEvent.click(structureButton);
    expect(previewAIQuizStructure).not.toHaveBeenCalled();
  });
});
