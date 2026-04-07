import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import RoadmapCanvasView2 from '@/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView2';

const getCurrentRoadmapKnowledgeProgressMock = vi.fn();

vi.mock('@/api/RoadmapAPI', () => ({
  getCurrentRoadmapKnowledgeProgress: (...args) => getCurrentRoadmapKnowledgeProgressMock(...args),
}));

vi.mock('@/api/RoadmapPhaseAPI', () => ({
  createPhaseProgressReview: vi.fn(),
  getCurrentRoadmapPhaseProgress: vi.fn().mockResolvedValue({ data: null }),
  getPhaseProgressReview: vi.fn().mockResolvedValue({ data: null }),
  submitRoadmapPhaseRemedialDecision: vi.fn(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

function createRoadmap(overrides = {}) {
  return {
    workspaceId: 99,
    roadmapId: 77,
    title: 'Roadmap',
    description: 'Roadmap description',
    phases: [
      {
        phaseId: 1,
        phaseIndex: 0,
        title: 'Nhan biet chu so',
        description: 'Mo ta phase',
        status: 'PROCESSING',
        estimatedDays: 2,
        estimatedMinutesPerDay: 25,
        durationLabel: '2 ngay • 25 phut/ngay',
        preLearningQuizzes: [],
        knowledges: [],
        postLearningQuizzes: [],
      },
    ],
    ...overrides,
  };
}

describe('RoadmapCanvasView2', () => {
  beforeEach(() => {
    getCurrentRoadmapKnowledgeProgressMock.mockReset();
    getCurrentRoadmapKnowledgeProgressMock.mockResolvedValue({ data: null });
    window.localStorage.setItem('app_language', 'en');
    i18n.changeLanguage('en');
  });

  it('does not show or regenerate pre-learning UI when the phase was marked as new to this phase', () => {
    render(
      <RoadmapCanvasView2
        roadmap={createRoadmap()}
        isStudyNewRoadmap
        skipPreLearningPhaseIds={[1]}
        generatingKnowledgePhaseIds={[1]}
        generatingPreLearningPhaseIds={[1]}
      />
    );

    expect(screen.getByText(/generating knowledge|please wait while ai generates knowledge for this phase/i)).toBeInTheDocument();
    expect(screen.queryByText(/how would you like to start this phase/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ai is generating pre-learning for this phase/i)).not.toBeInTheDocument();
  });

  it('hides pre-learning placeholder when direct knowledge generation is running', () => {
    render(
      <RoadmapCanvasView2
        roadmap={createRoadmap()}
        isStudyNewRoadmap
        generatingKnowledgePhaseIds={[1]}
        generatingPreLearningPhaseIds={[1]}
      />
    );

    expect(screen.getByText(/generating knowledge|please wait while ai generates knowledge for this phase/i)).toBeInTheDocument();
    expect(screen.queryByText(/ai is generating pre-learning for this phase/i)).not.toBeInTheDocument();
  });

  it('keeps locked knowledge row expandable', async () => {
    getCurrentRoadmapKnowledgeProgressMock.mockResolvedValue({
      data: {
        phaseId: 1,
        knowledgeId: 1,
        status: 'IN_PROGRESS',
      },
    });

    render(
      <RoadmapCanvasView2
        roadmap={createRoadmap({
          phases: [
            {
              phaseId: 1,
              phaseIndex: 0,
              title: 'Phase 1',
              status: 'ACTIVE',
              preLearningQuizzes: [],
              postLearningQuizzes: [],
              knowledges: [
                { knowledgeId: 1, title: 'K1', quizzes: [], flashcards: [] },
                { knowledgeId: 2, title: 'K2', quizzes: [], flashcards: [] },
              ],
            },
          ],
        })}
      />
    );

    const lockedKnowledgeButton = await screen.findByRole('button', { name: /k2/i });
    expect(lockedKnowledgeButton).not.toBeDisabled();
    expect(screen.queryByText(/please complete the previous knowledge first/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getCurrentRoadmapKnowledgeProgressMock).toHaveBeenCalled();
    });

    fireEvent.click(lockedKnowledgeButton);
    expect(await screen.findByRole('button', { name: /k2/i })).toBeInTheDocument();
  });
});
