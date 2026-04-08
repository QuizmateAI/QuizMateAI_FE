import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspacePage from '@/Pages/Users/Individual/Workspace/WorkspacePage';

const hoisted = vi.hoisted(() => {
  const mockNavigate = vi.fn();
  let mockLocation = {
    pathname: '/workspaces/42',
    search: '',
    state: {},
  };

  return {
    mockNavigate,
    setLocation: (next) => {
      mockLocation = next;
    },
    getLocation: () => mockLocation,
  };
});

const sourcesPanelSpy = vi.fn();
const studioPanelSpy = vi.fn();
const chatPanelSpy = vi.fn();

class ResizeObserverMock {
  static latest = null;

  constructor(callback) {
    this.callback = callback;
    ResizeObserverMock.latest = this;
  }

  observe() {}

  disconnect() {}

  trigger(width) {
    this.callback([{ contentRect: { width } }]);
  }
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ workspaceId: '42' }),
    useNavigate: () => hoisted.mockNavigate,
    useLocation: () => hoisted.getLocation(),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions?.defaultValue) return fallbackOrOptions.defaultValue;
      return key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({
    isDarkMode: false,
    toggleDarkMode: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      workspaceId: 42,
      title: 'Workspace A',
      description: 'Desc',
    },
    fetchWorkspaceDetail: vi.fn().mockResolvedValue(undefined),
    editWorkspace: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/hooks/useProgressTracking', () => ({
  useProgressTracking: () => ({
    reconcileMaterialProgress: vi.fn(),
    updateTaskProgress: vi.fn(),
    updateMaterialProgress: vi.fn(),
    updateKnowledgeProgress: vi.fn(),
    updatePreLearningProgress: vi.fn(),
    updatePostLearningProgress: vi.fn(),
    clearProgress: vi.fn(),
    getTaskProgress: vi.fn().mockReturnValue(0),
  }),
}));

vi.mock('@/hooks/usePlanEntitlements', () => ({
  usePlanEntitlements: () => ({
    hasWorkspaceAnalytics: true,
    canCreateRoadmap: true,
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('@/api/WorkspaceAPI', () => ({
  getIndividualWorkspaceProfile: vi.fn().mockResolvedValue({
    data: {
      data: {
        workspaceSetupStatus: 'DONE',
        onboardingCompleted: true,
        workspacePurpose: 'STUDY_NEW',
      },
    },
  }),
  getWorkspacePersonalization: vi.fn().mockResolvedValue({ data: null }),
  normalizeIndividualWorkspaceProfile: (payload) => payload,
  saveIndividualWorkspaceBasicStep: vi.fn(),
  saveIndividualWorkspacePersonalInfoStep: vi.fn(),
  saveIndividualWorkspaceRoadmapConfigStep: vi.fn(),
  startIndividualWorkspaceMockTestPersonalInfoStep: vi.fn(),
  confirmIndividualWorkspaceProfile: vi.fn(),
}));

vi.mock('@/api/RoadmapAPI', () => ({
  createRoadmapForWorkspace: vi.fn(),
  deleteRoadmapKnowledgeById: vi.fn(),
  deleteRoadmapPhaseById: vi.fn(),
  getRoadmapStructureById: vi.fn(),
  updateRoadmapConfig: vi.fn(),
}));

vi.mock('@/api/MaterialAPI', () => ({
  getMaterialsByWorkspace: vi.fn().mockResolvedValue([
    { materialId: 1, title: 'material.pdf', materialType: 'application/pdf', status: 'ACTIVE' },
  ]),
  deleteMaterial: vi.fn(),
  uploadMaterial: vi.fn(),
}));

vi.mock('@/api/QuizAPI', () => ({
  deleteQuiz: vi.fn(),
  getQuizzesByScope: vi.fn().mockResolvedValue({ data: [] }),
  shareQuizToCommunity: vi.fn(),
}));

vi.mock('@/api/FlashcardAPI', () => ({
  deleteFlashcardSet: vi.fn(),
  getFlashcardsByScope: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/Pages/Users/Individual/Workspace/hooks/useWorkspaceMockTestGeneration', () => ({
  useWorkspaceMockTestGeneration: () => ({
    mockTestGenerationState: 'idle',
    mockTestGenerationProgress: 0,
    mockTestGenerationDisplayMessage: '',
    mockTestGenerationDisplayLabel: '0%',
    isMockTestAwaitingBackend: false,
    isMockTestTakingLongerThanExpected: false,
    resetMockTestGenerationStatus: vi.fn(),
    readStoredMockTestGeneration: vi.fn().mockReturnValue(null),
    syncMockTestGenerationFromProfile: vi.fn().mockResolvedValue('idle'),
    beginMockTestGeneration: vi.fn(),
    checkMockTestGenerationStatusNow: vi.fn(),
  }),
}));

vi.mock('@/Pages/Users/Individual/Workspace/hooks/useWorkspaceRoadmapManager', () => ({
  useWorkspaceRoadmapManager: () => ({
    wsConnected: false,
    roadmapReloadToken: 0,
    bumpRoadmapReloadToken: vi.fn(),
    quizGenerationTaskByQuizId: {},
    quizGenerationProgressByQuizId: {},
    trackQuizGenerationStart: vi.fn(),
    phaseGenerateDialogOpen: false,
    setPhaseGenerateDialogOpen: vi.fn(),
    phaseGenerateDialogDefaultIds: [],
    isGeneratingRoadmapPhases: false,
    effectiveRoadmapPhaseGenerationProgress: 0,
    isSubmittingRoadmapPhaseRequest: false,
    generatingKnowledgePhaseIds: [],
    generatingKnowledgeQuizPhaseIds: [],
    generatingKnowledgeQuizKnowledgeKeys: [],
    knowledgeQuizRefreshByKey: {},
    generatingPreLearningPhaseIds: [],
    skipPreLearningPhaseIds: [],
    handleOpenRoadmapPhaseDialog: vi.fn(),
    handleSubmitRoadmapPhaseDialog: vi.fn(),
    handleCreatePhaseKnowledge: vi.fn(),
    handleCreateKnowledgeQuizForKnowledge: vi.fn(),
    handleCreatePhasePreLearning: vi.fn(),
    resetRoadmapRuntimeState: vi.fn(),
  }),
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader', () => ({
  default: ({ settingsMenu }) => <div data-testid="workspace-header">{settingsMenu}</div>,
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/SourcesPanel', () => ({
  default: (props) => {
    sourcesPanelSpy(props);
    return <div data-testid="sources-panel">sources:{String(props.isCollapsed)}</div>;
  },
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/ChatPanel', () => ({
  default: (props) => {
    chatPanelSpy(props);
    return (
      <div data-testid="chat-panel-state">
        {props.activeView || 'none'}|{props.selectedQuiz?.quizId || 'none'}|{props.selectedRoadmapPhaseId || 'none'}
      </div>
    );
  },
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/StudioPanel', () => ({
  default: (props) => {
    studioPanelSpy(props);
    return <div data-testid="studio-panel">studio:{String(props.isCollapsed)}</div>;
  },
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog', () => ({
  default: ({ open, onEditProfile }) => (open ? (
    <div data-testid="profile-overview-dialog">
      <button type="button" onClick={onEditProfile}>open-profile-update</button>
    </div>
  ) : null),
}));

vi.mock('@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog', () => ({
  default: ({ open }) => (open ? <div data-testid="profile-update-guard-dialog">guard-open</div> : null),
}));

vi.mock('@/Components/workspace/RoadmapConfigEditDialog', () => ({
  default: () => null,
}));

vi.mock('@/Components/plan/PlanUpgradeModal', () => ({
  default: () => null,
}));

vi.mock('@/Components/ui/ListSpinner', () => ({
  default: () => <div data-testid="list-spinner" />,
}));

describe('WorkspacePage', () => {
  beforeEach(() => {
    hoisted.mockNavigate.mockClear();
    sourcesPanelSpy.mockClear();
    studioPanelSpy.mockClear();
    chatPanelSpy.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    globalThis.ResizeObserver = ResizeObserverMock;
    ResizeObserverMock.latest = null;
  });

  it('hydrates edit view state from deep-link route', async () => {
    hoisted.setLocation({
      pathname: '/workspaces/42/roadmaps/77/phases/11/quizzes/5/edit',
      search: '',
      state: {},
    });

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-panel-state')).toHaveTextContent('editQuiz|5|11');
    });
  });

  it('forces studio collapse when layout width drops below hard threshold', async () => {
    hoisted.setLocation({
      pathname: '/workspaces/42',
      search: '',
      state: {},
    });

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(ResizeObserverMock.latest).not.toBeNull();
    });

    act(() => {
      ResizeObserverMock.latest?.trigger(1300);
    });

    await waitFor(() => {
      expect(studioPanelSpy).toHaveBeenLastCalledWith(expect.objectContaining({
        isCollapsed: true,
      }));
      expect(sourcesPanelSpy).toHaveBeenLastCalledWith(expect.objectContaining({
        isCollapsed: false,
      }));
    });
  });

  it('opens onboarding update guard when profile edit is requested with existing materials', async () => {
    hoisted.setLocation({
      pathname: '/workspaces/42',
      search: '',
      state: {},
    });

    render(<WorkspacePage />);

    const profileButton = await screen.findByRole('button', { name: 'workspace.settingsMenu.workspaceProfile' });
    fireEvent.click(profileButton);

    await waitFor(() => {
      expect(screen.getByTestId('profile-overview-dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'open-profile-update' }));

    await waitFor(() => {
      expect(screen.getByTestId('profile-update-guard-dialog')).toBeInTheDocument();
    });
  });
});
