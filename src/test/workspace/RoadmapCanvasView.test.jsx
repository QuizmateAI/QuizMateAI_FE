import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RoadmapCanvasView from '@/pages/Users/Individual/Workspace/Components/RoadmapCanvasView';
import { getRoadmapGraph } from '@/api/RoadmapAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions?.defaultValue) return fallbackOrOptions.defaultValue;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/api/RoadmapAPI', () => ({
  getRoadmapGraph: vi.fn(),
}));

function createRoadmapGraph() {
  return {
    roadmapId: 88,
    title: 'Personal roadmap',
    description: 'A new roadmap',
    phases: [
      {
        phaseId: 1,
        phaseIndex: 0,
        title: 'Warm-up',
        description: 'Current active phase',
        status: 'ACTIVE',
        preLearningQuizzes: [],
        knowledges: [
          {
            knowledgeId: 901,
            title: 'Equivalent fractions',
            description: 'Understand equivalent fractions',
            flashcards: [],
            quizzes: [{ quizId: 55, title: 'Equivalent fractions quiz' }],
          },
        ],
        postLearningQuizzes: [],
      },
      {
        phaseId: 2,
        phaseIndex: 1,
        title: 'Fractions',
        description: 'Next phase',
        status: 'PENDING',
        preLearningQuizzes: [],
        knowledges: [],
        postLearningQuizzes: [],
      },
      { phaseId: 3, phaseIndex: 2, title: 'Decimals', description: 'Locked phase', status: 'PENDING', preLearningQuizzes: [], knowledges: [], postLearningQuizzes: [] },
    ],
  };
}

function renderRoadmap(ui, initialEntry = '/workspaces/321') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RoadmapCanvasView', () => {
  beforeEach(() => {
    getRoadmapGraph.mockReset();
  });

  it('renders empty roadmap setup state and triggers create phases action', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: null } });
    const onCreateRoadmapPhases = vi.fn().mockResolvedValue(undefined);

    renderRoadmap(
      <RoadmapCanvasView workspaceId={321} selectedSourceIds={[7, 9]} onCreateRoadmapPhases={onCreateRoadmapPhases} />,
    );

    expect(await screen.findByText('Welcome to roadmap')).toBeInTheDocument();
    expect(screen.getByText('Generate phases with AI to start your learning roadmap from selected materials.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create phases' }));
    await waitFor(() => {
      expect(onCreateRoadmapPhases).toHaveBeenCalledTimes(1);
    });
  });

  it('falls back to setup state when roadmap exists but has no phases', async () => {
    getRoadmapGraph.mockResolvedValue({
      data: {
        data: {
          roadmapId: 88,
          title: 'Draft roadmap',
          description: 'No generated phases yet',
          phases: [],
        },
      },
    });
    const onCreateRoadmapPhases = vi.fn().mockResolvedValue(undefined);

    renderRoadmap(
      <RoadmapCanvasView
        workspaceId={321}
        selectedSourceIds={[7]}
        activeSourceCount={3}
        roadmapConfigSummary={{
          knowledgeLoad: 'BASIC',
          adaptationMode: 'FLEXIBLE',
          roadmapSpeedMode: 'STANDARD',
          estimatedTotalDays: 14,
          recommendedMinutesPerDay: 45,
        }}
        onCreateRoadmapPhases={onCreateRoadmapPhases}
      />,
    );

    expect(await screen.findByText('Welcome to roadmap')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create phases' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create phases' }));
    await waitFor(() => {
      expect(onCreateRoadmapPhases).toHaveBeenCalledTimes(1);
    });
  });

  it('renders roadmap detail panel for active phase', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: createRoadmapGraph() } });

    renderRoadmap(<RoadmapCanvasView workspaceId={321} />);

    expect(await screen.findByText('Personal roadmap')).toBeInTheDocument();
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(screen.getByText('Current active phase')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Equivalent fractions')).toBeInTheDocument();
    });
  });

  it('renders knowledge quiz entry in detail panel', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: createRoadmapGraph() } });

    renderRoadmap(
      <RoadmapCanvasView
        workspaceId={321}
        isStudyNewRoadmap={true}
      />,
    );

    await screen.findByText('Personal roadmap');

    await waitFor(() => {
      expect(screen.getByText('Equivalent fractions')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Equivalent fractions' })).toBeInTheDocument();
  });
});
