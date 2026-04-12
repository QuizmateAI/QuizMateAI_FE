import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPanel from '@/Pages/Users/Individual/Workspace/Components/ChatPanel';

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

vi.mock('@/Pages/Users/Individual/Workspace/Components/WorkspaceOverviewView', () => ({
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

vi.mock('@/Pages/Users/Individual/Workspace/Components/SourcesPanel', () => ({
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

vi.mock('@/Pages/Users/Individual/Workspace/Components/CreateQuizForm', () => ({
  default: () => <div data-testid="create-quiz-form" />,
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView', () => ({
  default: (props) => {
    roadmapCanvasSpy(props);
    return <div data-testid="roadmap-canvas-view">Roadmap canvas mock</div>;
  },
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/PostLearningListView', () => ({
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

vi.mock('@/Pages/Users/Individual/Workspace/Components/CreatePostLearningForm', () => ({
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
  });

  it('renders overview by default and keeps quick navigation wired to the shell', async () => {
    const onChangeView = vi.fn();

    renderChatPanel({
      activeView: null,
      onChangeView,
      selectedSourceIds: [1, 5],
    });

    expect(await screen.findByTestId('overview-view')).toBeInTheDocument();
    expect(overviewSpy).toHaveBeenCalledWith(expect.objectContaining({
      workspaceTitle: 'Workspace A',
      workspacePurpose: 'STUDY_NEW',
      selectedSourceIds: [1, 5],
      roadmapHasPhases: true,
      completedQuizCount: 2,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'go-to-sources' }));
    expect(onChangeView).toHaveBeenCalledWith('sources');
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
      selectedRoadmapPhaseId: 15,
      isGeneratingRoadmapPhases: true,
      roadmapPhaseGenerationProgress: 66,
      shouldDisableRoadmap: true,
      roadmapHasPhases: false,
      selectedSourceIds: [1, 5],
    });

    expect(await screen.findByTestId('roadmap-canvas-view')).toBeInTheDocument();
    expect(roadmapCanvasSpy).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 321,
      adaptationMode: 'PERSONALIZED',
      selectedPhaseId: 15,
      isGeneratingRoadmapPhases: true,
      roadmapPhaseGenerationProgress: 66,
      selectedSourceIds: [1, 5],
      disableCreate: true,
    }));
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
