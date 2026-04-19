import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/Components/ui/button";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import PersonalWorkspaceSidebar from "@/Pages/Users/Individual/Workspace/Components/PersonalWorkspaceSidebar";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProgressTracking } from "@/hooks/useProgressTracking";
import { usePlanEntitlements } from "@/hooks/usePlanEntitlements";
import PlanUpgradeModal from "@/Components/plan/PlanUpgradeModal";

import {
  deleteIndividualWorkspace,
  getIndividualWorkspaceProfile,
  getWorkspacePersonalization,
  normalizeIndividualWorkspaceProfile,
  saveIndividualWorkspaceBasicStep,
  saveIndividualWorkspacePersonalInfoStep,
  saveIndividualWorkspaceRoadmapConfigStep,
  startIndividualWorkspaceMockTestPersonalInfoStep,
  confirmIndividualWorkspaceProfile,
} from "@/api/WorkspaceAPI";

import {
  createRoadmapForWorkspace,
  deleteRoadmapKnowledgeById,
  deleteRoadmapPhaseById,
  getRoadmapStructureById,
  updateRoadmapConfig,
} from "@/api/RoadmapAPI";

import {
  getMaterialsByWorkspace,
  deleteMaterial,
  uploadMaterial,
} from "@/api/MaterialAPI";
import {
  deleteQuiz,
  getQuizzesByScope,
  shareQuizToCommunity,
} from "@/api/QuizAPI";
import { deleteFlashcardSet, getFlashcardsByScope } from "@/api/FlashcardAPI";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/Utils/getErrorMessage";
import {
  WORKSPACE_ROUTE_SEGMENTS,
  buildWorkspacePath,
  buildWorkspaceRoadmapsPath,
  buildWorkspaceRoadmapPhasePath,
  extractWorkspaceSubPath,
} from "@/lib/routePaths";
import {
  buildWorkspacePathForView,
  resolveWorkspaceViewFromSubPath,
} from "@/Pages/Users/Individual/Workspace/utils/viewRouting";
import { useWorkspaceMockTestGeneration } from "@/Pages/Users/Individual/Workspace/hooks/useWorkspaceMockTestGeneration";
import { useWorkspaceRoadmapManager } from "@/Pages/Users/Individual/Workspace/hooks/useWorkspaceRoadmapManager";
import {
  getMockTestRealtimeMessage,
  isMockTestCompletedSignal,
  isMockTestErrorSignal,
} from "@/Pages/Users/MockTest/utils/mockTestRealtime";

const LazyUploadSourceDialog = React.lazy(
  () =>
    import("@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog"),
);
const LazyRoadmapPhaseGenerateDialog = React.lazy(
  () =>
    import(
      "@/Pages/Users/Individual/Workspace/Components/RoadmapPhaseGenerateDialog"
    ),
);
const LazyIndividualWorkspaceProfileConfigDialog = React.lazy(
  () =>
    import(
      "@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog"
    ),
);
const LazyIndividualWorkspaceProfileOverviewDialog = React.lazy(
  () =>
    import(
      "@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog"
    ),
);
const LazyWorkspaceOnboardingUpdateGuardDialog = React.lazy(
  () => import("@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog"),
);
const LazyRoadmapConfigEditDialog = React.lazy(
  () => import("@/Components/workspace/RoadmapConfigEditDialog"),
);

const {
  roadmaps: workspaceRoadmapsPath,
  phases: workspacePhasesPath,
  knowledges: workspaceKnowledgesPath,
  quizzes: workspaceQuizzesPath,
  mockTests: workspaceMockTestsPath,
  postLearnings: workspacePostLearningsPath,
} = WORKSPACE_ROUTE_SEGMENTS;

function isProfileOnboardingDone(profileData) {
  return (
    profileData?.onboardingCompleted === true ||
    profileData?.workspaceSetupStatus === "DONE"
  );
}

function extractProfileData(response) {
  return normalizeIndividualWorkspaceProfile(
    response?.data?.data || response?.data || response || null,
  );
}

function extractRoadmapIdFromProfile(profileData) {
  const rawRoadmapId =
    profileData?.roadmap_id ?? profileData?.roadmapId ?? null;
  const roadmapId = Number(rawRoadmapId);
  return Number.isInteger(roadmapId) && roadmapId > 0 ? roadmapId : null;
}

function getProfilePurpose(profileData) {
  return profileData?.workspacePurpose || profileData?.learningMode || "";
}

function hasTextValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasSavedBasicProfileStep(profileData) {
  if (!profileData || typeof profileData !== "object") {
    return false;
  }

  const explicitStep = Number(profileData?.currentStep);
  const setupStatus = String(profileData?.workspaceSetupStatus || "").toUpperCase();
  const profileStatus = String(profileData?.profileStatus || "").toUpperCase();

  if (explicitStep >= 2) return true;
  if (["PROFILE_DONE", "DONE"].includes(setupStatus)) return true;
  if (["BASIC_DONE", "DONE"].includes(profileStatus)) return true;

  return Boolean(
    getProfilePurpose(profileData) &&
      hasTextValue(
        profileData?.knowledgeInput ??
          profileData?.knowledge ??
          profileData?.customKnowledge,
      ) &&
      hasTextValue(
        profileData?.inferredDomain ??
          profileData?.domain ??
          profileData?.customDomain,
      ),
  );
}

function normalizeRoadmapEnabledValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function translateOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function DeferredWorkspaceDialog({ children }) {
  return <React.Suspense fallback={null}>{children}</React.Suspense>;
}

function WorkspacePage() {
  const { workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const planEntitlements = usePlanEntitlements();
  const canCreateRoadmap = planEntitlements.loading
    ? null
    : Boolean(planEntitlements.canCreateRoadmap);
  const roadmapCreationBlocked =
    planEntitlements.loading || canCreateRoadmap === false;
  const [planUpgradeModalOpen, setPlanUpgradeModalOpen] = useState(false);
  const [planUpgradeFeatureName, setPlanUpgradeFeatureName] =
    useState(undefined);
  const openProfileConfig = location.state?.openProfileConfig || false;
  const continueProfileSetup = Boolean(location.state?.continueProfileSetup);
  const shouldReturnHomeOnIncompleteProfile = Boolean(
    location.state?.returnToHomeOnIncompleteProfile,
  );
  const [profileConfigOpen, setProfileConfigOpen] = useState(false);
  const [profileOverviewOpen, setProfileOverviewOpen] = useState(false);
  const [profileUpdateGuardOpen, setProfileUpdateGuardOpen] = useState(false);
  const [isProfileUpdateMode, setIsProfileUpdateMode] = useState(false);
  const [
    isResettingWorkspaceForProfileUpdate,
    setIsResettingWorkspaceForProfileUpdate,
  ] = useState(false);
  const [isProfileConfigured, setIsProfileConfigured] = useState(false);
  const [workspaceProfile, setWorkspaceProfile] = useState(null);
  const [workspacePersonalization, setWorkspacePersonalization] =
    useState(null);
  const { currentWorkspace, fetchWorkspaceDetail, editWorkspace } =
    useWorkspace({ enabled: false });
  const progressTracking = useProgressTracking({
    scopeKey: workspaceId ? `workspace:${workspaceId}` : null,
  });
  const personalWorkspaceIsDark = isDarkMode;

  const reconcileMaterialProgress = progressTracking.reconcileMaterialProgress;

  // Source state. Still mock-data-friendly, but wired to API fetches.

  const [sources, setSources] = useState([]);
  const sourcesRef = useRef([]);
  const roadmapAccessRedirectHandledRef = useRef(false);
  const hasLoadedSourcesSuccessfullyRef = useRef(false);
  const lastLoadedSourcesWorkspaceIdRef = useRef(null);
  const skipRoadmapStoredRestoreRef = useRef(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]); // Selected sources from SourcesPanel
  const [accessHistory, setAccessHistory] = useState([]);

  // Upload dialog state. Auto-open only when the first fetch returns no materials.
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Main content state. Prefer the current route instead of sessionStorage.
  const [activeView, setActiveView] = useState(() => {
    if (!workspaceId) return "sources";

    const prefix = buildWorkspacePath(workspaceId);

    if (location.pathname.startsWith(prefix)) {
      const subPath = location.pathname
        .slice(prefix.length)
        .replace(/^\/+/, "");
      const { view: routeView } = resolveWorkspaceViewFromSubPath(subPath);
      if (routeView) {
        return routeView;
      }
    }

    return "sources";
  });

  // Selected quiz state for detail and edit flows
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizBackTarget, setQuizBackTarget] = useState(null);
  // Selected flashcard state for detail flow
  const [selectedFlashcard, setSelectedFlashcard] = useState(null);
  // Selected mock-test state for detail and edit flows
  const [selectedMockTest, setSelectedMockTest] = useState(() => {
    if (!workspaceId) return null;
    const prefix = buildWorkspacePath(workspaceId);
    if (location.pathname.startsWith(prefix)) {
      const subPath = location.pathname.slice(prefix.length).replace(/^\/+/, "");
      const { mockTestId } = resolveWorkspaceViewFromSubPath(subPath);
      if (mockTestId) return { quizId: mockTestId };
    }
    return null;
  });
  const [selectedRoadmapPhaseId, setSelectedRoadmapPhaseId] = useState(null);
  const [selectedRoadmapKnowledgeId, setSelectedRoadmapKnowledgeId] =
    useState(null);
  const [hasHydratedRoadmapSelection, setHasHydratedRoadmapSelection] =
    useState(false);
  const [roadmapAiRoadmapId, setRoadmapAiRoadmapId] = useState(null);
  const [roadmapHasPhases, setRoadmapHasPhases] = useState(false);
  const [isRoadmapStructureMissing, setIsRoadmapStructureMissing] =
    useState(false);
  const [hasExistingWorkspaceQuiz, setHasExistingWorkspaceQuiz] =
    useState(false);
  const [completedQuizCount, setCompletedQuizCount] = useState(0);
  const [totalQuizCount, setTotalQuizCount] = useState(0);
  const [hasExistingWorkspaceFlashcard, setHasExistingWorkspaceFlashcard] =
    useState(false);
  const [totalFlashcardCount, setTotalFlashcardCount] = useState(0);
  const [hasExistingWorkspaceMockTest, setHasExistingWorkspaceMockTest] =
    useState(false);
  const [totalMockTestCount, setTotalMockTestCount] = useState(0);
  const isOnWorkspaceQuizRoute = useMemo(() => {
    if (!workspaceId || !location.pathname) return false;
    return new RegExp(
      `^/workspaces/${workspaceId}/(?:${workspaceQuizzesPath}(?:/|$)|${workspaceRoadmapsPath}/(?:\\d+/${workspacePhasesPath}/\\d+(?:/${workspaceKnowledgesPath}/\\d+)?/)?${workspaceQuizzesPath}(?:/|$))`,
    ).test(location.pathname);
  }, [location.pathname, workspaceId]);
  const roadmapSelectionStorageKey = useMemo(
    () =>
      workspaceId
        ? `quizmate:workspace:lastRoadmapSelection:${workspaceId}`
        : null,
    [workspaceId],
  );

  const readStoredRoadmapSelection = useCallback(() => {
    if (!roadmapSelectionStorageKey || typeof window === "undefined") return null;

    try {
      const rawValue = window.localStorage.getItem(roadmapSelectionStorageKey);
      if (!rawValue) return null;

      const parsedValue = JSON.parse(rawValue);
      const normalizedPhaseId = Number(parsedValue?.phaseId);
      const normalizedKnowledgeId = Number(parsedValue?.knowledgeId);
      const normalizedRoadmapId = Number(parsedValue?.roadmapId);

      return {
        roadmapId:
          Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
            ? normalizedRoadmapId
            : null,
        phaseId:
          Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0
            ? normalizedPhaseId
            : null,
        knowledgeId:
          Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0
            ? normalizedKnowledgeId
            : null,
      };
    } catch {
      return null;
    }
  }, [roadmapSelectionStorageKey]);

  useEffect(() => {
    if (!roadmapSelectionStorageKey || typeof window === "undefined") {
      setHasHydratedRoadmapSelection(true);
      return;
    }

    setHasHydratedRoadmapSelection(false);
    const storedSelection = readStoredRoadmapSelection();
    if (storedSelection?.roadmapId) {
      setRoadmapAiRoadmapId((current) => current || storedSelection.roadmapId);
    }
    if (Number.isInteger(storedSelection?.phaseId) && storedSelection.phaseId > 0) {
      setSelectedRoadmapPhaseId(storedSelection.phaseId);
      setSelectedRoadmapKnowledgeId(
        Number.isInteger(storedSelection?.knowledgeId) && storedSelection.knowledgeId > 0
          ? storedSelection.knowledgeId
          : null,
      );
    }

    setHasHydratedRoadmapSelection(true);
  }, [readStoredRoadmapSelection, roadmapSelectionStorageKey]);

  useEffect(() => {
    if (!hasHydratedRoadmapSelection) return;
    if (!roadmapSelectionStorageKey || typeof window === "undefined") return;

    const normalizedRoadmapId = Number(roadmapAiRoadmapId);
    const normalizedPhaseId = Number(selectedRoadmapPhaseId);
    const normalizedKnowledgeId = Number(selectedRoadmapKnowledgeId);
    const hasSelectedPhase = Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0;
    const hasSelectedKnowledge = Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0;

    if (!hasSelectedPhase && !hasSelectedKnowledge) {
      return;
    }

    try {
      window.localStorage.setItem(
        roadmapSelectionStorageKey,
        JSON.stringify({
          roadmapId:
            Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
              ? normalizedRoadmapId
              : null,
          phaseId:
            hasSelectedPhase
              ? normalizedPhaseId
              : null,
          knowledgeId:
            hasSelectedKnowledge
              ? normalizedKnowledgeId
              : null,
        }),
      );
    } catch {
      // Bo qua loi storage de tranh anh huong luong dieu huong.
    }
  }, [
    hasHydratedRoadmapSelection,
    roadmapAiRoadmapId,
    roadmapSelectionStorageKey,
    selectedRoadmapKnowledgeId,
    selectedRoadmapPhaseId,
  ]);

  const getCurrentWorkspaceRouteView = useCallback(() => {
    const subPath = extractWorkspaceSubPath(location.pathname, workspaceId);
    const { view } = resolveWorkspaceViewFromSubPath(subPath);
    return view || null;
  }, [location.pathname, workspaceId]);

  const canAutoFocusRoadmap = useCallback(() => {
    if (canCreateRoadmap === false) return false;
    const routeView = getCurrentWorkspaceRouteView();
    return routeView === "roadmap";
  }, [canCreateRoadmap, getCurrentWorkspaceRouteView]);

  const focusRoadmapViewSafely = useCallback(() => {
    if (isOnWorkspaceQuizRoute || !canAutoFocusRoadmap()) return;
    React.startTransition(() => {
      setActiveView((prev) => (prev === "roadmap" ? prev : "roadmap"));
    });
  }, [canAutoFocusRoadmap, isOnWorkspaceQuizRoute]);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    hasLoadedSourcesSuccessfullyRef.current = false;
    lastLoadedSourcesWorkspaceIdRef.current = null;
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setHasExistingWorkspaceQuiz(false);
      setCompletedQuizCount(0);
      setTotalQuizCount(0);
      setHasExistingWorkspaceFlashcard(false);
      setTotalFlashcardCount(0);
      setHasExistingWorkspaceMockTest(false);
      setTotalMockTestCount(0);
      return;
    }

    let cancelled = false;
    let idleHandle = null;
    let timeoutHandle = null;

    const syncExistingWorkspaceContent = async () => {
      try {
        const [quizResponse, flashcardResponse] = await Promise.all([
          getQuizzesByScope("WORKSPACE", Number(workspaceId)),
          getFlashcardsByScope("WORKSPACE", Number(workspaceId)),
        ]);

        if (cancelled) return;

        const allQuizzes = quizResponse?.data || [];

        const workspaceQuizzes = allQuizzes.filter((quiz) => {
          const qContext = String(quiz?.contextType || "").toUpperCase();
          const quizIntent = String(quiz?.quizIntent || "").toUpperCase();
          if (quizIntent === "MOCK_TEST") return false;
          if (["ROADMAP", "PHASE", "KNOWLEDGE"].includes(qContext))
            return false;
          if (
            Number(quiz?.roadmapId) > 0 ||
            Number(quiz?.phaseId) > 0 ||
            Number(quiz?.knowledgeId) > 0
          )
            return false;
          return true;
        });

        const workspaceFlashcards = Array.isArray(flashcardResponse?.data)
          ? flashcardResponse.data
          : [];

        const completedCount = workspaceQuizzes.filter((quiz) => {
          if (quiz?.myAttempted === true) return true;
          const n = Number(
            quiz?.attemptCount ?? quiz?.attemptsCount ?? quiz?.myAttemptCount,
          );
          return Number.isFinite(n) && n > 0;
        }).length;

        const mockTestCount = allQuizzes.filter(
          (quiz) => String(quiz?.quizIntent || "").toUpperCase() === "MOCK_TEST",
        ).length;

        setHasExistingWorkspaceQuiz(workspaceQuizzes.length > 0);
        setCompletedQuizCount(completedCount);
        setTotalQuizCount(workspaceQuizzes.length);
        setHasExistingWorkspaceFlashcard(workspaceFlashcards.length > 0);
        setTotalFlashcardCount(workspaceFlashcards.length);
        setHasExistingWorkspaceMockTest(mockTestCount > 0);
        setTotalMockTestCount(mockTestCount);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Không thể đồng bộ trạng thái quiz/flashcard workspace:",
            error,
          );
        }
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(
        () => {
          void syncExistingWorkspaceContent();
        },
        { timeout: 1200 },
      );
    } else {
      timeoutHandle = window.setTimeout(() => {
        void syncExistingWorkspaceContent();
      }, 350);
    }

    return () => {
      cancelled = true;
      if (
        idleHandle !== null &&
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        window.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null && typeof window !== "undefined") {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [workspaceId, activeView]);

  // Xác định các chức năng nên disabled
  const hasAtLeastOneActiveSource = sources.some(
    (source) => String(source?.status || "").toUpperCase() === "ACTIVE",
  );

  const shouldDisableQuiz =
    !hasAtLeastOneActiveSource && !hasExistingWorkspaceQuiz;
  const shouldDisableFlashcard =
    !hasAtLeastOneActiveSource && !hasExistingWorkspaceFlashcard;
  const shouldDisableMockTest =
    !hasAtLeastOneActiveSource && !hasExistingWorkspaceMockTest;
  const shouldDisableCreateQuiz = !hasAtLeastOneActiveSource;
  const shouldDisableCreateFlashcard = !hasAtLeastOneActiveSource;
  const shouldDisableCreateMockTest =
    !hasAtLeastOneActiveSource ||
    planEntitlements.loading ||
    !planEntitlements.hasAdvanceQuizConfig;
  const materialCountForProfile = sources.length;
  const profileEditLocked = materialCountForProfile > 0;
  const roadmapEnabledFromProfile = normalizeRoadmapEnabledValue(
    workspaceProfile?.roadmapEnabled ?? workspaceProfile?.data?.roadmapEnabled,
  );

  const resolvedRoadmapEnabled = roadmapEnabledFromProfile === true;
  const hasRoadmapPhases = roadmapHasPhases;
  // Điều kiện roadmap theo thứ tự 1 -> 3:
  // 1) roadmapEnabled từ profile phải là true
  // 2) workspace phải có tài liệu ACTIVE
  // 3) roadmap structure không bị missing
  const passRoadmapCondition1 = resolvedRoadmapEnabled;
  const passRoadmapCondition2 = hasAtLeastOneActiveSource;
  const passRoadmapCondition3 = !isRoadmapStructureMissing;
  const shouldDisableRoadmapForStudio = canCreateRoadmap === false
    ? true
    : hasRoadmapPhases
    ? false
    : !hasAtLeastOneActiveSource ||
      !passRoadmapCondition1 ||
      !passRoadmapCondition3;

  const isStudyNewRoadmap =
    canCreateRoadmap !== false &&
    getProfilePurpose(workspaceProfile) === "STUDY_NEW";

  const hasWorkspaceLearningDataAtRisk =
    hasExistingWorkspaceQuiz ||
    hasExistingWorkspaceFlashcard ||
    hasRoadmapPhases ||
    Boolean(extractRoadmapIdFromProfile(workspaceProfile));

  const workspaceAdaptationMode = String(
    workspaceProfile?.adaptationMode ||
      workspaceProfile?.data?.adaptationMode ||
      "",
  ).toUpperCase();

  const [roadmapConfigEditOpen, setRoadmapConfigEditOpen] = useState(false);

  useEffect(() => {
    if (!shouldDisableCreateMockTest) return;
    if (activeView !== "createMockTest") return;
    setActiveView("mockTest");
  }, [activeView, shouldDisableCreateMockTest]);

  const roadmapConfigInitialValues = useMemo(
    () => ({
      knowledgeLoad: workspaceProfile?.knowledgeLoad || "",
      adaptationMode: workspaceAdaptationMode || "",
      roadmapSpeedMode:
        workspaceProfile?.roadmapSpeedMode ||
        (workspaceProfile?.speedMode === "MEDIUM"
          ? "STANDARD"
          : workspaceProfile?.speedMode || ""),
      estimatedTotalDays: workspaceProfile?.estimatedTotalDays || "",
      recommendedMinutesPerDay:
        workspaceProfile?.recommendedMinutesPerDay ||
        workspaceProfile?.estimatedMinutesPerDay ||
        "",
    }),
    [workspaceProfile, workspaceAdaptationMode],
  );

  const getWorkspaceSubPath = useCallback(() => {
    return extractWorkspaceSubPath(location.pathname, workspaceId);
  }, [location.pathname, workspaceId]);

  useEffect(() => {
    const subPath = getWorkspaceSubPath();

    if (subPath === workspaceRoadmapsPath) {
      const phaseParam = new URLSearchParams(location.search).get("phaseId");

      const parsedPhaseId = Number(phaseParam);

      if (Number.isInteger(parsedPhaseId) && parsedPhaseId > 0) {
        setSelectedRoadmapPhaseId(parsedPhaseId);
        setSelectedRoadmapKnowledgeId(null);
      }
    }

    const {
      view: mappedView,
      quizId,
      mockTestId,
      backTarget,
      phaseId: mappedPhaseId,
      knowledgeId: mappedKnowledgeId,
      roadmapId: mappedRoadmapId,
    } = resolveWorkspaceViewFromSubPath(subPath);

    if (!mappedView) return;

    if (backTarget?.view === "roadmap") {
      const urlPhaseParam = new URLSearchParams(location.search).get("phaseId");

      const parsedPhaseId = Number(urlPhaseParam);

      const normalizedPhaseId =
        Number.isInteger(backTarget?.phaseId) && backTarget.phaseId > 0
          ? Number(backTarget.phaseId)
          : Number.isInteger(parsedPhaseId) && parsedPhaseId > 0
            ? parsedPhaseId
            : null;

      const normalizedRoadmapId =
        Number.isInteger(backTarget?.roadmapId) && backTarget.roadmapId > 0
          ? Number(backTarget.roadmapId)
          : null;

      setQuizBackTarget({
        view: "roadmap",

        phaseId: normalizedPhaseId,

        knowledgeId:
          Number.isInteger(Number(backTarget?.knowledgeId)) &&
          Number(backTarget.knowledgeId) > 0
            ? Number(backTarget.knowledgeId)
            : null,

        roadmapId: normalizedRoadmapId,
      });

      if (Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
        setSelectedRoadmapPhaseId(normalizedPhaseId);
      }

      setSelectedRoadmapKnowledgeId(
        Number.isInteger(Number(backTarget?.knowledgeId)) &&
          Number(backTarget.knowledgeId) > 0
          ? Number(backTarget.knowledgeId)
          : null,
      );
    } else if (mappedView === "quizDetail" || mappedView === "editQuiz") {
      setQuizBackTarget(null);
    }

    if (mappedView === "roadmap") {
      const shouldKeepCenterSelection = skipRoadmapStoredRestoreRef.current;
      if (shouldKeepCenterSelection) {
        skipRoadmapStoredRestoreRef.current = false;
      }

      const storedSelection = readStoredRoadmapSelection();
      const resolvedPhaseId =
        Number.isInteger(mappedPhaseId) && mappedPhaseId > 0
          ? mappedPhaseId
          : shouldKeepCenterSelection
            ? null
            : Number.isInteger(storedSelection?.phaseId) && storedSelection.phaseId > 0
            ? storedSelection.phaseId
            : null;
      const resolvedKnowledgeId =
        Number.isInteger(mappedKnowledgeId) && mappedKnowledgeId > 0
          ? mappedKnowledgeId
          : shouldKeepCenterSelection
            ? null
            : Number.isInteger(storedSelection?.knowledgeId) && storedSelection.knowledgeId > 0
            ? storedSelection.knowledgeId
            : null;

      if (Number.isInteger(mappedPhaseId) && mappedPhaseId > 0) {
        setSelectedRoadmapPhaseId(mappedPhaseId);
      } else {
        setSelectedRoadmapPhaseId(resolvedPhaseId);
      }

      setSelectedRoadmapKnowledgeId(
        Number.isInteger(resolvedPhaseId) && resolvedPhaseId > 0
          ? (Number.isInteger(resolvedKnowledgeId) && resolvedKnowledgeId > 0
            ? resolvedKnowledgeId
            : null)
          : null,
      );

      const resolvedRoadmapId =
        Number.isInteger(mappedRoadmapId) && mappedRoadmapId > 0
          ? mappedRoadmapId
          : Number.isInteger(storedSelection?.roadmapId) && storedSelection.roadmapId > 0
            ? storedSelection.roadmapId
            : null;
      if (Number.isInteger(resolvedRoadmapId) && resolvedRoadmapId > 0) {
        setRoadmapAiRoadmapId((prev) => prev || resolvedRoadmapId);
      }
    }

    if (quizId) {
      setSelectedQuiz((prev) => {
        if (prev?.quizId === quizId) return prev;

        return { quizId };
      });
    }

    if (mockTestId) {
      setSelectedMockTest((prev) => {
        if (prev?.quizId === mockTestId) return prev;
        return { quizId: mockTestId };
      });
    }

    setActiveView((prev) => (prev === mappedView ? prev : mappedView));
  }, [getWorkspaceSubPath, location.search, readStoredRoadmapSelection]);

  useEffect(() => {
    if (!workspaceId) return;

    let mappedPath = buildWorkspacePathForView(
      activeView,
      selectedQuiz,
      quizBackTarget,
      selectedMockTest,
    );

    if (activeView === "roadmap") {
      const normalizedRoadmapId = Number(roadmapAiRoadmapId);

      if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0) {
        mappedPath = `${workspaceRoadmapsPath}/${normalizedRoadmapId}`;

        if (
          Number.isInteger(selectedRoadmapPhaseId) &&
          selectedRoadmapPhaseId > 0
        ) {
          mappedPath += `/${workspacePhasesPath}/${selectedRoadmapPhaseId}`;

          if (
            Number.isInteger(selectedRoadmapKnowledgeId) &&
            selectedRoadmapKnowledgeId > 0
          ) {
            mappedPath += `/${workspaceKnowledgesPath}/${selectedRoadmapKnowledgeId}`;
          }
        }
      }
    }

    if (mappedPath == null) return;

    const currentSubPath = getWorkspaceSubPath();

    const isQuizDeepLink =
      new RegExp(`^${workspaceQuizzesPath}/\\d+(?:/edit)?$`).test(currentSubPath) ||
      new RegExp(`^${workspaceRoadmapsPath}/${workspaceQuizzesPath}/\\d+(?:/edit)?$`).test(currentSubPath) ||
      new RegExp(`^${workspaceRoadmapsPath}/\\d+/${workspacePhasesPath}/\\d+(?:/${workspaceKnowledgesPath}/\\d+)?/${workspaceQuizzesPath}/\\d+(?:/edit)?$`).test(currentSubPath);

    const isMockTestDeepLink = new RegExp(`^${workspaceMockTestsPath}/\\d+$`).test(currentSubPath);

    const isQuizDetailView =
      activeView === "quizDetail" || activeView === "editQuiz";

    if (isQuizDeepLink) {
      const { view: routeView, quizId: routeQuizId } =
        resolveWorkspaceViewFromSubPath(currentSubPath);

      const currentSelectedQuizId = Number(selectedQuiz?.quizId);

      // Chặn redirect theo activeView cũ (lấy từ sessionStorage) trước khi route deep-link hydrate xong.

      if (isQuizDetailView && routeView && routeView !== activeView) return;

      if (
        isQuizDetailView &&
        Number.isInteger(routeQuizId) &&
        routeQuizId > 0 &&
        currentSelectedQuizId !== routeQuizId
      )
        return;
    }

    if (isMockTestDeepLink && activeView === "mockTestDetail") {
      const { mockTestId: routeMockTestId } = resolveWorkspaceViewFromSubPath(currentSubPath);
      const currentMockTestId = Number(selectedMockTest?.quizId);
      if (Number.isInteger(routeMockTestId) && routeMockTestId > 0 && currentMockTestId !== routeMockTestId) return;
    }

    if (currentSubPath === mappedPath) return;

    navigate(buildWorkspacePath(workspaceId, mappedPath), { replace: true });
  }, [
    activeView,
    getWorkspaceSubPath,
    navigate,
    quizBackTarget,
    selectedQuiz,
    selectedMockTest,
    selectedRoadmapPhaseId,
    selectedRoadmapKnowledgeId,
    roadmapAiRoadmapId,
    workspaceId,
  ]);

  const currentLang = i18n.language;

  const fontClass = currentLang === "en" ? "font-poppins" : "font-sans";

  const applyResolvedWorkspaceProfile = useCallback((profileData) => {
    if (!profileData) return null;

    setWorkspaceProfile(profileData);

    setIsProfileConfigured(isProfileOnboardingDone(profileData));

    return profileData;
  }, []);

  const loadWorkspaceProfileData = useCallback(async () => {
    if (!workspaceId) return null;

    const profileData = extractProfileData(
      await getIndividualWorkspaceProfile(workspaceId),
    );

    return applyResolvedWorkspaceProfile(profileData);
  }, [applyResolvedWorkspaceProfile, workspaceId]);

  const confirmWorkspaceProfileData = useCallback(async () => {
    if (!workspaceId) return null;

    const confirmedProfile = extractProfileData(
      await confirmIndividualWorkspaceProfile(workspaceId),
    );

    return applyResolvedWorkspaceProfile(confirmedProfile);
  }, [applyResolvedWorkspaceProfile, workspaceId]);

  const persistWorkspaceRoadmapConfig = useCallback(
    async (data) => {
      if (!workspaceId) return null;

      return extractProfileData(
        await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, data),
      );
    },
    [workspaceId],
  );

  const closeProfileDialogs = useCallback(() => {
    setProfileConfigOpen(false);

    setProfileOverviewOpen(false);
  }, []);

  const navigateToWorkspaceRoot = useCallback(() => {
    if (!workspaceId) return;

    navigate(buildWorkspacePath(workspaceId), { replace: true });
  }, [navigate, workspaceId]);

  const navigateToWorkspaceHomeTab = useCallback(() => {
    navigate("/home?tab=workspace", { replace: true });
  }, [navigate]);

  const handleIncompleteProfileExit = useCallback(async () => {
    const shouldDeleteDraftWorkspace =
      shouldReturnHomeOnIncompleteProfile &&
      !hasSavedBasicProfileStep(workspaceProfile);

    closeProfileDialogs();
    setIsProfileUpdateMode(false);

    if (shouldDeleteDraftWorkspace && workspaceId) {
      try {
        await deleteIndividualWorkspace(workspaceId);
      } catch (error) {
        console.error("Failed to delete incomplete draft workspace:", error);
      } finally {
        void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      }
    }

    navigateToWorkspaceHomeTab();
  }, [
    closeProfileDialogs,
    navigateToWorkspaceHomeTab,
    queryClient,
    shouldReturnHomeOnIncompleteProfile,
    workspaceId,
    workspaceProfile,
  ]);

  const {
    mockTestGenerationState,

    mockTestGenerationProgress,

    mockTestGenerationDisplayMessage,

    mockTestGenerationDisplayLabel,

    isMockTestAwaitingBackend,

    isMockTestTakingLongerThanExpected,

    resetMockTestGenerationStatus,

    readStoredMockTestGeneration,

    syncMockTestGenerationFromProfile,

    beginMockTestGeneration,

    checkMockTestGenerationStatusNow,
  } = useWorkspaceMockTestGeneration({
    workspaceId,

    t,

    fetchWorkspaceDetail,

    showSuccess,

    loadProfileData: loadWorkspaceProfileData,

    confirmProfileData: confirmWorkspaceProfileData,

    persistRoadmapConfig: persistWorkspaceRoadmapConfig,

    onProfileResolved: applyResolvedWorkspaceProfile,

    closeProfileDialogs,

    navigateToWorkspaceRoot,
  });

  useEffect(() => {
    setRoadmapAiRoadmapId(extractRoadmapIdFromProfile(workspaceProfile));
  }, [workspaceProfile]);

  const refreshWorkspacePersonalization = useCallback(async () => {
    if (!workspaceId) {
      setWorkspacePersonalization(null);

      return null;
    }

    try {
      const response = await getWorkspacePersonalization(workspaceId);

      const payload =
        response?.data?.data || response?.data || response || null;

      setWorkspacePersonalization(payload);

      return payload;
    } catch (error) {
      console.error("Failed to load workspace personalization:", error);

      setWorkspacePersonalization(null);

      return null;
    }
  }, [workspaceId]);

  const toggleLanguage = () => {
    const newLang = currentLang === "vi" ? "en" : "vi";

    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setIsMobileViewport(isMobile);
      if (!isMobile) {
        setIsMobileSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch materials list

  const fetchSources = useCallback(async () => {
    if (!workspaceId) return [];

    try {
      const data = await getMaterialsByWorkspace(workspaceId);

      const mappedSources = Array.isArray(data)
        ? data.map((item) => ({
            id: item.materialId,

            name: item.title,

            type: item.materialType,

            status: item.status,

            uploadedAt: item.uploadedAt,

            ...item,
          }))
        : [];

      const visibleSources = mappedSources.filter((item) => {
        const normalizedStatus = String(item?.status || "").toUpperCase();

        return normalizedStatus !== "DELETED";
      });

      const processingMaterialIds = visibleSources

        .filter((item) => {
          const normalizedStatus = String(item?.status || "").toUpperCase();

          return ["PROCESSING", "UPLOADING", "PENDING", "QUEUED"].includes(
            normalizedStatus,
          );
        })

        .map((item) => item.id);

      reconcileMaterialProgress(processingMaterialIds);

      setSources(visibleSources);
      hasLoadedSourcesSuccessfullyRef.current = true;
      lastLoadedSourcesWorkspaceIdRef.current = workspaceId;

      return visibleSources;
    } catch (err) {
      console.error("[fetchSources] Failed to fetch materials:", err);

      if (lastLoadedSourcesWorkspaceIdRef.current === workspaceId) {
        return sourcesRef.current;
      }

      return [];
    }
  }, [workspaceId, reconcileMaterialProgress]);

  const openRoadmapProfileSetup = useCallback(() => {
    setProfileOverviewOpen(false);

    setProfileConfigOpen(true);
  }, []);

  const openRoadmapWorkspaceView = useCallback(() => {
    if (canCreateRoadmap === false) {
      return;
    }

    const routeView = getCurrentWorkspaceRouteView();
    if (
      routeView &&
      !["overview", "sources", "roadmap"].includes(routeView)
    ) {
      return;
    }
    React.startTransition(() => {
      setActiveView((prev) => (prev === "roadmap" ? prev : "roadmap"));
    });
  }, [canCreateRoadmap, getCurrentWorkspaceRouteView]);

  const clearRoadmapPhaseSelection = useCallback(() => {
    setSelectedRoadmapPhaseId(null);
    setSelectedRoadmapKnowledgeId(null);
  }, []);

  useEffect(() => {
    if (!workspaceId || canCreateRoadmap !== false) {
      roadmapAccessRedirectHandledRef.current = false;
      return;
    }

    const routeView = getCurrentWorkspaceRouteView();
    const roadmapRouteLocked = routeView === "roadmap";
    const roadmapViewLocked = activeView === "roadmap";

    if (!roadmapRouteLocked && !roadmapViewLocked) {
      roadmapAccessRedirectHandledRef.current = false;
      return;
    }

    if (roadmapAccessRedirectHandledRef.current) {
      return;
    }

    roadmapAccessRedirectHandledRef.current = true;
    clearRoadmapPhaseSelection();
    setSelectedQuiz(null);
    setQuizBackTarget(null);
    React.startTransition(() => {
      setActiveView((prev) => (prev === "overview" ? prev : "overview"));
    });

    const workspaceOverviewPath = buildWorkspacePath(workspaceId);
    if (location.pathname !== workspaceOverviewPath) {
      navigate(workspaceOverviewPath, { replace: true });
    }
  }, [
    activeView,
    canCreateRoadmap,
    clearRoadmapPhaseSelection,
    getCurrentWorkspaceRouteView,
    location.pathname,
    navigate,
    workspaceId,
  ]);

  const invalidateMockTestQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["workspace-mock-tests"] });
  }, [queryClient]);

  const handleMockTestRealtime = useCallback(
    (signal, rawPayload = null) => {
      invalidateMockTestQueries();

      if (isMockTestCompletedSignal(signal, rawPayload)) {
        showSuccess(
          t(
            "mockTestForms.common.generatedSuccess",
            "Mock test generated successfully.",
          ),
        );
        return;
      }

      if (isMockTestErrorSignal(signal, rawPayload)) {
        showError(
          getMockTestRealtimeMessage(signal, rawPayload) ||
            t(
              "mockTestForms.common.generateFailed",
              "Failed to generate mock test.",
            ),
        );
      }
    },
    [invalidateMockTestQueries, showError, showSuccess, t],
  );

  const {
    wsConnected,
    walletRealtimeTick,

    roadmapReloadToken,

    bumpRoadmapReloadToken,

    quizGenerationTaskByQuizId,

    quizGenerationProgressByQuizId,

    trackQuizGenerationStart,

    phaseGenerateDialogOpen,

    setPhaseGenerateDialogOpen,

    phaseGenerateDialogDefaultIds,

    isGeneratingRoadmapPhases,

    effectiveRoadmapPhaseGenerationProgress,

    isSubmittingRoadmapPhaseRequest,

    generatingKnowledgePhaseIds,

    generatingKnowledgeQuizPhaseIds,

    generatingKnowledgeQuizKnowledgeKeys,

    knowledgeQuizRefreshByKey,

    generatingPreLearningPhaseIds,

    skipPreLearningPhaseIds,

    handleOpenRoadmapPhaseDialog,

    handleSubmitRoadmapPhaseDialog,

    handleCreatePhaseKnowledge,

    handleCreateKnowledgeQuizForKnowledge,

    handleCreatePhasePreLearning,

    resetRoadmapRuntimeState,
  } = useWorkspaceRoadmapManager({
    workspaceId,

    roadmapAiRoadmapId,

    setRoadmapAiRoadmapId,

    setRoadmapHasPhases,

    setIsRoadmapStructureMissing,

    sources,

    progressTracking,

    isProfileConfigured,

    isStudyNewRoadmap,

    fetchSources,

    loadWorkspaceProfileData,

    focusRoadmapViewSafely,

    openProfileSetup: openRoadmapProfileSetup,

    openRoadmapView: openRoadmapWorkspaceView,

    clearSelectedRoadmapPhase: clearRoadmapPhaseSelection,

    onMockTestRealtime: handleMockTestRealtime,

    showError,
  });

  // Fetch workspace, initial sources, and profile status

  useEffect(() => {
    if (!workspaceId) return;

    let isMounted = true;

    fetchWorkspaceDetail(workspaceId).catch(() => {});

    const loadInitialData = async () => {
      try {
        const [initialSources, profileRes] = await Promise.all([
          fetchSources(),

          getIndividualWorkspaceProfile(workspaceId).catch(() => null),
        ]);

        if (!isMounted) return;

        // Consider the profile configured once onboarding-required data is available.

        // Right now, learningGoal is the required field for this gate.

        const profileData = extractProfileData(profileRes);

        const storedMockTestGeneration = readStoredMockTestGeneration();

        const resolvedProfileData = applyResolvedWorkspaceProfile(profileData);

        const isConfigured = isProfileOnboardingDone(resolvedProfileData);

        const mockTestSyncState = await syncMockTestGenerationFromProfile(
          resolvedProfileData,

          storedMockTestGeneration,
        );

        if (!isMounted) return;

        if (mockTestSyncState === "finalized") {
          return;
        }

        if (
          mockTestSyncState === "pending" &&
          Boolean(storedMockTestGeneration?.shouldCloseAfterStart)
        ) {
          closeProfileDialogs();

          setUploadDialogOpen(false);

          return;
        }

        if (isConfigured) {
          setProfileConfigOpen(false);

          if (openProfileConfig) {
            navigate(buildWorkspacePath(workspaceId), { replace: true });

            setProfileOverviewOpen(false);

            setUploadDialogOpen(false);
          } else if (
            hasLoadedSourcesSuccessfullyRef.current &&
            initialSources.length === 0
          ) {
            setUploadDialogOpen(true);
          }

          return;
        }

        setProfileOverviewOpen(false);

        setUploadDialogOpen(false);

        setProfileConfigOpen(true);
      } catch (error) {
        console.error("Failed to load initial workspace data", error);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [
    workspaceId,

    fetchSources,

    applyResolvedWorkspaceProfile,

    closeProfileDialogs,

    fetchWorkspaceDetail,

    openProfileConfig,

    readStoredMockTestGeneration,

    syncMockTestGenerationFromProfile,
  ]);

  // Handle profile config dialog open/close

  const handleProfileConfigChange = useCallback(
    (open) => {
      setProfileConfigOpen(open);

      if (open) {
        // Refetch the profile on open so the dialog uses the latest data.

        loadWorkspaceProfileData()
          .then(async (profileData) => {
            if (!profileData) return;

            await syncMockTestGenerationFromProfile(
              profileData,

              readStoredMockTestGeneration(),
            );
          })

          .catch(() => {});
      } else {
        setIsProfileUpdateMode(false);

        if (
          shouldReturnHomeOnIncompleteProfile &&
          !hasSavedBasicProfileStep(workspaceProfile)
        ) {
          void handleIncompleteProfileExit();
          return;
        }

        if (location.state?.openProfileConfig) {
          navigateToWorkspaceRoot();
        }
      }
    },
    [
      handleIncompleteProfileExit,
      location.state,

      loadWorkspaceProfileData,

      navigateToWorkspaceRoot,

      readStoredMockTestGeneration,

      shouldReturnHomeOnIncompleteProfile,
      syncMockTestGenerationFromProfile,
      workspaceProfile,
    ],
  );

  const handleProfileOverviewChange = useCallback(
    (open) => {
      setProfileOverviewOpen(open);

      if (open) {
        Promise.allSettled([
          loadWorkspaceProfileData(),

          refreshWorkspacePersonalization(),
        ])

          .catch(() => {});
      } else if (location.state?.openProfileConfig) {
        navigateToWorkspaceRoot();
      }
    },
    [
      location.state,
      loadWorkspaceProfileData,
      navigateToWorkspaceRoot,
      refreshWorkspacePersonalization,
    ],
  );

  const handleRequestProfileUpdate = useCallback(() => {
    setUploadDialogOpen(false);

    if (profileEditLocked) {
      setProfileOverviewOpen(false);

      setIsProfileUpdateMode(true);

      setProfileUpdateGuardOpen(true);

      return;
    }

    setIsProfileUpdateMode(true);

    setProfileOverviewOpen(false);

    setProfileConfigOpen(true);
  }, [profileEditLocked]);

  const resetRoadmapStructureForProfileUpdate = useCallback(async () => {
    const roadmapId = extractRoadmapIdFromProfile(workspaceProfile);

    if (!roadmapId) return;

    try {
      const roadmapResponse = await getRoadmapStructureById(roadmapId);

      const roadmapData =
        roadmapResponse?.data?.data ||
        roadmapResponse?.data ||
        roadmapResponse ||
        null;

      const phases = Array.isArray(roadmapData?.phases)
        ? roadmapData.phases
        : [];

      for (const phase of phases) {
        const knowledges = Array.isArray(phase?.knowledges)
          ? phase.knowledges
          : [];

        for (const knowledge of knowledges) {
          const knowledgeId = Number(knowledge?.knowledgeId);

          const phaseId = Number(phase?.phaseId);

          if (
            !Number.isInteger(knowledgeId) ||
            knowledgeId <= 0 ||
            !Number.isInteger(phaseId) ||
            phaseId <= 0
          ) {
            continue;
          }

          await deleteRoadmapKnowledgeById(knowledgeId, phaseId);
        }
      }

      for (const phase of phases) {
        const phaseId = Number(phase?.phaseId);

        if (!Number.isInteger(phaseId) || phaseId <= 0) continue;

        await deleteRoadmapPhaseById(phaseId, roadmapId);
      }
    } catch (error) {
      const status = Number(error?.response?.status);

      if (status !== 404) {
        console.error(
          "Failed to reset roadmap structure before updating onboarding:",
          error,
        );
      }
    }
  }, [workspaceProfile]);

  const handleSaveRoadmapConfig = useCallback(
    async (values) => {
      const roadmapId = extractRoadmapIdFromProfile(workspaceProfile);
      if (!roadmapId) throw new Error("No roadmap found");
      await updateRoadmapConfig(roadmapId, values);
      await resetRoadmapStructureForProfileUpdate();
      setRoadmapHasPhases(false);
      setIsRoadmapStructureMissing(false);
      resetRoadmapRuntimeState({ clearPresence: true });
      await loadWorkspaceProfileData();
      bumpRoadmapReloadToken();
    },
    [
      workspaceProfile,
      resetRoadmapStructureForProfileUpdate,
      setRoadmapHasPhases,
      setIsRoadmapStructureMissing,
      resetRoadmapRuntimeState,
      loadWorkspaceProfileData,
      bumpRoadmapReloadToken,
    ],
  );

  const handleDeleteMaterialsForProfileUpdate = useCallback(async () => {
    if (!workspaceId || isResettingWorkspaceForProfileUpdate) return;

    setIsResettingWorkspaceForProfileUpdate(true);

    try {
      const [quizResponse, flashcardResponse] = await Promise.all([
        getQuizzesByScope("WORKSPACE", Number(workspaceId)),

        getFlashcardsByScope("WORKSPACE", Number(workspaceId)),
      ]);

      const workspaceQuizzes = Array.isArray(quizResponse?.data)
        ? quizResponse.data
        : [];

      const workspaceFlashcards = Array.isArray(flashcardResponse?.data)
        ? flashcardResponse.data
        : [];

      await Promise.all(
        workspaceQuizzes.map((quiz) => {
          const quizId = Number(quiz?.quizId);

          if (!Number.isInteger(quizId) || quizId <= 0)
            return Promise.resolve();

          return deleteQuiz(quizId);
        }),
      );

      await Promise.all(
        workspaceFlashcards.map((flashcardSet) => {
          const flashcardSetId = Number(
            flashcardSet?.flashcardSetId ?? flashcardSet?.id,
          );

          if (!Number.isInteger(flashcardSetId) || flashcardSetId <= 0)
            return Promise.resolve();

          return deleteFlashcardSet(flashcardSetId);
        }),
      );

      await resetRoadmapStructureForProfileUpdate();

      const materialIds = sources

        .map((source) => Number(source?.id))

        .filter((id) => Number.isInteger(id) && id > 0);

      await Promise.all(
        materialIds.map((materialId) => deleteMaterial(materialId)),
      );

      setSources([]);

      setSelectedSourceIds([]);

      setHasExistingWorkspaceQuiz(false);

      setCompletedQuizCount(0);

      setTotalQuizCount(0);

      setHasExistingWorkspaceFlashcard(false);

      setTotalFlashcardCount(0);

      setHasExistingWorkspaceMockTest(false);

      setTotalMockTestCount(0);

      setRoadmapHasPhases(false);

      setIsRoadmapStructureMissing(false);

      resetRoadmapRuntimeState({ clearPresence: true });

      bumpRoadmapReloadToken();

      await fetchWorkspaceDetail(workspaceId).catch(() => {});

      await loadWorkspaceProfileData();

      setProfileUpdateGuardOpen(false);

      setProfileOverviewOpen(false);

      setUploadDialogOpen(false);

      setIsProfileUpdateMode(true);

      setProfileConfigOpen(true);

      navigate(buildWorkspacePath(workspaceId), { replace: true });

      showSuccess(
        "Đã xóa tài liệu hiện tại. Bạn có thể cập nhật onboarding ngay bây giờ.",
      );
    } catch (error) {
      console.error(
        "Failed to prepare workspace for onboarding update:",
        error,
      );

      showError(
        error?.message ||
          "Không thể xóa dữ liệu hiện tại để cập nhật onboarding.",
      );
    } finally {
      setIsResettingWorkspaceForProfileUpdate(false);
    }
  }, [
    workspaceId,

    isResettingWorkspaceForProfileUpdate,

    fetchWorkspaceDetail,

    navigate,

    loadWorkspaceProfileData,

    resetRoadmapStructureForProfileUpdate,

    showError,

    showSuccess,

    sources,
  ]);

  const handleSaveProfileConfig = useCallback(
    async (currentStep, data) => {
      try {
        let savedProfile = null;

        if (currentStep === 1) {
          if (data.workspacePurpose !== "MOCK_TEST") {
            resetMockTestGenerationStatus();
          }

          savedProfile = applyResolvedWorkspaceProfile(
            extractProfileData(
              await saveIndividualWorkspaceBasicStep(workspaceId, data),
            ),
          );

          return savedProfile;
        }

        if (currentStep === 2) {
          if (data.workspacePurpose === "MOCK_TEST") {
            await startIndividualWorkspaceMockTestPersonalInfoStep(
              workspaceId,
              data,
            );

            const shouldCloseAfterStart = !data.enableRoadmap;

            beginMockTestGeneration({
              shouldCloseAfterStart,

              autoFinalizePayload: shouldCloseAfterStart ? data : null,

              initialProgress: 12,
            });

            return {
              deferred: true,
              advanceToStep: shouldCloseAfterStart ? null : 3,
            };
          } else {
            resetMockTestGenerationStatus();

            savedProfile = applyResolvedWorkspaceProfile(
              extractProfileData(
                await saveIndividualWorkspacePersonalInfoStep(
                  workspaceId,
                  data,
                ),
              ),
            );
          }

          return savedProfile;
        }

        resetMockTestGenerationStatus();

        savedProfile = applyResolvedWorkspaceProfile(
          extractProfileData(
            await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, data),
          ),
        );

        return savedProfile;
      } catch (error) {
        console.error("Failed to config profile:", error);

        showError(
          error?.message ||
            translateOrFallback(
              t,

              "workspace.profileConfig.messages.saveError",

              "Khong the luu tien trinh thiet lap workspace.",
            ),
        );

        throw error;
      }
    },
    [
      applyResolvedWorkspaceProfile,

      beginMockTestGeneration,

      workspaceId,

      resetMockTestGenerationStatus,

      showSuccess,

      t,

      showError,
    ],
  );

  const handleConfirmProfileConfig = useCallback(async () => {
    if (!workspaceId) return;

    try {
      await confirmWorkspaceProfileData();

      closeProfileDialogs();

      fetchWorkspaceDetail(workspaceId).catch(() => {});

      if (sources.length === 0) {
        setUploadDialogOpen(true);
      }

      showSuccess(
        translateOrFallback(
          t,

          "workspace.profileConfig.messages.finishSuccess",

          "Hoàn thành thiết lập workspace thành công.",
        ),
      );

      navigateToWorkspaceRoot();
    } catch (error) {
      console.error("Failed to confirm profile:", error);

      showError(
        error?.message || "Không thể xác nhận onboarding. Vui lòng thử lại.",
      );

      throw error;
    }
  }, [
    closeProfileDialogs,

    confirmWorkspaceProfileData,

    fetchWorkspaceDetail,

    navigateToWorkspaceRoot,

    showError,

    showSuccess,

    sources.length,

    t,

    workspaceId,
  ]);

  // Chặn back navigation quay lại màn hình onboarding sau khi đã hoàn thành

  useEffect(() => {
    if (!isProfileConfigured || profileConfigOpen) return;

    // Đẩy một sentinel entry vào history để có thể intercept back

    window.history.pushState({ __onboardingDone: true }, "");

    const handlePopState = (event) => {
      if (event.state?.__onboardingDone) {
        // Re-push sentinel để ngăn quay lại — người dùng đang "back" vào wizard

        window.history.pushState({ __onboardingDone: true }, "");
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [isProfileConfigured, profileConfigOpen]);

  // Upload materials in parallel for better throughput

  const handleUploadFiles = useCallback(
    async (files) => {
      try {
        const uploadPromises = files.map((file) =>
          uploadMaterial(file, workspaceId),
        );

        await Promise.all(uploadPromises);

        const nextSources = await fetchSources();
        void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        return nextSources;
      } catch (error) {
        const msg = getErrorMessage(t, error);

        showError(msg);

        throw error;
      }
    },
    [workspaceId, fetchSources, queryClient, t, showError],
  );

  // Delete a single material

  const handleRemoveSource = useCallback(
    async (sourceId) => {
      try {
        await deleteMaterial(sourceId);

        fetchSources();
      } catch (error) {
        console.error("Failed to delete material:", error);
      }
    },
    [fetchSources],
  );

  // Delete multiple materials in parallel

  const handleRemoveMultipleSources = useCallback(
    async (sourceIds) => {
      try {
        // Delete all selected files in parallel instead of sequentially

        const deletePromises = sourceIds.map((id) => deleteMaterial(id));

        await Promise.all(deletePromises);

        fetchSources();
      } catch (error) {
        console.error("Failed to delete materials:", error);
      }
    },
    [fetchSources],
  );

  // Track recent list-view access history

  const addAccessHistory = useCallback((name, type, actionKey) => {
    setAccessHistory((prev) => {
      // Remove duplicates when the same actionKey already exists

      const filtered = prev.filter((item) => item.actionKey !== actionKey);

      return [
        { name, type, actionKey, accessedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, 20);
    });
  }, []);

  // Handle Studio Panel actions and render inline forms in ChatPanel

  const handleStudioAction = useCallback(
    (actionKey) => {
      setIsMobileSidebarOpen(false);

      if (actionKey === activeView) {
        return;
      }

      if (actionKey === "roadmap" && shouldDisableRoadmapForStudio) {
        return;
      }

      // Plan-gated actions: show upgrade modal instead of navigating

      if (
        actionKey === "questionStats" &&
        !planEntitlements.hasWorkspaceAnalytics
      ) {
        setPlanUpgradeFeatureName("Thống kê workspace");

        setPlanUpgradeModalOpen(true);

        return;
      }

      // Track access history when the user opens a list view

      const viewTypeMap = {
        overview: "overview",
        sources: "sources",
        roadmap: "roadmap",
        quiz: "quiz",
        flashcard: "flashcard",
        mockTest: "mockTest",
        postLearning: "postLearning",
        questionStats: "questionStats",
      };

      if (viewTypeMap[actionKey]) {
        addAccessHistory(
          viewTypeMap[actionKey],
          viewTypeMap[actionKey],
          actionKey,
        );
      }

      setActiveView(actionKey);

      if (
        actionKey !== "quiz" &&
        actionKey !== "quizDetail" &&
        actionKey !== "editQuiz"
      ) {
        setQuizBackTarget(null);
      }

      if (actionKey !== "roadmap") {
        setSelectedRoadmapPhaseId(null);
        setSelectedRoadmapKnowledgeId(null);
      }
    },
    [
      activeView,
      addAccessHistory,
      shouldDisableRoadmapForStudio,
      planEntitlements.hasWorkspaceAnalytics,
    ],
  );

  const handleSelectRoadmapPhase = useCallback((phaseId, options = {}) => {
    if (options?.focusRoadmapCenter) {
      skipRoadmapStoredRestoreRef.current = true;

      if (roadmapSelectionStorageKey && typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(roadmapSelectionStorageKey);
        } catch {
          // Bo qua loi storage de tranh anh huong luong dieu huong.
        }
      }

      setSelectedRoadmapPhaseId(null);
      setSelectedRoadmapKnowledgeId(null);

      if (options?.preserveActiveView) return;

      setSelectedQuiz(null);
      setQuizBackTarget(null);
      setActiveView("roadmap");
      return;
    }

    const normalizedPhaseId = Number(phaseId);
    const normalizedKnowledgeId = Number(options?.knowledgeId);

    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;

    setSelectedRoadmapPhaseId(normalizedPhaseId);
    setSelectedRoadmapKnowledgeId(
      Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0
        ? normalizedKnowledgeId
        : null,
    );

    // Giữ nguyên view hiện tại khi chỉ auto-chọn phase nền, tránh bị kéo khỏi quiz lúc reload.

    if (options?.preserveActiveView) return;

    setSelectedQuiz(null);

    setQuizBackTarget(null);

    setActiveView("roadmap");
  }, [roadmapSelectionStorageKey]);

  // Handle quiz creation callback after the multi-step API completes

  const handleCreateQuiz = useCallback(
    async (data) => {
      trackQuizGenerationStart(data);

      // Quiz was created successfully. Return to the list view.

      setActiveView("quiz");
    },
    [trackQuizGenerationStart],
  );

  const handleShareQuiz = useCallback(
    async (quiz) => {
      const quizId = Number(quiz?.quizId);

      if (!Number.isInteger(quizId) || quizId <= 0) return;

      const shouldShare = quiz?.communityShared !== true;

      await shareQuizToCommunity(quizId, shouldShare);

      showSuccess(
        shouldShare
          ? t("workspace.quiz.sharedToCommunitySuccess", "Quiz shared to the community.",
            )
          : t("workspace.quiz.unsharedFromCommunitySuccess", "Quiz moved back to private.",
            ),
      );
    },
    [showSuccess, t],
  );

  // Open quiz detail when the user selects a quiz from the list

  const handleViewQuiz = useCallback((quiz, options = null) => {
    const rawBackTarget = options?.backTarget || null;
    const normalizedQuizKnowledgeId = Number(quiz?.knowledgeId);
    const resolvedKnowledgeId =
      Number.isInteger(Number(rawBackTarget?.knowledgeId)) &&
      Number(rawBackTarget.knowledgeId) > 0
        ? Number(rawBackTarget.knowledgeId)
        : Number.isInteger(normalizedQuizKnowledgeId) && normalizedQuizKnowledgeId > 0
          ? normalizedQuizKnowledgeId
          : null;

    const backTarget =
      rawBackTarget?.view === "roadmap"
        ? {
            ...rawBackTarget,
            knowledgeId: resolvedKnowledgeId,
          }
        : rawBackTarget;

    setSelectedQuiz(quiz);

    setQuizBackTarget(backTarget);

    if (
      backTarget?.view === "roadmap" &&
      Number.isInteger(Number(backTarget?.phaseId)) &&
      Number(backTarget.phaseId) > 0
    ) {
      setSelectedRoadmapPhaseId(Number(backTarget.phaseId));
      setSelectedRoadmapKnowledgeId(
        Number.isInteger(Number(backTarget?.knowledgeId)) &&
          Number(backTarget.knowledgeId) > 0
          ? Number(backTarget.knowledgeId)
          : null,
      );
    }

    setActiveView("quizDetail");
  }, []);

  const handleViewPostLearning = useCallback(
    (quiz) => {
      handleViewQuiz(quiz, { backTarget: { view: "postLearning" } });
    },
    [handleViewQuiz],
  );

  // Move from quiz detail to edit mode

  const handleEditQuiz = useCallback((quiz, options = null) => {
    const backTarget = options?.backTarget || null;

    setSelectedQuiz(quiz);
    setQuizBackTarget(backTarget);

    if (
      backTarget?.view === "roadmap" &&
      Number.isInteger(Number(backTarget?.phaseId)) &&
      Number(backTarget.phaseId) > 0
    ) {
      setSelectedRoadmapPhaseId(Number(backTarget.phaseId));
    }

    setActiveView("editQuiz");
  }, []);

  const handleCreateSimilarQuiz = useCallback((quiz) => {
    setSelectedQuiz({ ...quiz, _editMode: "clone" });
    setQuizBackTarget(null);
    setActiveView("editQuiz");
  }, []);

  // Save quiz edits and return to detail view

  const handleSaveQuiz = useCallback((updatedQuiz) => {
    setSelectedQuiz((prev) => ({ ...prev, ...updatedQuiz }));

    setActiveView("quizDetail");
  }, []);

  // Handle flashcard creation callback after the API flow finishes

  const handleCreateFlashcard = useCallback(async (createdFlashcard = null) => {
    const scopeId = Number(workspaceId) || 0;
    const queryKey = ["workspace-flashcards", "WORKSPACE", scopeId];
    const flashcardSetId = Number(
      createdFlashcard?.flashcardSetId ??
      createdFlashcard?.id ??
      createdFlashcard?.data?.flashcardSetId,
    );

    if (scopeId > 0 && Number.isInteger(flashcardSetId) && flashcardSetId > 0) {
      queryClient.setQueryData(queryKey, (previousItems = []) => {
        const safePreviousItems = Array.isArray(previousItems) ? previousItems : [];

        if (
          safePreviousItems.some(
            (item) => Number(item?.flashcardSetId ?? item?.id) === flashcardSetId,
          )
        ) {
          return safePreviousItems;
        }

        const nowIso = new Date().toISOString();
        const optimisticItem = {
          flashcardSetId,
          flashcardSetName:
            createdFlashcard?.flashcardSetName ||
            createdFlashcard?.name ||
            `${t("workspace.flashcard.createTitle")} #${flashcardSetId}`,
          status: String(createdFlashcard?.status || "DRAFT").toUpperCase(),
          createVia: createdFlashcard?.createVia || "AI",
          itemCount: Number(createdFlashcard?.itemCount ?? 0),
          createdAt: createdFlashcard?.createdAt || nowIso,
          updatedAt: createdFlashcard?.updatedAt || nowIso,
        };

        return [optimisticItem, ...safePreviousItems];
      });
    }

    void queryClient.invalidateQueries({ queryKey });

    // Return to the list view so it can refresh
    setActiveView("flashcard");
  }, [queryClient, t, workspaceId]);

  // Open flashcard detail from the list

  const handleViewFlashcard = useCallback((flashcard) => {
    setSelectedFlashcard(flashcard);

    setActiveView("flashcardDetail");
  }, []);

  // Delete a flashcard set via API

  const handleDeleteFlashcard = useCallback(async (flashcard) => {
    if (!window.confirm(t("workspace.confirmDeleteFlashcard"))) return;

    try {
      const { deleteFlashcardSet } = await import("@/api/FlashcardAPI");

      await deleteFlashcardSet(flashcard.flashcardSetId);

      // Return to the list view so it can refresh

      setActiveView("flashcard");
    } catch (err) {
      console.error("Delete flashcard failed:", err);
    }
  }, []);

  // Create a roadmap for the individual workspace

  const handleCreateRoadmap = useCallback(
    async (data) => {
      if (roadmapCreationBlocked) {
        setPlanUpgradeFeatureName("Tạo lộ trình học tập");

        setPlanUpgradeModalOpen(true);

        return;
      }

      try {
        await createRoadmapForWorkspace({
          workspaceId,

          ...data,

          mode: "ai",

          name: data.name || "Roadmap",

          goal: data.goal || data.description || "",

          description: data.goal || data.description || "",
        });

        setActiveView("roadmap");
      } catch (err) {
        // Log roadmap creation errors for debugging

        console.error("Create roadmap failed:", err);

        throw err;
      }
    },
    [workspaceId, roadmapCreationBlocked],
  );

  // Go back to the matching list view when the user presses Back in a form

  const handleBackFromForm = useCallback(() => {
    if (activeView === "quizDetail" && quizBackTarget?.view === "roadmap") {
      const phaseId = Number(quizBackTarget?.phaseId);
      const knowledgeId = Number(quizBackTarget?.knowledgeId);

      setSelectedQuiz(null);

      setActiveView("roadmap");

      if (Number.isInteger(phaseId) && phaseId > 0) {
        setSelectedRoadmapPhaseId(phaseId);
        setSelectedRoadmapKnowledgeId(
          Number.isInteger(knowledgeId) && knowledgeId > 0 ? knowledgeId : null,
        );

        const normalizedRoadmapId = Number(
          quizBackTarget?.roadmapId || roadmapAiRoadmapId,
        );

        if (
          workspaceId &&
          Number.isInteger(normalizedRoadmapId) &&
          normalizedRoadmapId > 0
        ) {
          const roadmapPhasePath = buildWorkspaceRoadmapPhasePath(
            workspaceId,
            normalizedRoadmapId,
            phaseId,
          );

          const roadmapKnowledgePath =
            Number.isInteger(knowledgeId) && knowledgeId > 0
              ? `${roadmapPhasePath}/${workspaceKnowledgesPath}/${knowledgeId}`
              : roadmapPhasePath;

          navigate(roadmapKnowledgePath, { replace: true });
        } else if (workspaceId) {
          navigate(buildWorkspaceRoadmapsPath(workspaceId), { replace: true });
        }
      }

      return;
    }

    if (
      activeView === "quizDetail" &&
      quizBackTarget?.view === "postLearning"
    ) {
      setSelectedQuiz(null);

      setQuizBackTarget(null);

      setActiveView("postLearning");

      if (workspaceId) {
        navigate(
          buildWorkspacePath(workspaceId, workspacePostLearningsPath),
          { replace: true },
        );
      }

      return;
    }

    const formToList = {
      createRoadmap: "roadmap",
      createQuiz: "quiz",
      createFlashcard: "flashcard",
      quizDetail: "quiz",
      editQuiz: "quizDetail",
      flashcardDetail: "flashcard",
      createMockTest: "mockTest",
      createPostLearning: "postLearning",
      mockTestDetail: "mockTest",
      editMockTest: "mockTestDetail",
    };

    const nextView = formToList[activeView] || null;

    if (nextView !== "quizDetail" && nextView !== "editQuiz") {
      setSelectedQuiz(null);

      setQuizBackTarget(null);
    }

    if (nextView !== "roadmap") {
      setSelectedRoadmapKnowledgeId(null);
    }

    if (nextView !== "flashcardDetail") {
      setSelectedFlashcard(null);
    }

    if (nextView !== "mockTestDetail" && nextView !== "editMockTest") {
      setSelectedMockTest(null);
    }

    setActiveView(nextView);
  }, [
    activeView,
    navigate,
    quizBackTarget,
    roadmapAiRoadmapId,
    workspaceId,
  ]);

  // Return to the mock-test list after creation succeeds

  const handleCreateMockTest = useCallback(async () => {
    invalidateMockTestQueries();
    setActiveView("mockTest");
  }, [invalidateMockTestQueries]);

  const handleCreatePostLearning = useCallback(async (payload) => {
    const quizId = Number(payload?.quizId);

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return;
    }

    setSelectedQuiz(null);

    setQuizBackTarget(null);

    setActiveView("postLearning");
  }, []);

  // Open mock-test detail view

  const handleViewMockTest = useCallback((mt) => {
    setSelectedMockTest(mt);

    setActiveView("mockTestDetail");
  }, []);

  // Open mock-test edit view

  const handleEditMockTest = useCallback((mt) => {
    setSelectedMockTest(mt);

    setActiveView("editMockTest");
  }, []);

  // Save mock-test edits and return to detail view

  const handleSaveMockTest = useCallback((updatedMt) => {
    setSelectedMockTest((prev) => ({ ...prev, ...updatedMt }));

    setActiveView("mockTestDetail");
  }, []);

  const handleWorkspaceProfileClick = useCallback(() => {
    if (isProfileConfigured) {
      setProfileOverviewOpen(true);

      setProfileConfigOpen(false);

      return;
    }

    setIsProfileUpdateMode(false);

    setProfileConfigOpen(true);

    setProfileOverviewOpen(false);
  }, [isProfileConfigured]);

  // Open the upload dialog only after the profile passes validation

  const handleUploadClickSafe = useCallback(() => {
    if (!isProfileConfigured) {
      // Profile is incomplete. Open profile config first.

      setProfileConfigOpen(true);

      setProfileOverviewOpen(false);
    } else {
      // Profile is valid. Allow uploads.

      setUploadDialogOpen(true);
    }
  }, [isProfileConfigured]);

  const handleSourceUpdated = useCallback((updatedSource) => {
    setSources((prev) =>
      prev.map((item) =>
        item.id === updatedSource.id ? { ...item, ...updatedSource } : item,
      ),
    );
  }, []);

  const activeSourceIds = useMemo(
    () =>
      sources
        .filter(
          (source) => String(source?.status || "").toUpperCase() === "ACTIVE",
        )
        .map((source) => Number(source?.id))
        .filter((id) => Number.isInteger(id) && id > 0),
    [sources],
  );

  const handleToggleMaterialSelection = useCallback((sourceId, isSelected) => {
    setSelectedSourceIds((prev) => {
      if (isSelected) {
        return prev.includes(sourceId) ? prev : [...prev, sourceId];
      }
      return prev.filter((id) => id !== sourceId);
    });
  }, []);

  const handleCreateRoadmapPhases = useCallback(() => {
    if (isSubmittingRoadmapPhaseRequest) return;

    if (roadmapCreationBlocked) {
      setPlanUpgradeFeatureName("Tạo lộ trình học tập");
      setPlanUpgradeModalOpen(true);
      return;
    }

    handleOpenRoadmapPhaseDialog();
  }, [
    handleOpenRoadmapPhaseDialog,
    isSubmittingRoadmapPhaseRequest,
    roadmapCreationBlocked,
  ]);

  const chatPanelProps = {
    isDarkMode: personalWorkspaceIsDark,
    sources,
    accessHistory,
    workspaceTitle:
      currentWorkspace?.displayTitle ||
      currentWorkspace?.title ||
      currentWorkspace?.name ||
      "",
    workspacePurpose: getProfilePurpose(workspaceProfile),
    selectedSourceIds,
    onSelectedSourceIdsChange: setSelectedSourceIds,
    onToggleMaterialSelection: handleToggleMaterialSelection,
    selectedRoadmapPhaseId,
    selectedRoadmapKnowledgeId,
    activeView,
    onUploadClick: handleUploadClickSafe,
    onChangeView: handleStudioAction,
    onCreateQuiz: handleCreateQuiz,
    onCreateFlashcard: handleCreateFlashcard,
    onCreateRoadmap: handleCreateRoadmap,
    onCreateRoadmapPhases: handleCreateRoadmapPhases,
    onCreateRoadmapPhasesDirect: (materialIds = []) =>
      handleSubmitRoadmapPhaseDialog({ materialIds }),
    onNavigateHome: () => navigate("/home"),
    onRoadmapPhaseFocus: handleSelectRoadmapPhase,
    onCreatePhaseKnowledge: handleCreatePhaseKnowledge,
    onCreateKnowledgeQuizForKnowledge: handleCreateKnowledgeQuizForKnowledge,
    onCreatePhasePreLearning: handleCreatePhasePreLearning,
    isStudyNewRoadmap,
    adaptationMode: workspaceAdaptationMode,
    isGeneratingRoadmapPhases,
    roadmapPhaseGenerationProgress: effectiveRoadmapPhaseGenerationProgress,
    generatingKnowledgePhaseIds,
    generatingKnowledgeQuizPhaseIds,
    generatingKnowledgeQuizKnowledgeKeys,
    knowledgeQuizRefreshByKey,
    generatingPreLearningPhaseIds,
    skipPreLearningPhaseIds,
    roadmapReloadToken,
    onReloadRoadmap: bumpRoadmapReloadToken,
    onCreateMockTest: handleCreateMockTest,
    onCreatePostLearning: handleCreatePostLearning,
    onBack: handleBackFromForm,
    workspaceId,
    selectedQuiz,
    onViewQuiz: handleViewQuiz,
    onViewPostLearning: handleViewPostLearning,
    onEditQuiz: handleEditQuiz,
    onSaveQuiz: handleSaveQuiz,
    onCreateSimilarQuiz: handleCreateSimilarQuiz,
    onShareQuiz: handleShareQuiz,
    selectedFlashcard,
    onViewFlashcard: handleViewFlashcard,
    onDeleteFlashcard: handleDeleteFlashcard,
    selectedMockTest,
    onViewMockTest: handleViewMockTest,
    onEditMockTest: handleEditMockTest,
    onSaveMockTest: handleSaveMockTest,
    onAddSource: handleUploadClickSafe,
    onRemoveSource: handleRemoveSource,
    onRemoveMultiple: handleRemoveMultipleSources,
    onSourceUpdated: handleSourceUpdated,
    shouldDisableQuiz,
    shouldDisableFlashcard,
    shouldDisableRoadmap: shouldDisableRoadmapForStudio,
    shouldDisableCreateQuiz,
    shouldDisableCreateFlashcard,
    shouldDisableCreateMockTest,
    progressTracking,
    roadmapHasPhases,
    completedQuizCount,
    quizGenerationTaskByQuizId,
    quizGenerationProgressByQuizId,
    planEntitlements,
    onEditRoadmapConfig: () => setRoadmapConfigEditOpen(true),
    isSubmittingRoadmapPhaseGeneration: isSubmittingRoadmapPhaseRequest,
    roadmapConfigSummary: roadmapConfigInitialValues,
    activeSourceCount: activeSourceIds.length,
  };

  return (
    <div
      className={cn(
        "h-screen overflow-hidden transition-colors duration-200",
        personalWorkspaceIsDark
          ? "bg-slate-950 text-slate-100"
          : "bg-[#f5f7fb] text-slate-900",
      )}
    >
      <div className="flex h-full min-h-0 overflow-hidden transition-colors duration-200">
        <PersonalWorkspaceSidebar
          isDarkMode={isDarkMode}
          workspaceTitle={
            currentWorkspace?.displayTitle ||
            currentWorkspace?.title ||
            currentWorkspace?.name ||
            ""
          }
          activeView={activeView || "sources"}
          onNavigate={handleStudioAction}
          onOpenProfile={handleWorkspaceProfileClick}
          onToggleLanguage={toggleLanguage}
          onToggleDarkMode={toggleDarkMode}
          onEditWorkspace={async (data) => {
            await editWorkspace(Number(workspaceId), data);
            }}
            wsConnected={wsConnected}
            walletRefreshToken={walletRealtimeTick}
            disabledMap={{
            roadmap: shouldDisableRoadmapForStudio,
            quiz: shouldDisableQuiz,
            flashcard: shouldDisableFlashcard,
            mockTest: shouldDisableMockTest,
            questionStats: !planEntitlements.hasWorkspaceAnalytics,
          }}
          badgeMap={{
            sources: sources.length || undefined,
            quiz: totalQuizCount || undefined,
            flashcard: totalFlashcardCount || undefined,
            mockTest: totalMockTestCount || undefined,
          }}
          isMobile={isMobileViewport}
          mobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden transition-colors duration-200">
          {mockTestGenerationState !== "idle" ? (
            <div className="px-4 pt-4 sm:px-5 lg:px-6">
              <div
                className={cn(
                  "mx-auto max-w-[1740px] rounded-[24px] border px-4 py-3 transition-colors duration-200",
                  mockTestGenerationState === "ready"
                    ? (personalWorkspaceIsDark
                      ? "border-emerald-700/60 bg-emerald-950/35 text-emerald-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800")
                    : isMockTestTakingLongerThanExpected
                      ? (personalWorkspaceIsDark
                        ? "border-amber-700/60 bg-amber-950/35 text-amber-200"
                        : "border-amber-200 bg-amber-50 text-amber-800")
                      : mockTestGenerationState === "error"
                        ? (personalWorkspaceIsDark
                          ? "border-rose-700/60 bg-rose-950/35 text-rose-200"
                          : "border-rose-200 bg-rose-50 text-rose-800")
                        : (personalWorkspaceIsDark
                          ? "border-cyan-700/60 bg-cyan-950/35 text-cyan-200"
                          : "border-cyan-200 bg-cyan-50 text-cyan-800"),
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${fontClass}`}>
                      {mockTestGenerationDisplayMessage}
                    </p>

                    <div className={cn(
                      "mt-2 h-2 overflow-hidden rounded-full transition-colors duration-200",
                      personalWorkspaceIsDark ? "bg-slate-800/90" : "bg-white/80",
                    )}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          mockTestGenerationState === "ready"
                            ? "bg-emerald-500"
                            : isMockTestAwaitingBackend
                              ? "bg-[linear-gradient(90deg,#22d3ee,#38bdf8,#22d3ee)] bg-[length:200%_100%] animate-pulse"
                              : mockTestGenerationState === "error"
                                ? "bg-rose-500"
                                : "bg-cyan-500"
                        }`}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              Number(mockTestGenerationProgress) || 0,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${fontClass}`}>
                      {mockTestGenerationDisplayLabel}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (mockTestGenerationState === "ready") {
                          resetMockTestGenerationStatus();

                          handleStudioAction("mockTest");

                          return;
                        }

                        if (mockTestGenerationState === "pending") {
                          checkMockTestGenerationStatusNow();

                          return;
                        }

                        setProfileConfigOpen(true);

                        setProfileOverviewOpen(false);
                      }}
                      className={cn(
                        "rounded-full transition-colors duration-200",
                        personalWorkspaceIsDark
                          ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                          : "border-white bg-white text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {mockTestGenerationState === "ready"
                        ? "Mở Mock test"
                        : mockTestGenerationState === "pending"
                          ? "Kiểm tra lại ngay"
                          : "Xem trạng thái"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isMobileViewport ? (
            <div className="px-4 pt-4 sm:px-5 lg:px-6">
              <div className="mx-auto flex max-w-[1740px] items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-2xl transition-colors duration-200",
                    personalWorkspaceIsDark
                      ? "border-slate-700 bg-slate-900 text-slate-100 shadow-[0_16px_36px_rgba(2,6,23,0.35)]"
                      : "border-slate-200 bg-white text-slate-700 shadow-[0_16px_36px_rgba(15,23,42,0.12)]",
                  )}
                  aria-label={t("workspace.shell.openSidebar", "Open sidebar")}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
            <ChatPanel {...chatPanelProps} />
          </div>
        </div>
      </div>

      {/* Upload dialog */}

      {uploadDialogOpen ? (
        <DeferredWorkspaceDialog>
          <LazyUploadSourceDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            isDarkMode={personalWorkspaceIsDark}
            onUploadFiles={handleUploadFiles}
            workspaceId={workspaceId}
            onSuggestedImported={fetchSources}
            planEntitlements={planEntitlements}
          />
        </DeferredWorkspaceDialog>
      ) : null}

      {phaseGenerateDialogOpen ? (
        <DeferredWorkspaceDialog>
          <LazyRoadmapPhaseGenerateDialog
            open={phaseGenerateDialogOpen}
            onOpenChange={setPhaseGenerateDialogOpen}
            isDarkMode={personalWorkspaceIsDark}
            materials={sources}
            defaultSelectedMaterialIds={phaseGenerateDialogDefaultIds}
            submitting={isSubmittingRoadmapPhaseRequest}
            onSubmit={handleSubmitRoadmapPhaseDialog}
          />
        </DeferredWorkspaceDialog>
      ) : null}

      {profileConfigOpen ? (
        <DeferredWorkspaceDialog>
          <LazyIndividualWorkspaceProfileConfigDialog
            initialData={workspaceProfile}
            open={profileConfigOpen}
            onOpenChange={handleProfileConfigChange}
            onSave={handleSaveProfileConfig}
            onConfirm={handleConfirmProfileConfig}
            onUploadFiles={handleUploadFiles}
            isDarkMode={personalWorkspaceIsDark}
            canCreateRoadmap={canCreateRoadmap}
            uploadedMaterials={sources}
            workspaceId={workspaceId}
            forceStartAtStepOne={
              isProfileUpdateMode || (openProfileConfig && !isProfileConfigured && !continueProfileSetup)
            }
            mockTestGenerationState={mockTestGenerationState}
            mockTestGenerationMessage={mockTestGenerationDisplayMessage}
            mockTestGenerationProgress={mockTestGenerationProgress}
          />
        </DeferredWorkspaceDialog>
      ) : null}

      {profileOverviewOpen ? (
        <DeferredWorkspaceDialog>
          <LazyIndividualWorkspaceProfileOverviewDialog
            open={profileOverviewOpen}
            onOpenChange={handleProfileOverviewChange}
            isDarkMode={personalWorkspaceIsDark}
            profile={workspaceProfile}
            personalization={workspacePersonalization}
            materials={sources}
            onEditProfile={handleRequestProfileUpdate}
            editLocked={profileEditLocked}
          />
        </DeferredWorkspaceDialog>
      ) : null}

      {profileUpdateGuardOpen ? (
        <DeferredWorkspaceDialog>
          <LazyWorkspaceOnboardingUpdateGuardDialog
            open={profileUpdateGuardOpen}
            onOpenChange={setProfileUpdateGuardOpen}
            isDarkMode={personalWorkspaceIsDark}
            currentLang={i18n.language?.startsWith("en") ? "en" : "vi"}
            materialCount={materialCountForProfile}
            hasLearningData={hasWorkspaceLearningDataAtRisk}
            onDeleteAndContinue={handleDeleteMaterialsForProfileUpdate}
            deleting={isResettingWorkspaceForProfileUpdate}
          />
        </DeferredWorkspaceDialog>
      ) : null}

      <PlanUpgradeModal
        open={planUpgradeModalOpen}
        onOpenChange={setPlanUpgradeModalOpen}
        featureName={planUpgradeFeatureName}
        isDarkMode={personalWorkspaceIsDark}
      />

      <React.Suspense fallback={null}>
        <LazyRoadmapConfigEditDialog
          open={roadmapConfigEditOpen}
          onOpenChange={setRoadmapConfigEditOpen}
          isDarkMode={personalWorkspaceIsDark}
          initialValues={roadmapConfigInitialValues}
          hasExistingRoadmap={Boolean(
            extractRoadmapIdFromProfile(workspaceProfile),
          )}
          onSave={handleSaveRoadmapConfig}
        />
      </React.Suspense>
    </div>
  );
}

export default WorkspacePage;
