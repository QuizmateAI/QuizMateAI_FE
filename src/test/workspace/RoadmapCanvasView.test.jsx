import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RoadmapCanvasView from '@/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView';
import { getRoadmapGraph } from '@/api/RoadmapAPI';

const createRoadmapFormSpy = vi.fn();

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

vi.mock('@/Pages/Users/Individual/Workspace/Components/CreateRoadmapForm', () => ({
  default: (props) => {
    createRoadmapFormSpy(props);
    return (
      <div data-testid="create-roadmap-form">
        <button
          type="button"
          onClick={() =>
            props.onCreateRoadmap?.({
              mode: 'ai',
              name: 'My roadmap',
              goal: 'Master fractions',
              materialIds: props.selectedMaterialIds,
            })}
        >
          create-roadmap
        </button>
      </div>
    );
  },
}));

function createRoadmapGraph() {
  return {
    roadmapId: 88,
    title: 'Personal roadmap',
    description: 'A new roadmap',
    phases: [
      { phaseId: 1, phaseIndex: 0, title: 'Warm-up', description: 'Completed phase', status: 'COMPLETED', preLearningQuizzes: [], knowledges: [], postLearningQuizzes: [] },
      {
        phaseId: 2,
        phaseIndex: 1,
        title: 'Fractions',
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
      { phaseId: 3, phaseIndex: 2, title: 'Decimals', description: 'Next phase', status: 'PENDING', preLearningQuizzes: [], knowledges: [], postLearningQuizzes: [] },
      { phaseId: 4, phaseIndex: 3, title: 'Ratios', description: 'Locked phase', status: 'PENDING', preLearningQuizzes: [], knowledges: [], postLearningQuizzes: [] },
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
    createRoadmapFormSpy.mockClear();
    getRoadmapGraph.mockReset();
  });

  it('renders the empty roadmap setup state and forwards selected source ids into roadmap creation', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: null } });
    const onCreateRoadmap = vi.fn().mockResolvedValue(undefined);

    renderRoadmap(
      <RoadmapCanvasView workspaceId={321} selectedSourceIds={[7, 9]} onCreateRoadmap={onCreateRoadmap} />,
    );

    expect(await screen.findByText('Build the roadmap before generating outputs')).toBeInTheDocument();
    expect(screen.getByTestId('create-roadmap-form')).toBeInTheDocument();
    expect(createRoadmapFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({ selectedMaterialCount: 2, selectedMaterialIds: [7, 9] }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'create-roadmap' }));
    await waitFor(() => {
      expect(onCreateRoadmap).toHaveBeenCalledWith({
        mode: 'ai', name: 'My roadmap', goal: 'Master fractions', materialIds: [7, 9],
      });
    });
  });

  it('falls back to the setup state when the roadmap exists but has no phases yet', async () => {
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
    const onGenerateRoadmapPhases = vi.fn().mockResolvedValue(undefined);

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
        onGenerateRoadmapPhases={onGenerateRoadmapPhases}
      />,
    );

    expect(await screen.findByText('Tài liệu sử dụng')).toBeInTheDocument();
    expect(screen.getByText('Cấu hình roadmap hiện tại')).toBeInTheDocument();
    expect(screen.getByText('Lượng kiến thức cần học')).toBeInTheDocument();
    expect(screen.getByText('Tốc độ lộ trình')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Generate roadmap|Tạo roadmap/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('create-roadmap-form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zoom out' })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Generate roadmap|Tạo roadmap/i }),
    );
    await waitFor(() => {
      expect(onGenerateRoadmapPhases).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the fishbone layout with all phase cards visible on the wave', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: createRoadmapGraph() } });
    const onReloadRoadmap = vi.fn();
    const onEditRoadmapConfig = vi.fn();
    const onShareRoadmap = vi.fn();
    const onRoadmapPhaseFocus = vi.fn();

    renderRoadmap(
      <RoadmapCanvasView
        workspaceId={321}
        onReloadRoadmap={onReloadRoadmap}
        onEditRoadmapConfig={onEditRoadmapConfig}
        onShareRoadmap={onShareRoadmap}
        onRoadmapPhaseFocus={onRoadmapPhaseFocus}
      />,
    );

    expect(await screen.findByText('Personal roadmap')).toBeInTheDocument();

    // All phase titles visible as compact cards on the fishbone
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(screen.getByText('Fractions')).toBeInTheDocument();
    expect(screen.getByText('Decimals')).toBeInTheDocument();
    expect(screen.getByText('Ratios')).toBeInTheDocument();

    // Old 3 view mode buttons should NOT exist (fishbone only)
    expect(screen.queryByRole('button', { name: 'Signal Line' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Neon Path' })).not.toBeInTheDocument();

    // Header action buttons work
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: /Share/i }));

    await waitFor(() => {
      expect(onReloadRoadmap).toHaveBeenCalledTimes(1);
      expect(onEditRoadmapConfig).toHaveBeenCalledTimes(1);
      expect(onShareRoadmap).toHaveBeenCalledWith(expect.objectContaining({ roadmapId: 88 }));
    });
  });

  it('displays phase descriptions on the fishbone cards without requiring click', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: createRoadmapGraph() } });

    renderRoadmap(<RoadmapCanvasView workspaceId={321} />);

    expect(await screen.findByText('Completed phase')).toBeInTheDocument();
    expect(screen.getByText('Current active phase')).toBeInTheDocument();
    expect(screen.getByText('Next phase')).toBeInTheDocument();
    expect(screen.getByText('Locked phase')).toBeInTheDocument();
  });

  it('opens detail panel on phase click showing knowledge and pre/post-learning sections', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: createRoadmapGraph() } });
    const onRoadmapPhaseFocus = vi.fn();

    renderRoadmap(
      <RoadmapCanvasView workspaceId={321} onRoadmapPhaseFocus={onRoadmapPhaseFocus} />,
    );

    await screen.findByText('Personal roadmap');

    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Phase 2: Fractions' }));

    await waitFor(() => {
      expect(screen.getByText('Equivalent fractions')).toBeInTheDocument();
    });

    // Detail panel should show knowledge content
    const detailArticle = screen.getByRole('article');
    expect(detailArticle).toHaveAttribute('aria-expanded', 'true');
    expect(detailArticle).toHaveAttribute('data-phase-index');
  });

  it('keeps locked phases disabled and ignores clicks on them', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: createRoadmapGraph() } });
    const onRoadmapPhaseFocus = vi.fn();

    renderRoadmap(
      <RoadmapCanvasView workspaceId={321} onRoadmapPhaseFocus={onRoadmapPhaseFocus} />,
    );

    await screen.findByText('Personal roadmap');
    const lockedPhaseCard = screen.getByRole('button', { name: 'Phase 4: Ratios' });

    expect(lockedPhaseCard).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText('Equivalent fractions')).not.toBeInTheDocument();

    fireEvent.click(lockedPhaseCard);

    expect(onRoadmapPhaseFocus).not.toHaveBeenCalledWith(4);
    expect(screen.queryByText('Equivalent fractions')).not.toBeInTheDocument();
  });

  it('keeps quiz callbacks wired through the detail panel', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: createRoadmapGraph() } });
    const onViewQuiz = vi.fn();
    const onEditQuiz = vi.fn();
    const onShareQuiz = vi.fn();
    const onCreatePhasePreLearning = vi.fn();

    renderRoadmap(
      <RoadmapCanvasView
        workspaceId={321}
        isStudyNewRoadmap={true}
        onViewQuiz={onViewQuiz}
        onEditQuiz={onEditQuiz}
        onShareQuiz={onShareQuiz}
        onCreatePhasePreLearning={onCreatePhasePreLearning}
      />,
    );

    await screen.findByText('Personal roadmap');
    fireEvent.click(screen.getByRole('button', { name: 'Phase 2: Fractions' }));

    await waitFor(() => {
      expect(screen.getByText('Equivalent fractions')).toBeInTheDocument();
    });

    // Quiz actions inside detail panel
    fireEvent.click(screen.getByRole('button', { name: 'Open quiz' }));
    expect(onViewQuiz).toHaveBeenCalledWith(
      { quizId: 55, title: 'Equivalent fractions quiz' },
      { backTarget: { view: 'roadmap', roadmapId: 88, phaseId: 2 } },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit quiz' }));
    expect(onEditQuiz).toHaveBeenCalledWith(
      { quizId: 55, title: 'Equivalent fractions quiz' },
      { backTarget: { view: 'roadmap', roadmapId: 88, phaseId: 2 } },
    );

    // Pre-learning generate
    const detailPanel = screen.getByRole('article');
    const preLearningSection = detailPanel.querySelectorAll('section')[0];
    const generateBtn = preLearningSection.querySelector('button');
    fireEvent.click(generateBtn);
    expect(onCreatePhasePreLearning).toHaveBeenCalledWith(2);
  });

  it('renders SVG wave and legend with status indicators', async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: createRoadmapGraph() } });

    renderRoadmap(<RoadmapCanvasView workspaceId={321} />);
    await screen.findByText('Personal roadmap');

    // Phase legend should be visible
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();

    // Scroll arrows should exist
    expect(screen.getByRole('button', { name: 'Scroll left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scroll right' })).toBeInTheDocument();
  });

  it('limits knowledge display to 3 in default view mode within detail panel', async () => {
    const graphWithManyKnowledges = createRoadmapGraph();
    graphWithManyKnowledges.phases[1].knowledges = Array.from({ length: 6 }, (_, i) => ({
      knowledgeId: 900 + i,
      title: `Knowledge ${i + 1}`,
      description: `Description ${i + 1}`,
      flashcards: [],
      quizzes: [],
    }));
    getRoadmapGraph.mockResolvedValue({ data: { data: graphWithManyKnowledges } });

    renderRoadmap(<RoadmapCanvasView workspaceId={321} />);
    await screen.findByText('Personal roadmap');
    fireEvent.click(screen.getByRole('button', { name: 'Phase 2: Fractions' }));

    await waitFor(() => {
      expect(screen.getByText('Knowledge 1')).toBeInTheDocument();
    });

    // Only 3 knowledge items should be visible initially
    expect(screen.getByText('Knowledge 1')).toBeInTheDocument();
    expect(screen.getByText('Knowledge 2')).toBeInTheDocument();
    expect(screen.getByText('Knowledge 3')).toBeInTheDocument();
    expect(screen.queryByText('Knowledge 4')).not.toBeInTheDocument();

    // "View all" button should be present, and count indicator
    expect(screen.getByText('View all →')).toBeInTheDocument();
    expect(screen.getByText('(3 of 6)')).toBeInTheDocument();
  });

  it('shows all knowledge items when view all mode is toggled', async () => {
    const graphWithManyKnowledges = createRoadmapGraph();
    graphWithManyKnowledges.phases[1].knowledges = Array.from({ length: 5 }, (_, i) => ({
      knowledgeId: 900 + i,
      title: `Knowledge ${i + 1}`,
      description: `Description ${i + 1}`,
      flashcards: [],
      quizzes: [],
    }));
    getRoadmapGraph.mockResolvedValue({ data: { data: graphWithManyKnowledges } });

    renderRoadmap(<RoadmapCanvasView workspaceId={321} />);
    await screen.findByText('Personal roadmap');
    fireEvent.click(screen.getByRole('button', { name: 'Phase 2: Fractions' }));

    await waitFor(() => {
      expect(screen.getByText('Knowledge 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View all →'));

    expect(screen.getByText('Knowledge 1')).toBeInTheDocument();
    expect(screen.getByText('Knowledge 5')).toBeInTheDocument();
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });
});
