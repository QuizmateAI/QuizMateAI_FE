import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPanel from '@/pages/Users/Individual/Workspace/Components/ChatPanel';

const ROADMAP_GUIDE_SEEN_STORAGE_KEY = 'quizmate_roadmap_guide_seen_v1';

const overviewSpy = vi.fn();
const sourcesSpy = vi.fn();
const roadmapCanvasSpy = vi.fn();
const postLearningListSpy = vi.fn();
const createPostLearningFormSpy = vi.fn();

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

vi.mock('@/pages/Users/Individual/Workspace/Components/WorkspaceOverviewView', () => ({
  default: (props) => {
    overviewSpy(props);
    return (
      <div data-testid="overview-view">
        <button type="button" onClick={() => props.onNavigate?.('sources')}>
          go-to-sources
        </button>
      </div>
    );
  },
}));

vi.mock('@/pages/Users/Individual/Workspace/Components/SourcesPanel', () => ({
  default: (props) => {
    sourcesSpy(props);
    return (
      <div data-testid="sources-view">
        <button type="button" onClick={() => props.onSelectionChange?.([1, 5])}>
          select-sources
        </button>
      </div>
    );
  },
}));

vi.mock('@/pages/Users/Individual/Workspace/Components/CreateQuizForm', () => ({
  default: () => <div data-testid="create-quiz-form" />,
}));

function MockRoadmapCanvasView(props) {
  roadmapCanvasSpy(props);
  React.useEffect(() => {
    props.onRoadmapMetaChange?.({
      roadmapId: 88,
      title: 'Roadmap - Workspace 6',
      description: 'Tong hop noi dung roadmap hien tai.',
      phaseCount: 3,
      knowledgeCount: 12,
      quizCount: 4,
    });
  }, []);

  return <div data-testid="roadmap-canvas-view">Roadmap canvas mock</div>;
}

vi.mock('@/pages/Users/Individual/Workspace/Components/RoadmapCanvasView', () => ({
  default: MockRoadmapCanvasView,
}));

vi.mock('@/pages/Users/Individual/Workspace/Components/PostLearningListView', () => ({
  default: (props) => {
    postLearningListSpy(props);
    return (
      <div data-testid="post-learning-list-view">
        <button type="button" onClick={() => props.onCreatePostLearning?.()}>
          open-create-post-learning
        </button>
        <button
          type="button"
          onClick={() => props.onViewPostLearning?.({ quizId: 42, title: 'Phase Post-learning' })}
        >
          open-post-learning-detail
        </button>
      </div>
    );
  },
}));

vi.mock('@/pages/Users/Individual/Workspace/Components/CreatePostLearningForm', () => ({
  default: (props) => {
    createPostLearningFormSpy(props);
    return (
      <div data-testid="create-post-learning-form">
        <button type="button" onClick={() => props.onCreatePostLearning?.({ quizId: 99, title: 'Generated Post-learning' })}>
          submit-post-learning
        </button>
        <button type="button" onClick={() => props.onBack?.()}>
          back-from-post-learning
        </button>
      </div>
    );
  },
}));

function renderChatPanel(overrides = {}) {
  const props = {
    workspaceId: 321,
    isDarkMode: false,
    sources: [
      { id: 1, name: 'math.pdf', status: 'ACTIVE' },
      { id: 5, name: 'logic.pdf', status: 'ACTIVE' },
    ],
    accessHistory: [{ actionKey: 'overview' }],
    activeView: null,
    workspaceTitle: 'Workspace A',
    workspacePurpose: 'STUDY_NEW',
    selectedSourceIds: [1],
    selectedRoadmapPhaseId: 15,
    onUploadClick: vi.fn(),
    onChangeView: vi.fn(),
    onCreateQuiz: vi.fn(),
    onCreateFlashcard: vi.fn(),
    onCreateRoadmap: vi.fn(),
    onCreateMockTest: vi.fn(),
    onCreatePostLearning: vi.fn(),
    onBack: vi.fn(),
    onViewQuiz: vi.fn(),
    onEditQuiz: vi.fn(),
    onSaveQuiz: vi.fn(),
    onViewFlashcard: vi.fn(),
    onDeleteFlashcard: vi.fn(),
    onViewMockTest: vi.fn(),
    onEditMockTest: vi.fn(),
    onSaveMockTest: vi.fn(),
    onViewPostLearning: vi.fn(),
    onRoadmapPhaseFocus: vi.fn(),
    onCreatePhaseKnowledge: vi.fn(),
    onCreateKnowledgeQuizForKnowledge: vi.fn(),
    onCreatePhasePreLearning: vi.fn(),
    onReloadRoadmap: vi.fn(),
    onShareQuiz: vi.fn(),
    onShareRoadmap: vi.fn(),
    onEditRoadmapConfig: vi.fn(),
    onAddSource: vi.fn(),
    onRemoveSource: vi.fn(),
    onRemoveMultiple: vi.fn(),
    onSourceUpdated: vi.fn(),
    onSelectedSourceIdsChange: vi.fn(),
    shouldDisableRoadmap: false,
    shouldDisableQuiz: false,
    shouldDisableFlashcard: false,
    roadmapHasPhases: true,
    completedQuizCount: 2,
    ...overrides,
  };

  return {
    ...render(<ChatPanel {...props} />),
    props,
  };
}

describe('Workspace ChatPanel', () => {
  beforeEach(() => {
    overviewSpy.mockClear();
    sourcesSpy.mockClear();
    roadmapCanvasSpy.mockClear();
    postLearningListSpy.mockClear();
    createPostLearningFormSpy.mockClear();
    window.localStorage.clear();
  });

  it('renders the welcome panel for the overview shell entry', async () => {
    renderChatPanel({
      activeView: 'overview',
      selectedSourceIds: [1, 5],
    });

    expect(await screen.findByRole('heading', { name: 'Không Gian Học Tập Đỉnh Cao' })).toBeInTheDocument();
    expect(screen.getByText(/Mở ra chân trời tri thức/i)).toBeInTheDocument();
  });

  it('routes the dedicated sources view through the new source hub props', async () => {
    const onSelectedSourceIdsChange = vi.fn();

    renderChatPanel({
      activeView: 'sources',
      onSelectedSourceIdsChange,
      selectedSourceIds: [1],
    });

    expect(await screen.findByTestId('sources-view')).toBeInTheDocument();
    expect(sourcesSpy).toHaveBeenCalledWith(expect.objectContaining({
      selectedIds: [1],
      sources: expect.arrayContaining([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 5 }),
      ]),
    }));

    fireEvent.click(screen.getByRole('button', { name: 'select-sources' }));
    expect(onSelectedSourceIdsChange).toHaveBeenCalledWith([1, 5]);
  });

  it('passes single-fishbone roadmap props into the roadmap canvas view', async () => {
    renderChatPanel({
      activeView: 'roadmap',
      adaptationMode: 'PERSONALIZED',
      isGeneratingRoadmapPhases: true,
      roadmapPhaseGenerationProgress: 66,
      shouldDisableRoadmap: true,
      roadmapHasPhases: false,
      selectedSourceIds: [1, 5],
      selectedRoadmapPhaseId: null,
    });

    expect(await screen.findByTestId('roadmap-canvas-view')).toBeInTheDocument();
    expect(roadmapCanvasSpy).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 321,
      adaptationMode: 'PERSONALIZED',
      forcedCanvasView: 'view2',
      isGeneratingRoadmapPhases: true,
      roadmapPhaseGenerationProgress: 66,
      disableCreate: true,
    }));
    expect(screen.getByText('Chi tiết')).toBeInTheDocument();
    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
  });

  it('shows the roadmap summary dropdown under the roadmap title', async () => {
    window.localStorage.setItem('quizmate_roadmap_guide_seen_v2', 'true');

    renderChatPanel({
      activeView: 'roadmap',
      selectedRoadmapPhaseId: null,
      selectedRoadmapKnowledgeId: null,
    });

    expect(await screen.findByRole('heading', { name: 'Lộ trình' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tổng quan' }));
    const summaryTriggerButton = await screen.findByRole('button', {
      name: /roadmap content|nội dung roadmap|nội dung lộ trình|roadmap summary/i,
    });
    expect(summaryTriggerButton).toBeInTheDocument();

    fireEvent.pointerDown(summaryTriggerButton);

    expect(await screen.findByText('Tong hop noi dung roadmap hien tai.')).toBeInTheDocument();
    expect(screen.getAllByText('Roadmap - Workspace 6').length).toBeGreaterThan(1);
  });

  it('keeps detail canvas when re-entering roadmap with a phase or knowledge selected', async () => {
    const { rerender, props } = renderChatPanel({
      activeView: 'quizDetail',
      selectedRoadmapPhaseId: 15,
      selectedRoadmapKnowledgeId: 901,
    });

    roadmapCanvasSpy.mockClear();

    rerender(
      <ChatPanel
        {...props}
        activeView="roadmap"
        selectedRoadmapPhaseId={15}
        selectedRoadmapKnowledgeId={901}
      />,
    );

    expect(await screen.findByTestId('roadmap-canvas-view')).toBeInTheDocument();
    expect(roadmapCanvasSpy).toHaveBeenCalledWith(expect.objectContaining({
      forcedCanvasView: 'view2',
      selectedPhaseId: 15,
      selectedKnowledgeId: 901,
    }));
  });

  it('auto opens the roadmap guide once and keeps a manual trigger in the header', async () => {
    const firstRender = renderChatPanel({
      activeView: 'roadmap',
    });

    expect(await screen.findByRole('heading', { name: /how to use roadmap/i })).toBeInTheDocument();
    expect(screen.getByText(/roadmap summary dropdown/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByRole('heading', { name: /choose a phase from overview/i, level: 3 })).toBeInTheDocument();

    firstRender.unmount();
    window.localStorage.setItem('quizmate_roadmap_guide_seen_v2', 'true');

    renderChatPanel({
      activeView: 'roadmap',
    });

    expect(screen.queryByRole('heading', { name: /how to use roadmap/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /roadmap guide/i }));
    expect(await screen.findByRole('heading', { name: /how to use roadmap/i })).toBeInTheDocument();
  });

  it('keeps the post-learning list flow wired to create and detail callbacks', async () => {
    const onChangeView = vi.fn();
    const onViewPostLearning = vi.fn();

    renderChatPanel({
      activeView: 'postLearning',
      onChangeView,
      onViewPostLearning,
    });

    expect(await screen.findByTestId('post-learning-list-view')).toBeInTheDocument();
    expect(postLearningListSpy).toHaveBeenCalledWith(expect.objectContaining({
      contextType: 'WORKSPACE',
      contextId: 321,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'open-create-post-learning' }));
    expect(onChangeView).toHaveBeenCalledWith('createPostLearning');

    fireEvent.click(screen.getByRole('button', { name: 'open-post-learning-detail' }));
    expect(onViewPostLearning).toHaveBeenCalledWith({ quizId: 42, title: 'Phase Post-learning' });
  });

  it('keeps the create post-learning form wired to submit and back callbacks', async () => {
    const onCreatePostLearning = vi.fn();
    const onBack = vi.fn();

    renderChatPanel({
      activeView: 'createPostLearning',
      onCreatePostLearning,
      onBack,
    });

    expect(await screen.findByTestId('create-post-learning-form')).toBeInTheDocument();
    expect(createPostLearningFormSpy).toHaveBeenCalledWith(expect.objectContaining({
      contextType: 'WORKSPACE',
      contextId: 321,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'submit-post-learning' }));
    expect(onCreatePostLearning).toHaveBeenCalledWith({ quizId: 99, title: 'Generated Post-learning' });

    fireEvent.click(screen.getByRole('button', { name: 'back-from-post-learning' }));
    expect(onBack).toHaveBeenCalled();
  });
});
