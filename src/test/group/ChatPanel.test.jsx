import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import ChatPanel from '@/Pages/Users/Group/Components/ChatPanel';
import { ROADMAP_GUIDE_SEEN_STORAGE_KEY } from '@/Components/workspace/RoadmapGuideButton';

const roadmapCanvasSpy = vi.fn();
const quizListSpy = vi.fn();

function MockGroupRoadmapCanvasView(props) {
  React.useEffect(() => {
    props.onRoadmapMetaChange?.({
      roadmapId: 412,
      title: 'Group Analytics Sprint',
      description: 'A focused roadmap for the current group workspace.',
      phaseCount: 4,
    });
  }, [props.onRoadmapMetaChange]);

  roadmapCanvasSpy(props);
  return <div data-testid="group-roadmap-canvas-view">Roadmap canvas mock</div>;
}

vi.mock('@/Pages/Users/Group/Components/RoadmapCanvasView', () => ({
  default: MockGroupRoadmapCanvasView,
}));

vi.mock('@/Pages/Users/Group/Components/QuizListView', () => ({
  default: (props) => {
    quizListSpy(props);
    return <div data-testid="group-quiz-list-view">Quiz list mock</div>;
  },
}));

function renderChatPanel(overrides = {}) {
  const props = {
    workspaceId: 987,
    isDarkMode: false,
    sources: [{ id: 1, name: 'Roadmap Source' }],
    activeView: 'roadmap',
    createdItems: [],
    onUploadClick: vi.fn(),
    onChangeView: vi.fn(),
    onCreateQuiz: vi.fn(),
    onCreateFlashcard: vi.fn(),
    onCreateRoadmap: vi.fn(),
    onCreateRoadmapPhases: vi.fn(),
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
    onViewRoadmapConfig: vi.fn(),
    onEditRoadmapConfig: vi.fn(),
    roadmapEmptyStateTitle: 'Thiết lập lộ trình cho nhóm',
    roadmapEmptyStateDescription: 'Thiết lập trước khi tạo phase.',
    roadmapEmptyStateActionLabel: 'Thiết lập lộ trình',
    ...overrides,
  };

  return render(<ChatPanel {...props} />);
}

describe('Group ChatPanel', () => {
  beforeEach(async () => {
    roadmapCanvasSpy.mockClear();
    quizListSpy.mockClear();
    window.localStorage.clear();
    window.localStorage.setItem('app_language', 'en');
    await i18n.changeLanguage('en');
  });

  it('passes roadmap reload token into the roadmap canvas view', async () => {
    renderChatPanel({ roadmapReloadToken: 4 });

    expect(await screen.findByTestId('group-roadmap-canvas-view')).toBeInTheDocument();
    expect(roadmapCanvasSpy).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 987,
      reloadToken: 4,
      onCreateRoadmapPhases: expect.any(Function),
      onViewRoadmapConfig: expect.any(Function),
      emptyStateTitle: 'Thiết lập lộ trình cho nhóm',
      emptyStateDescription: 'Thiết lập trước khi tạo phase.',
      emptyStateActionLabel: 'Thiết lập lộ trình',
    }));
  });

  it('passes quiz websocket progress props into the group quiz list', async () => {
    renderChatPanel({
      activeView: 'quiz',
      quizListRefreshToken: 9,
      quizGenerationTaskByQuizId: { 15: 'task-15' },
      quizGenerationProgressByQuizId: { 15: 42 },
    });

    expect(await screen.findByTestId('group-quiz-list-view')).toBeInTheDocument();
    expect(quizListSpy).toHaveBeenCalledWith(expect.objectContaining({
      contextType: 'GROUP',
      contextId: 987,
      refreshToken: 9,
      quizGenerationTaskByQuizId: { 15: 'task-15' },
      quizGenerationProgressByQuizId: { 15: 42 },
    }));
  });

  it('auto opens the roadmap guide once and keeps it available from the roadmap header', async () => {
    const firstRender = renderChatPanel();

    expect(await screen.findByRole('heading', { name: /how to use roadmap/i })).toBeInTheDocument();
    expect(window.localStorage.getItem(ROADMAP_GUIDE_SEEN_STORAGE_KEY)).toBe('true');

    firstRender.unmount();

    renderChatPanel();

    expect(screen.queryByRole('heading', { name: /how to use roadmap/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /roadmap guide/i }));
    expect(await screen.findByRole('heading', { name: /how to use roadmap/i })).toBeInTheDocument();
  });
});
