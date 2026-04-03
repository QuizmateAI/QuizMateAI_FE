import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import ChatPanel from '@/Pages/Users/Individual/Workspace/Components/ChatPanel';

const roadmapCanvasSpy = vi.fn();
const postLearningListSpy = vi.fn();
const createPostLearningFormSpy = vi.fn();

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
    sources: [],
    activeView: null,
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
    onCreateRoadmapPhases: vi.fn(),
    onRoadmapPhaseFocus: vi.fn(),
    onCreatePhaseKnowledge: vi.fn(),
    onCreateKnowledgeQuizForKnowledge: vi.fn(),
    onCreatePhasePreLearning: vi.fn(),
    onReloadRoadmap: vi.fn(),
    onShareQuiz: vi.fn(),
    onShareRoadmap: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<ChatPanel {...props} />),
    props,
  };
}

describe('Workspace ChatPanel', () => {
  beforeEach(async () => {
    roadmapCanvasSpy.mockClear();
    postLearningListSpy.mockClear();
    createPostLearningFormSpy.mockClear();
    window.localStorage.clear();
    window.localStorage.setItem('app_language', 'en');
    await i18n.changeLanguage('en');
  });

  it('passes roadmap refactor props into the roadmap canvas view', async () => {
    renderChatPanel({
      activeView: 'roadmap',
      adaptationMode: 'PERSONALIZED',
      selectedRoadmapPhaseId: 15,
      isGeneratingRoadmapPhases: true,
      roadmapPhaseGenerationProgress: 66,
    });

    expect(await screen.findByTestId('roadmap-canvas-view')).toBeInTheDocument();
    expect(roadmapCanvasSpy).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 321,
      adaptationMode: 'PERSONALIZED',
      selectedPhaseId: 15,
      isGeneratingRoadmapPhases: true,
      roadmapPhaseGenerationProgress: 66,
    }));
  });

  it('keeps the post-learning list flow wired to create and view actions', async () => {
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
