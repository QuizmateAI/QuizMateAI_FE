import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import ChatPanel from '@/Pages/Users/Group/Components/ChatPanel';

const roadmapCanvasSpy = vi.fn();

vi.mock('@/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView', () => ({
  default: (props) => {
    roadmapCanvasSpy(props);
    return <div data-testid="group-roadmap-canvas-view">Roadmap canvas mock</div>;
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
});
