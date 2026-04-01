import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import RoadmapCanvasView2 from '@/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView2';

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
});
