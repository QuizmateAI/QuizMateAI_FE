import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/Components/ui/button";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";
import { Globe, Moon, Sun, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProgressTracking } from "@/hooks/useProgressTracking";
import {
	getIndividualWorkspaceProfile,
	getWorkspacePersonalization,
	normalizeIndividualWorkspaceProfile,
	saveIndividualWorkspaceBasicStep,
	saveIndividualWorkspacePersonalInfoStep,
	saveIndividualWorkspaceRoadmapConfigStep,
	startIndividualWorkspaceMockTestPersonalInfoStep,
	confirmIndividualWorkspaceProfile,
} from "@/api/WorkspaceAPI";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useActiveTaskFallback } from "@/hooks/useActiveTaskFallback";
import {
	createRoadmapForWorkspace,
	deleteRoadmapKnowledgeById,
	deleteRoadmapPhaseById,
	getRoadmapGraph,
	getRoadmapStructureById,
} from "@/api/RoadmapAPI";
import { generateRoadmapKnowledgeQuiz, generateRoadmapPhaseContent, generateRoadmapPhases, generateRoadmapPreLearning } from "@/api/AIAPI";
import { getMaterialsByWorkspace, deleteMaterial, uploadMaterial } from "@/api/MaterialAPI";
import { deleteQuiz, getQuizzesByScope, shareQuizToCommunity } from "@/api/QuizAPI";
import { deleteFlashcardSet, getFlashcardsByScope } from "@/api/FlashcardAPI";
import { useToast } from "@/context/ToastContext";
import { inferProcessingRoadmapGenerationIds } from "@/Pages/Users/Individual/Workspace/utils/roadmapProcessing";
import ListSpinner from "@/Components/ui/ListSpinner";

const LazyRoadmapJourPanel = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/RoadmapJourPanel"));
const LazyUploadSourceDialog = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog"));
const LazyRoadmapPhaseGenerateDialog = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/RoadmapPhaseGenerateDialog"));
const LazyIndividualWorkspaceProfileConfigDialog = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog"));
const LazyIndividualWorkspaceProfileOverviewDialog = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog"));
const LazyWorkspaceOnboardingUpdateGuardDialog = React.lazy(() => import("@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog"));

const VIEW_TO_PATH = {
	roadmap: "roadmap",
	quiz: "quiz",
	communityQuiz: "quiz/community",
	flashcard: "flashcard",
	mockTest: "mock-test",
	postLearning: "post-learning",
	createQuiz: "quiz/create",
	createFlashcard: "flashcard/create",
	createMockTest: "mock-test/create",
	createPostLearning: "post-learning/create",
};

const PATH_TO_VIEW = Object.entries(VIEW_TO_PATH).reduce((result, [view, path]) => {
	result[path] = view;
	return result;
}, {});

function resolveViewFromSubPath(subPath) {
	if (!subPath) return { view: null, quizId: null, backTarget: null };

	const roadmapPathMatch = subPath.match(/^roadmap\/(\d+)(?:\/phase\/(\d+))?$/);
	if (roadmapPathMatch) {
		return {
			view: "roadmap",
			quizId: null,
			backTarget: null,
			roadmapId: Number(roadmapPathMatch[1]),
			phaseId: roadmapPathMatch[2] ? Number(roadmapPathMatch[2]) : null,
		};
	}

	const directView = PATH_TO_VIEW[subPath];
	if (directView) {
		return { view: directView, quizId: null, backTarget: null };
	}

	const roadmapQuizEditMatch = subPath.match(/^roadmap\/(\d+)\/phase\/(\d+)\/quiz\/(\d+)\/edit$/);
	if (roadmapQuizEditMatch) {
		return {
			view: "editQuiz",
			quizId: Number(roadmapQuizEditMatch[3]),
			backTarget: {
				view: "roadmap",
				roadmapId: Number(roadmapQuizEditMatch[1]),
				phaseId: Number(roadmapQuizEditMatch[2]),
			},
		};
	}

	const legacyRoadmapQuizEditMatch = subPath.match(/^roadmap\/quiz\/(\d+)\/edit$/);
	if (legacyRoadmapQuizEditMatch) {
		return {
			view: "editQuiz",
			quizId: Number(legacyRoadmapQuizEditMatch[1]),
			backTarget: { view: "roadmap" },
		};
	}

	const roadmapQuizDetailMatch = subPath.match(/^roadmap\/(\d+)\/phase\/(\d+)\/quiz\/(\d+)$/);
	if (roadmapQuizDetailMatch) {
		return {
			view: "quizDetail",
			quizId: Number(roadmapQuizDetailMatch[3]),
			backTarget: {
				view: "roadmap",
				roadmapId: Number(roadmapQuizDetailMatch[1]),
				phaseId: Number(roadmapQuizDetailMatch[2]),
			},
		};
	}

	const legacyRoadmapQuizDetailMatch = subPath.match(/^roadmap\/quiz\/(\d+)$/);
	if (legacyRoadmapQuizDetailMatch) {
		return {
			view: "quizDetail",
			quizId: Number(legacyRoadmapQuizDetailMatch[1]),
			backTarget: { view: "roadmap" },
		};
	}

	const quizEditMatch = subPath.match(/^quiz\/(\d+)\/edit$/);
	if (quizEditMatch) {
		return { view: "editQuiz", quizId: Number(quizEditMatch[1]), backTarget: null };
	}

	const quizDetailMatch = subPath.match(/^quiz\/(\d+)$/);
	if (quizDetailMatch) {
		return { view: "quizDetail", quizId: Number(quizDetailMatch[1]), backTarget: null };
	}

	return { view: null, quizId: null, backTarget: null };
}

function buildPathForView(view, selectedQuiz, quizBackTarget) {
	if (view === "quizDetail" && selectedQuiz?.quizId) {
		if (quizBackTarget?.view === "roadmap") {
			const normalizedRoadmapId = Number(quizBackTarget?.roadmapId);
			const normalizedPhaseId = Number(quizBackTarget?.phaseId);
			if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0 && Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
				return `roadmap/${normalizedRoadmapId}/phase/${normalizedPhaseId}/quiz/${selectedQuiz.quizId}`;
			}
			return `roadmap/quiz/${selectedQuiz.quizId}`;
		}
		return `quiz/${selectedQuiz.quizId}`;
	}

	if (view === "editQuiz" && selectedQuiz?.quizId) {
		if (quizBackTarget?.view === "roadmap") {
			const normalizedRoadmapId = Number(quizBackTarget?.roadmapId);
			const normalizedPhaseId = Number(quizBackTarget?.phaseId);
			if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0 && Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
				return `roadmap/${normalizedRoadmapId}/phase/${normalizedPhaseId}/quiz/${selectedQuiz.quizId}/edit`;
			}
			return `roadmap/quiz/${selectedQuiz.quizId}/edit`;
		}
		return `quiz/${selectedQuiz.quizId}/edit`;
	}

	return VIEW_TO_PATH[view] || null;
}

function isProfileOnboardingDone(profileData) {
	return profileData?.onboardingCompleted === true || profileData?.workspaceSetupStatus === "DONE";
}

function hasCompletedProfileStepTwo(profileData) {
	return Number(profileData?.currentStep) >= 3 || ["PROFILE_DONE", "DONE"].includes(profileData?.workspaceSetupStatus);
}

function extractProfileData(response) {
	return normalizeIndividualWorkspaceProfile(response?.data?.data || response?.data || response || null);
}

function extractRoadmapIdFromProfile(profileData) {
	const rawRoadmapId = profileData?.roadmap_id ?? profileData?.roadmapId ?? null;
	const roadmapId = Number(rawRoadmapId);
	return Number.isInteger(roadmapId) && roadmapId > 0 ? roadmapId : null;
}

function normalizePositiveIds(ids = []) {
	return Array.from(new Set((ids || [])
		.map((id) => Number(id))
		.filter((id) => Number.isInteger(id) && id > 0)));
}

function clampPercent(value) {
	return Math.max(0, Math.min(100, Number(value) || 0));
}

function isActiveMaterial(material) {
	return String(material?.status || "").toUpperCase() === "ACTIVE";
}

function translateOrFallbackWithOptions(t, key, options, fallback) {
	const translated = t(key, options);
	return translated === key ? fallback : translated;
}

function getProfilePurpose(profileData) {
	return profileData?.workspacePurpose || profileData?.learningMode || "";
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

function isMockTestGenerationInProgress(profileData) {
	if (getProfilePurpose(profileData) !== "MOCK_TEST") return false;

	if (profileData?.currentStep >= 3 || ["PROFILE_DONE", "DONE"].includes(profileData?.workspaceSetupStatus)) {
		return false;
	}

	return Boolean(
		profileData?.currentLevel
		|| profileData?.learningGoal
		|| profileData?.mockExamName
		|| profileData?.examName
		|| profileData?.mockExamName
	);
}

function shouldKeepProfileWizardClosed(profileData, storedMockTestGeneration) {
	return isMockTestGenerationInProgress(profileData) && Boolean(storedMockTestGeneration?.shouldCloseAfterStart);
}

function translateOrFallback(t, key, fallback) {
	const translated = t(key);
	return translated === key ? fallback : translated;
}

function delay(ms) {
	return new Promise((resolve) => {
		globalThis.setTimeout(resolve, ms);
	});
}

function DeferredWorkspacePanel({ children }) {
	return (
		<React.Suspense fallback={<ListSpinner variant="section" className="h-full" />}>
			{children}
		</React.Suspense>
	);
}

function DeferredWorkspaceDialog({ children }) {
	return (
		<React.Suspense fallback={null}>
			{children}
		</React.Suspense>
	);
}

function WorkspacePage() {
	const { workspaceId } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const { showError, showSuccess } = useToast();
	const { isDarkMode, toggleDarkMode } = useDarkMode();
	const openProfileConfig = location.state?.openProfileConfig || false;
	const [profileConfigOpen, setProfileConfigOpen] = useState(false);
	const [profileOverviewOpen, setProfileOverviewOpen] = useState(false);
	const [profileUpdateGuardOpen, setProfileUpdateGuardOpen] = useState(false);
	const [isProfileUpdateMode, setIsProfileUpdateMode] = useState(false);
	const [isResettingWorkspaceForProfileUpdate, setIsResettingWorkspaceForProfileUpdate] = useState(false);
	const [isProfileConfigured, setIsProfileConfigured] = useState(false);
	const [workspaceProfile, setWorkspaceProfile] = useState(null);
	const [workspacePersonalization, setWorkspacePersonalization] = useState(null);
	const [mockTestGenerationState, setMockTestGenerationState] = useState("idle");
	const [mockTestGenerationMessage, setMockTestGenerationMessage] = useState("");
	const [mockTestGenerationProgress, setMockTestGenerationProgress] = useState(0);
	const [mockTestGenerationStartedAt, setMockTestGenerationStartedAt] = useState(null);
	const [mockTestGenerationElapsedSeconds, setMockTestGenerationElapsedSeconds] = useState(0);

	const { currentWorkspace, fetchWorkspaceDetail, editWorkspace } = useWorkspace({ enabled: false });
	const progressTracking = useProgressTracking({
		scopeKey: workspaceId ? `workspace:${workspaceId}` : null,
	});
	const reconcileMaterialProgress = progressTracking.reconcileMaterialProgress;
	const isMountedRef = useRef(true);
	const mockTestPollingActiveRef = useRef(false);
	const mockTestPollingRunRef = useRef(0);
	const mockTestProgressTimerRef = useRef(null);
	const mockTestElapsedTimerRef = useRef(null);
	const mockTestReadyAutoHideTimerRef = useRef(null);
	const mockTestAutoFinalizePayloadRef = useRef(null);
	const mockTestShouldCloseAfterStartRef = useRef(false);
	const mockTestGenerationStorageKey = workspaceId ? `workspace_${workspaceId}_mockTestGeneration` : null;

	// State quáº£n lÃ½ tÃ i liá»‡u (sources) â€" mock data, sáº½ káº¿t ná»'i API sau
	const [sources, setSources] = useState([]);
	const [selectedSourceIds, setSelectedSourceIds] = useState([]); // Selected sources from SourcesPanel
	const [createdItems, setCreatedItems] = useState([]);
	const [quizGenerationTaskByQuizId, setQuizGenerationTaskByQuizId] = useState({});
	const [quizGenerationProgressByQuizId, setQuizGenerationProgressByQuizId] = useState({});
	const [accessHistory, setAccessHistory] = useState([]);

	// State quáº£n lÃ½ dialog upload â€" chá»‰ má»Ÿ khi workspace chÆ°a cÃ³ tÃ i liá»‡u sau láº§n fetch Ä'áº§u tiÃªn
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
	const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);
	const [hasStudioManualPreference, setHasStudioManualPreference] = useState(false);
	const [isMaterialDetailOpen, setIsMaterialDetailOpen] = useState(false);
	const workspaceLayoutRef = useRef(null);
	const [workspaceLayoutWidth, setWorkspaceLayoutWidth] = useState(0);

	// Tráº¡ng thÃ¡i hiá»ƒn thá»‹ ná»™i dung chÃ­nh â€" Æ°u tiÃªn route hiá»‡n táº¡i, khÃ´ng dÃ¹ng sessionStorage
	const [activeView, setActiveView] = useState(() => {
		if (!workspaceId) return null;

		const prefix = `/workspace/${workspaceId}`;
		if (location.pathname.startsWith(prefix)) {
			const subPath = location.pathname.slice(prefix.length).replace(/^\/+/, "");
			const { view: routeView } = resolveViewFromSubPath(subPath);
			if (routeView) {
				return routeView;
			}
		}

		return null;
	});
	// State lÆ°u quiz Ä'ang Ä'Æ°á»£c xem chi tiáº¿t hoáº·c chá»‰nh sá»­a
	const [selectedQuiz, setSelectedQuiz] = useState(null);
	const [quizBackTarget, setQuizBackTarget] = useState(null);
	// State lÆ°u flashcard Ä'ang Ä'Æ°á»£c xem chi tiáº¿t
	const [selectedFlashcard, setSelectedFlashcard] = useState(null);
	// State lÆ°u mock test Ä'ang Ä'Æ°á»£c xem chi tiáº¿t hoáº·c chá»‰nh sá»­a
	const [selectedMockTest, setSelectedMockTest] = useState(null);
	const [selectedRoadmapPhaseId, setSelectedRoadmapPhaseId] = useState(null);
	const [roadmapReloadToken, setRoadmapReloadToken] = useState(0);
	const [phaseGenerateDialogOpen, setPhaseGenerateDialogOpen] = useState(false);
	const [phaseGenerateDialogDefaultIds, setPhaseGenerateDialogDefaultIds] = useState([]);
	const [roadmapAiRoadmapId, setRoadmapAiRoadmapId] = useState(null);
	const [roadmapHasPhases, setRoadmapHasPhases] = useState(false);
	const [isRoadmapStructureMissing, setIsRoadmapStructureMissing] = useState(false);
	const [roadmapEnabledState, setRoadmapEnabledState] = useState(null);
	const [hasExistingWorkspaceQuiz, setHasExistingWorkspaceQuiz] = useState(false);
	const [hasExistingWorkspaceFlashcard, setHasExistingWorkspaceFlashcard] = useState(false);
	const [isGeneratingRoadmapPhases, setIsGeneratingRoadmapPhases] = useState(false);
	const [roadmapPhaseGenerationProgress, setRoadmapPhaseGenerationProgress] = useState(0);
	const [roadmapPhaseGenerationTaskId, setRoadmapPhaseGenerationTaskId] = useState(null);
	const [isGeneratingRoadmapStructure, setIsGeneratingRoadmapStructure] = useState(false);
	const [isSubmittingRoadmapPhaseRequest, setIsSubmittingRoadmapPhaseRequest] = useState(false);
	const [generatingKnowledgePhaseIds, setGeneratingKnowledgePhaseIds] = useState([]);
	const [generatingKnowledgeQuizPhaseIds, setGeneratingKnowledgeQuizPhaseIds] = useState([]);
	const [generatingKnowledgeQuizKnowledgeKeys, setGeneratingKnowledgeQuizKnowledgeKeys] = useState([]);
	const [knowledgeQuizRefreshByKey, setKnowledgeQuizRefreshByKey] = useState({});
	const [generatingPreLearningPhaseIds, setGeneratingPreLearningPhaseIds] = useState([]);
	const [skipPreLearningPhaseIds, setSkipPreLearningPhaseIds] = useState([]);
	const roadmapPhaseGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_roadmapPhaseGenerating` : null;
	const phaseContentGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_phaseContentGeneratingPhaseIds` : null;
	const preLearningGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_preLearningGeneratingPhaseIds` : null;
	const skipPreLearningPhaseStorageKey = workspaceId ? `workspace_${workspaceId}_skipPreLearningPhaseIds` : null;
	const preLearningRequestGuardStorageKey = workspaceId ? `workspace_${workspaceId}_preLearningRequestGuard` : null;
	const phaseGenerationPollingRef = useRef({ runId: 0, active: false });
	const phaseContentPollingRef = useRef({});
	const phaseContentRequestInFlightRef = useRef({});
	const preLearningPollingRef = useRef({});
	const preLearningRequestGuardRef = useRef({});
	const roadmapStructureSyncRunRef = useRef(0);
	const nonStudyPreLearningAutoRunRef = useRef({ runId: 0, active: false });
	const knowledgeQuizPollingRef = useRef({});
	const knowledgeQuizGenerationRequestedRef = useRef({});
	const knowledgeQuizGenerationRequestedByKnowledgeRef = useRef({});
	const roadmapReloadThrottleRef = useRef({
		lastBumpAt: 0,
		timerId: null,
	});
	const bumpRoadmapReloadToken = useCallback(() => {
		const now = Date.now();
		const minIntervalMs = 800;
		const elapsed = now - roadmapReloadThrottleRef.current.lastBumpAt;

		if (elapsed >= minIntervalMs) {
			roadmapReloadThrottleRef.current.lastBumpAt = now;
			setRoadmapReloadToken((current) => current + 1);
			return;
		}

		if (roadmapReloadThrottleRef.current.timerId) {
			return;
		}

		const waitMs = Math.max(0, minIntervalMs - elapsed);
		roadmapReloadThrottleRef.current.timerId = globalThis.setTimeout(() => {
			roadmapReloadThrottleRef.current.timerId = null;
			roadmapReloadThrottleRef.current.lastBumpAt = Date.now();
			setRoadmapReloadToken((current) => current + 1);
		}, waitMs);
	}, []);

	const bumpKnowledgeQuizRefreshByKeys = useCallback((knowledgeKeys = []) => {
		const normalizedKeys = Array.from(new Set((knowledgeKeys || [])
			.map((key) => String(key || "").trim())
			.filter((key) => key.length > 0)));

		if (normalizedKeys.length === 0) return;

		setKnowledgeQuizRefreshByKey((current) => {
			const next = { ...current };
			normalizedKeys.forEach((key) => {
				next[key] = (Number(next[key]) || 0) + 1;
			});
			return next;
		});
	}, []);

	useEffect(() => {
		return () => {
			if (roadmapReloadThrottleRef.current.timerId) {
				globalThis.clearTimeout(roadmapReloadThrottleRef.current.timerId);
				roadmapReloadThrottleRef.current.timerId = null;
			}
		};
	}, []);

	// Háº±ng sá»' kÃ­ch thÆ°á»›c panel
	const COLLAPSED_WIDTH = 56;
	const PANEL_GAP = 16;
	const SOURCES_PANEL_MIN_WIDTH = 320;
	const SOURCES_PANEL_DETAIL_WIDTH = 380;
	const STUDIO_PANEL_MIN_WIDTH = 288;
	const CHAT_PANEL_MIN_WIDTH = 760;
	const CHAT_PANEL_COMFORT_WIDTH = 840;

	const isRoadmapJourActive = activeView === "roadmap"
		|| (quizBackTarget?.view === "roadmap" && (activeView === "quizDetail" || activeView === "editQuiz"));
	const shouldProtectSourcesSpace = isMaterialDetailOpen || isRoadmapJourActive;
	const sourcesPanelTargetWidth = useMemo(() => (
		shouldProtectSourcesSpace ? SOURCES_PANEL_DETAIL_WIDTH : SOURCES_PANEL_MIN_WIDTH
	), [shouldProtectSourcesSpace]);
	const bothExpandedHardMinLayoutWidth = sourcesPanelTargetWidth + STUDIO_PANEL_MIN_WIDTH + CHAT_PANEL_MIN_WIDTH + (PANEL_GAP * 2);
	const bothExpandedPreferredLayoutWidth = sourcesPanelTargetWidth + STUDIO_PANEL_MIN_WIDTH + CHAT_PANEL_COMFORT_WIDTH + (PANEL_GAP * 2);
	const sourcesPriorityMinLayoutWidth = sourcesPanelTargetWidth + COLLAPSED_WIDTH + CHAT_PANEL_MIN_WIDTH + (PANEL_GAP * 2);
	const railsOnlyMinLayoutWidth = (COLLAPSED_WIDTH * 2) + CHAT_PANEL_MIN_WIDTH + (PANEL_GAP * 2);
	const shouldStackSidePanels = workspaceLayoutWidth > 0
		&& (
			workspaceLayoutWidth < railsOnlyMinLayoutWidth
			|| (shouldProtectSourcesSpace && workspaceLayoutWidth < sourcesPriorityMinLayoutWidth)
		);
	const shouldPreferStudioCollapse = !shouldStackSidePanels
		&& workspaceLayoutWidth > 0
		&& workspaceLayoutWidth < bothExpandedPreferredLayoutWidth;
	const shouldForceStudioCollapse = !shouldStackSidePanels
		&& workspaceLayoutWidth > 0
		&& workspaceLayoutWidth < bothExpandedHardMinLayoutWidth;
	const shouldForceSourcesCollapse = !shouldStackSidePanels
		&& workspaceLayoutWidth > 0
		&& workspaceLayoutWidth < sourcesPriorityMinLayoutWidth;
	const effectiveSourcesCollapsed = !shouldStackSidePanels && (isSourcesCollapsed || shouldForceSourcesCollapse);
	const effectiveStudioCollapsed = !shouldStackSidePanels && (
		shouldForceStudioCollapse
		|| (hasStudioManualPreference ? isStudioCollapsed : shouldPreferStudioCollapse)
	);
	const effectiveLeftWidth = effectiveSourcesCollapsed ? COLLAPSED_WIDTH : sourcesPanelTargetWidth;
	const effectiveRightWidth = effectiveStudioCollapsed ? COLLAPSED_WIDTH : STUDIO_PANEL_MIN_WIDTH;
	const [hasActivatedRoadmapPanel, setHasActivatedRoadmapPanel] = useState(false);
	const isOnWorkspaceQuizRoute = useMemo(() => {
		if (!workspaceId || !location.pathname) return false;
		return new RegExp(`^/workspace/${workspaceId}/(?:quiz(?:/|$)|roadmap/(?:\\d+/phase/\\d+/)?quiz(?:/|$))`).test(location.pathname);
	}, [location.pathname, workspaceId]);
	const focusRoadmapViewSafely = useCallback(() => {
		if (isOnWorkspaceQuizRoute) return;
		setActiveView("roadmap");
	}, [isOnWorkspaceQuizRoute]);
	const effectiveRoadmapPhaseGenerationProgress = useMemo(() => {
		const progressFromTask = roadmapPhaseGenerationTaskId
			? Number(progressTracking?.progressByTaskId?.[roadmapPhaseGenerationTaskId] ?? 0)
			: 0;
		return clampPercent(progressFromTask > 0 ? progressFromTask : roadmapPhaseGenerationProgress);
	}, [progressTracking?.progressByTaskId, roadmapPhaseGenerationProgress, roadmapPhaseGenerationTaskId]);
	const shouldRenderRoadmapJourPanel = hasActivatedRoadmapPanel || isRoadmapJourActive;

	useEffect(() => {
		if (isRoadmapJourActive) {
			setHasActivatedRoadmapPanel(true);
		}
	}, [isRoadmapJourActive]);

	useEffect(() => {
		if (!workspaceId) {
			setHasExistingWorkspaceQuiz(false);
			setHasExistingWorkspaceFlashcard(false);
			setQuizGenerationTaskByQuizId({});
			setQuizGenerationProgressByQuizId({});
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

				const workspaceQuizzes = (quizResponse?.data || []).filter((quiz) => {
					const qContext = String(quiz?.contextType || "").toUpperCase();
					if (["ROADMAP", "PHASE", "KNOWLEDGE"].includes(qContext)) return false;
					if (Number(quiz?.roadmapId) > 0 || Number(quiz?.phaseId) > 0 || Number(quiz?.knowledgeId) > 0) return false;
					return true;
				});

				const workspaceFlashcards = Array.isArray(flashcardResponse?.data)
					? flashcardResponse.data
					: [];

				setHasExistingWorkspaceQuiz(workspaceQuizzes.length > 0);
				setHasExistingWorkspaceFlashcard(workspaceFlashcards.length > 0);
			} catch (error) {
				if (!cancelled) {
					console.error("Không thể đồng bộ trạng thái quiz/flashcard workspace:", error);
					setHasExistingWorkspaceQuiz(false);
					setHasExistingWorkspaceFlashcard(false);
				}
			}
		};

		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			idleHandle = window.requestIdleCallback(() => {
				void syncExistingWorkspaceContent();
			}, { timeout: 1200 });
		} else {
			timeoutHandle = window.setTimeout(() => {
				void syncExistingWorkspaceContent();
			}, 350);
		}

		return () => {
			cancelled = true;
			if (idleHandle !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
				window.cancelIdleCallback(idleHandle);
			}
			if (timeoutHandle !== null && typeof window !== "undefined") {
				window.clearTimeout(timeoutHandle);
			}
		};
	}, [workspaceId, activeView]);

	// Xác định các chức năng nên disabled
	const hasAtLeastOneActiveSource = sources.some(
		(source) => String(source?.status || "").toUpperCase() === "ACTIVE"
	);
	const shouldDisableQuiz = !hasAtLeastOneActiveSource && !hasExistingWorkspaceQuiz;
	const shouldDisableFlashcard = !hasAtLeastOneActiveSource && !hasExistingWorkspaceFlashcard;
	const shouldDisableCreateQuiz = !hasAtLeastOneActiveSource;
	const shouldDisableCreateFlashcard = !hasAtLeastOneActiveSource;
	const materialCountForProfile = sources.length;
	const profileEditLocked = materialCountForProfile > 0;
	const roadmapEnabledFromProfile = normalizeRoadmapEnabledValue(
		workspaceProfile?.roadmapEnabled ?? workspaceProfile?.data?.roadmapEnabled
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
	const shouldShowRoadmapAction = hasRoadmapPhases || (passRoadmapCondition1 && passRoadmapCondition2 && passRoadmapCondition3);
	const shouldDisableRoadmap = !shouldShowRoadmapAction;
	// Riêng nút roadmap ở Studio: kiểm tra theo thứ tự
	// 0) Nếu đã có phase thì luôn hiện bình thường (không disable)
	// 1) Phải có tài liệu ACTIVE
	// 2) roadmapEnabled từ profile phải là true
	// 3) roadmap structure không bị missing
	const shouldDisableRoadmapForStudio = hasRoadmapPhases
		? false
		: (!hasAtLeastOneActiveSource || !passRoadmapCondition1 || !passRoadmapCondition3);
	const isStudyNewRoadmap = getProfilePurpose(workspaceProfile) === "STUDY_NEW";
	const hasWorkspaceLearningDataAtRisk = hasExistingWorkspaceQuiz
		|| hasExistingWorkspaceFlashcard
		|| hasRoadmapPhases
		|| Boolean(extractRoadmapIdFromProfile(workspaceProfile));
	const workspaceAdaptationMode = String(workspaceProfile?.adaptationMode || workspaceProfile?.data?.adaptationMode || "").toUpperCase();

	useEffect(() => {
		console.log("[RoadmapGate][WorkspacePage] Profile snapshot", {
			workspaceId,
			hasWorkspaceProfile: Boolean(workspaceProfile),
			roadmapEnabledRaw: workspaceProfile?.roadmapEnabled,
			roadmapEnabledNested: workspaceProfile?.data?.roadmapEnabled,
			roadmapEnabledFromProfile,
			roadmapEnabledState,
		});
	}, [workspaceId, workspaceProfile, roadmapEnabledFromProfile, roadmapEnabledState]);

	useEffect(() => {
		console.log("[RoadmapGate][WorkspacePage] Decision", {
			workspaceId,
			passRoadmapCondition1,
			passRoadmapCondition2,
			passRoadmapCondition3,
			hasRoadmapPhases,
			isRoadmapStructureMissing,
			shouldShowRoadmapAction,
			shouldDisableRoadmap,
			shouldDisableRoadmapForStudio,
		});
	}, [
		workspaceId,
		passRoadmapCondition1,
		passRoadmapCondition2,
		passRoadmapCondition3,
		hasRoadmapPhases,
		isRoadmapStructureMissing,
		shouldShowRoadmapAction,
		shouldDisableRoadmap,
		shouldDisableRoadmapForStudio,
	]);

	const handleToggleSourcesCollapse = useCallback(() => {
		setIsSourcesCollapsed(effectiveSourcesCollapsed ? false : true);
	}, [effectiveSourcesCollapsed]);

	const handleToggleStudioCollapse = useCallback(() => {
		setHasStudioManualPreference(true);
		setIsStudioCollapsed(effectiveStudioCollapsed ? false : true);
	}, [effectiveStudioCollapsed]);

	useEffect(() => {
		if (!isRoadmapJourActive) return;
		setIsMaterialDetailOpen(false);
	}, [isRoadmapJourActive]);

	useEffect(() => {
		const container = workspaceLayoutRef.current;
		if (!container || typeof ResizeObserver === "undefined") return undefined;

		const observer = new ResizeObserver((entries) => {
			const width = entries?.[0]?.contentRect?.width || 0;
			setWorkspaceLayoutWidth(width);
		});

		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	const getWorkspaceSubPath = useCallback(() => {
		if (!workspaceId) return "";
		const prefix = `/workspace/${workspaceId}`;
		if (!location.pathname.startsWith(prefix)) return "";
		const suffix = location.pathname.slice(prefix.length).replace(/^\/+/, "");
		return suffix;
	}, [location.pathname, workspaceId]);

	useEffect(() => {
		const subPath = getWorkspaceSubPath();
		if (!subPath) return;

		if (subPath === "roadmap") {
			const phaseParam = new URLSearchParams(location.search).get("phaseId");
			const parsedPhaseId = Number(phaseParam);
			if (Number.isInteger(parsedPhaseId) && parsedPhaseId > 0) {
				setSelectedRoadmapPhaseId(parsedPhaseId);
			}
		}

		const { view: mappedView, quizId, backTarget, phaseId: mappedPhaseId, roadmapId: mappedRoadmapId } = resolveViewFromSubPath(subPath);
		if (!mappedView) return;

		if (backTarget?.view === "roadmap") {
			const urlPhaseParam = new URLSearchParams(location.search).get("phaseId");
			const parsedPhaseId = Number(urlPhaseParam);
			const normalizedPhaseId = Number.isInteger(backTarget?.phaseId) && backTarget.phaseId > 0
				? Number(backTarget.phaseId)
				: (Number.isInteger(parsedPhaseId) && parsedPhaseId > 0 ? parsedPhaseId : null);
			const normalizedRoadmapId = Number.isInteger(backTarget?.roadmapId) && backTarget.roadmapId > 0
				? Number(backTarget.roadmapId)
				: null;
			setQuizBackTarget({
				view: "roadmap",
				phaseId: normalizedPhaseId,
				roadmapId: normalizedRoadmapId,
			});
			if (Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
				setSelectedRoadmapPhaseId(normalizedPhaseId);
			}
		} else if (mappedView === "quizDetail" || mappedView === "editQuiz") {
			setQuizBackTarget(null);
		}

		if (mappedView === "roadmap") {
			if (Number.isInteger(mappedPhaseId) && mappedPhaseId > 0) {
				setSelectedRoadmapPhaseId(mappedPhaseId);
			}
			if (Number.isInteger(mappedRoadmapId) && mappedRoadmapId > 0) {
				setRoadmapAiRoadmapId((prev) => prev || mappedRoadmapId);
			}
		}

		if (quizId) {
			setSelectedQuiz((prev) => {
				if (prev?.quizId === quizId) return prev;
				return { quizId };
			});
		}

		setActiveView((prev) => (prev === mappedView ? prev : mappedView));
	}, [getWorkspaceSubPath, location.search]);

	useEffect(() => {
		if (!workspaceId) return;
		if (!activeView) return;

		let mappedPath = buildPathForView(activeView, selectedQuiz, quizBackTarget);
		if (activeView === "roadmap") {
			const normalizedRoadmapId = Number(roadmapAiRoadmapId);
			if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0) {
				mappedPath = `roadmap/${normalizedRoadmapId}`;
				if (Number.isInteger(selectedRoadmapPhaseId) && selectedRoadmapPhaseId > 0) {
					mappedPath += `/phase/${selectedRoadmapPhaseId}`;
				}
			}
		}
		if (!mappedPath) return;

		const currentSubPath = getWorkspaceSubPath();
		const isQuizDeepLink = /^quiz\/\d+(?:\/edit)?$/.test(currentSubPath)
			|| /^roadmap\/quiz\/\d+(?:\/edit)?$/.test(currentSubPath)
			|| /^roadmap\/\d+\/phase\/\d+\/quiz\/\d+(?:\/edit)?$/.test(currentSubPath);
		const isQuizDetailView = activeView === "quizDetail" || activeView === "editQuiz";

		if (isQuizDeepLink) {
			const { view: routeView, quizId: routeQuizId } = resolveViewFromSubPath(currentSubPath);
			const currentSelectedQuizId = Number(selectedQuiz?.quizId);

			// Chặn redirect theo activeView cũ (lấy từ sessionStorage) trước khi route deep-link hydrate xong.
			if (isQuizDetailView && routeView && routeView !== activeView) return;
			if (isQuizDetailView && Number.isInteger(routeQuizId) && routeQuizId > 0 && currentSelectedQuizId !== routeQuizId) return;
		}

		if (currentSubPath === mappedPath) return;

		navigate(`/workspace/${workspaceId}/${mappedPath}`, { replace: true });
	}, [activeView, getWorkspaceSubPath, navigate, quizBackTarget, selectedQuiz, selectedRoadmapPhaseId, roadmapAiRoadmapId, workspaceId]);

	const currentLang = i18n.language;
	const fontClass = currentLang === "en" ? "font-poppins" : "font-sans";

	const getMockTestGeneratingMessage = useCallback(() => {
		return translateOrFallback(
			t,
			"workspace.profileConfig.messages.mockTemplateGenerating",
			"Template đang được tạo. Hệ thống sẽ tự chuyển sang bước tiếp theo khi hoàn tất."
		);
	}, [t]);

	const getMockTestReadyMessage = useCallback(() => {
		return translateOrFallback(
			t,
			"workspace.profileConfig.messages.mockTemplateReady",
			"Đã lưu template mock test thành công."
		);
	}, [t]);

	const getMockTestStatusErrorMessage = useCallback(() => {
		return translateOrFallback(
			t,
			"workspace.profileConfig.messages.mockTemplateStatusError",
			"Không thể kiểm tra trạng thái tạo template lúc này. Vui lòng thử lại sau ít phút."
		);
	}, [t]);

	const readStoredMockTestGeneration = useCallback(() => {
		if (!mockTestGenerationStorageKey || typeof window === "undefined") return null;

		try {
			const rawValue = window.sessionStorage.getItem(mockTestGenerationStorageKey);
			return rawValue ? JSON.parse(rawValue) : null;
		} catch {
			return null;
		}
	}, [mockTestGenerationStorageKey]);

	const getMockTestAwaitingBackendMessage = useCallback((elapsedSeconds = 0) => {
		const safeSeconds = Math.max(1, Number(elapsedSeconds) || 1);
		return translateOrFallbackWithOptions(
			t,
			"workspace.profileConfig.messages.mockTemplateAwaitingBackend",
			{ seconds: safeSeconds },
			`Đang chờ backend xác nhận hoàn tất template. Đã chờ ${safeSeconds} giây.`
		);
	}, [t]);

	const getMockTestLongWaitMessage = useCallback((elapsedSeconds = 0) => {
		const safeSeconds = Math.max(1, Number(elapsedSeconds) || 1);
		return translateOrFallbackWithOptions(
			t,
			"workspace.profileConfig.messages.mockTemplateLongWait",
			{ seconds: safeSeconds },
			`Backend vẫn đang xử lý template. Đã chờ ${safeSeconds} giây. Nếu quá lâu, hãy kiểm tra lại trạng thái.`
		);
	}, [t]);

	const resetMockTestGenerationStatus = useCallback(() => {
		mockTestPollingRunRef.current += 1;
		mockTestPollingActiveRef.current = false;
		mockTestShouldCloseAfterStartRef.current = false;
		mockTestAutoFinalizePayloadRef.current = null;
		if (mockTestProgressTimerRef.current) {
			clearInterval(mockTestProgressTimerRef.current);
			mockTestProgressTimerRef.current = null;
		}
		if (mockTestReadyAutoHideTimerRef.current) {
			clearTimeout(mockTestReadyAutoHideTimerRef.current);
			mockTestReadyAutoHideTimerRef.current = null;
		}
		setMockTestGenerationState("idle");
		setMockTestGenerationMessage("");
		setMockTestGenerationProgress(0);
		setMockTestGenerationStartedAt(null);
		setMockTestGenerationElapsedSeconds(0);
		if (mockTestGenerationStorageKey && typeof window !== "undefined") {
			window.sessionStorage.removeItem(mockTestGenerationStorageKey);
		}
	}, [mockTestGenerationStorageKey]);

	useEffect(() => {
		if (mockTestGenerationState !== "ready") {
			if (mockTestReadyAutoHideTimerRef.current) {
				clearTimeout(mockTestReadyAutoHideTimerRef.current);
				mockTestReadyAutoHideTimerRef.current = null;
			}
			return;
		}

		if (mockTestReadyAutoHideTimerRef.current) {
			clearTimeout(mockTestReadyAutoHideTimerRef.current);
		}

		mockTestReadyAutoHideTimerRef.current = globalThis.setTimeout(() => {
			resetMockTestGenerationStatus();
		}, 3000);

		return () => {
			if (mockTestReadyAutoHideTimerRef.current) {
				clearTimeout(mockTestReadyAutoHideTimerRef.current);
				mockTestReadyAutoHideTimerRef.current = null;
			}
		};
	}, [mockTestGenerationState, resetMockTestGenerationStatus]);

	useEffect(() => {
		if (mockTestGenerationState !== "pending") {
			if (mockTestProgressTimerRef.current) {
				clearInterval(mockTestProgressTimerRef.current);
				mockTestProgressTimerRef.current = null;
			}
			if (mockTestGenerationState === "ready") {
				setMockTestGenerationProgress(100);
			}
			return;
		}

		if (mockTestProgressTimerRef.current) {
			clearInterval(mockTestProgressTimerRef.current);
		}

		setMockTestGenerationProgress((current) => (current > 0 ? current : 12));
		mockTestProgressTimerRef.current = globalThis.setInterval(() => {
			setMockTestGenerationProgress((current) => {
				if (current >= 92) return current;
				if (current < 40) return Math.min(92, current + 11);
				if (current < 70) return Math.min(92, current + 7);
				return Math.min(92, current + 3);
			});
		}, 450);

		return () => {
			if (mockTestProgressTimerRef.current) {
				clearInterval(mockTestProgressTimerRef.current);
				mockTestProgressTimerRef.current = null;
			}
		};
	}, [mockTestGenerationState]);

	useEffect(() => {
		if (mockTestGenerationState !== "pending" || !mockTestGenerationStartedAt) {
			if (mockTestElapsedTimerRef.current) {
				clearInterval(mockTestElapsedTimerRef.current);
				mockTestElapsedTimerRef.current = null;
			}
			return;
		}

		setMockTestGenerationElapsedSeconds(Math.max(0, Math.floor((Date.now() - mockTestGenerationStartedAt) / 1000)));
		mockTestElapsedTimerRef.current = globalThis.setInterval(() => {
			setMockTestGenerationElapsedSeconds(Math.max(0, Math.floor((Date.now() - mockTestGenerationStartedAt) / 1000)));
		}, 1000);

		return () => {
			if (mockTestElapsedTimerRef.current) {
				clearInterval(mockTestElapsedTimerRef.current);
				mockTestElapsedTimerRef.current = null;
			}
		};
	}, [mockTestGenerationStartedAt, mockTestGenerationState]);

	useEffect(() => {
		if (!mockTestGenerationStorageKey || typeof window === "undefined") return;

		if (mockTestGenerationState === "idle") {
			window.sessionStorage.removeItem(mockTestGenerationStorageKey);
			return;
		}

		window.sessionStorage.setItem(
			mockTestGenerationStorageKey,
			JSON.stringify({
				state: mockTestGenerationState,
				message: mockTestGenerationMessage,
				progress: mockTestGenerationProgress,
				startedAt: mockTestGenerationStartedAt,
				shouldCloseAfterStart: mockTestShouldCloseAfterStartRef.current,
				autoFinalizePayload: mockTestAutoFinalizePayloadRef.current,
			})
		);
	}, [
		mockTestGenerationMessage,
		mockTestGenerationProgress,
		mockTestGenerationStartedAt,
		mockTestGenerationState,
		mockTestGenerationStorageKey,
	]);

	const finalizeBackgroundMockTestProfile = useCallback(async () => {
		if (!workspaceId || !mockTestAutoFinalizePayloadRef.current) return null;

		try {
			await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, mockTestAutoFinalizePayloadRef.current);
		} catch (err) {
			console.warn("saveIndividualWorkspaceRoadmapConfigStep during background finalization skipped or failed:", err);
		}

		// Confirm onboarding to transition workspace from PROFILE_DONE → DONE
		const confirmedProfile = extractProfileData(
			await confirmIndividualWorkspaceProfile(workspaceId)
		);

		if (confirmedProfile) {
			setWorkspaceProfile(confirmedProfile);
			setIsProfileConfigured(isProfileOnboardingDone(confirmedProfile));
		}

		mockTestShouldCloseAfterStartRef.current = false;
		mockTestAutoFinalizePayloadRef.current = null;
		setMockTestGenerationProgress(100);
		setProfileConfigOpen(false);
		setProfileOverviewOpen(false);
		fetchWorkspaceDetail(workspaceId).catch(() => {});
		showSuccess(
			translateOrFallback(
				t,
				"workspace.profileConfig.messages.backgroundMockTestReady",
				"Mock test đã được tạo xong ở nền. Bạn có thể mở mục Mock test để xem ngay."
			)
		);
		navigate(`/workspace/${workspaceId}`, { replace: true });
		return confirmedProfile;
	}, [workspaceId, fetchWorkspaceDetail, navigate, showSuccess, t]);

	const startMockTestGenerationPolling = useCallback(async () => {
		if (!workspaceId || mockTestPollingActiveRef.current) return;

		const runId = mockTestPollingRunRef.current + 1;
		mockTestPollingRunRef.current = runId;
		mockTestPollingActiveRef.current = true;
		let consecutiveFailures = 0;

		try {
			while (isMountedRef.current && mockTestPollingRunRef.current === runId) {
				try {
					const profileResponse = await getIndividualWorkspaceProfile(workspaceId);
					if (!isMountedRef.current || mockTestPollingRunRef.current !== runId) {
						return;
					}

					consecutiveFailures = 0;
					const profileData = extractProfileData(profileResponse);

					if (profileData) {
						setWorkspaceProfile(profileData);
						setIsProfileConfigured(isProfileOnboardingDone(profileData));
					}

					if (hasCompletedProfileStepTwo(profileData)) {
						setMockTestGenerationProgress(100);
						setMockTestGenerationState("ready");
						setMockTestGenerationMessage(getMockTestReadyMessage());

						if (mockTestShouldCloseAfterStartRef.current && mockTestAutoFinalizePayloadRef.current) {
							await finalizeBackgroundMockTestProfile();
						}

						fetchWorkspaceDetail(workspaceId).catch(() => {});
						return;
					}
				} catch (error) {
					consecutiveFailures += 1;

					if (consecutiveFailures >= 3) {
						console.error("Failed to poll mock test generation status:", error);
						if (isMountedRef.current && mockTestPollingRunRef.current === runId) {
							setMockTestGenerationState("error");
							setMockTestGenerationMessage(error?.message || getMockTestStatusErrorMessage());
						}
						return;
					}
				}

				await delay(1500);
			}
		} finally {
			if (mockTestPollingRunRef.current === runId) {
				mockTestPollingActiveRef.current = false;
			}
		}
	}, [workspaceId, fetchWorkspaceDetail, finalizeBackgroundMockTestProfile, getMockTestReadyMessage, getMockTestStatusErrorMessage]);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			phaseGenerationPollingRef.current.runId += 1;
			phaseGenerationPollingRef.current.active = false;
			phaseContentPollingRef.current = {};
			preLearningPollingRef.current = {};
			preLearningRequestGuardRef.current = {};
			knowledgeQuizPollingRef.current = {};
			knowledgeQuizGenerationRequestedRef.current = {};
			mockTestPollingRunRef.current += 1;
			mockTestPollingActiveRef.current = false;
			if (mockTestProgressTimerRef.current) {
				clearInterval(mockTestProgressTimerRef.current);
				mockTestProgressTimerRef.current = null;
			}
			if (mockTestElapsedTimerRef.current) {
				clearInterval(mockTestElapsedTimerRef.current);
				mockTestElapsedTimerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		resetMockTestGenerationStatus();
	}, [workspaceId, resetMockTestGenerationStatus]);

	useEffect(() => {
		setRoadmapAiRoadmapId(extractRoadmapIdFromProfile(workspaceProfile));
	}, [workspaceProfile]);

	useEffect(() => {
		const normalizedRoadmapEnabled = normalizeRoadmapEnabledValue(
			workspaceProfile?.roadmapEnabled ?? workspaceProfile?.data?.roadmapEnabled
		);
		if (normalizedRoadmapEnabled === null) return;
		setRoadmapEnabledState(normalizedRoadmapEnabled);
	}, [workspaceProfile]);

	useEffect(() => {
		setRoadmapEnabledState(null);
	}, [workspaceId]);

	useEffect(() => {
		phaseGenerationPollingRef.current.runId += 1;
		phaseGenerationPollingRef.current.active = false;
		phaseContentPollingRef.current = {};
		preLearningPollingRef.current = {};
		preLearningRequestGuardRef.current = {};
		if (preLearningRequestGuardStorageKey && typeof window !== "undefined") {
			window.sessionStorage.removeItem(preLearningRequestGuardStorageKey);
		}
		knowledgeQuizPollingRef.current = {};
		knowledgeQuizGenerationRequestedRef.current = {};
		knowledgeQuizGenerationRequestedByKnowledgeRef.current = {};
		setIsGeneratingRoadmapPhases(false);
		setGeneratingKnowledgePhaseIds([]);
		setGeneratingKnowledgeQuizPhaseIds([]);
		setGeneratingKnowledgeQuizKnowledgeKeys([]);
		setGeneratingPreLearningPhaseIds([]);
		setSkipPreLearningPhaseIds([]);
		setPhaseGenerateDialogOpen(false);
	}, [preLearningRequestGuardStorageKey, workspaceId]);

	useEffect(() => {
		if (!preLearningRequestGuardStorageKey || typeof window === "undefined") return;
		try {
			const raw = window.sessionStorage.getItem(preLearningRequestGuardStorageKey);
			if (!raw) return;
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
			preLearningRequestGuardRef.current = parsed;
		} catch (error) {
			console.error("Failed to restore pre-learning request guard:", error);
		}
	}, [preLearningRequestGuardStorageKey]);

	// Khôi phục trạng thái generating sau khi reload trang.
	useEffect(() => {
		if (!workspaceId || typeof window === "undefined") return;

		try {
			const storedRoadmapGenerating = window.sessionStorage.getItem(roadmapPhaseGeneratingStorageKey);
			const storedPhaseContentGenerating = window.sessionStorage.getItem(phaseContentGeneratingStorageKey);
			const storedPreLearningGenerating = window.sessionStorage.getItem(preLearningGeneratingStorageKey);
			const storedSkipPreLearning = window.sessionStorage.getItem(skipPreLearningPhaseStorageKey);

			if (storedRoadmapGenerating !== null) {
				setIsGeneratingRoadmapPhases(storedRoadmapGenerating === "true");
			}

			if (storedPreLearningGenerating) {
				const parsedPhaseIds = JSON.parse(storedPreLearningGenerating);
				setGeneratingPreLearningPhaseIds(normalizePositiveIds(parsedPhaseIds));
			}

			if (storedSkipPreLearning) {
				const parsedPhaseIds = JSON.parse(storedSkipPreLearning);
				setSkipPreLearningPhaseIds(normalizePositiveIds(parsedPhaseIds));
			}

			if (storedPhaseContentGenerating) {
				const parsedPhaseIds = JSON.parse(storedPhaseContentGenerating);
				setGeneratingKnowledgePhaseIds(normalizePositiveIds(parsedPhaseIds));
			}
		} catch (error) {
			console.error("Failed to restore roadmap generating state:", error);
		}
	}, [
		phaseContentGeneratingStorageKey,
		preLearningGeneratingStorageKey,
		roadmapPhaseGeneratingStorageKey,
		skipPreLearningPhaseStorageKey,
		workspaceId,
	]);

	// Persist trạng thái generating để reload vẫn giữ được spinner như Sources panel.
	useEffect(() => {
		if (!workspaceId || typeof window === "undefined") return;

		window.sessionStorage.setItem(roadmapPhaseGeneratingStorageKey, String(isGeneratingRoadmapPhases));
		window.sessionStorage.setItem(
			phaseContentGeneratingStorageKey,
			JSON.stringify(normalizePositiveIds(generatingKnowledgePhaseIds))
		);
		window.sessionStorage.setItem(
			preLearningGeneratingStorageKey,
			JSON.stringify(normalizePositiveIds(generatingPreLearningPhaseIds))
		);
		window.sessionStorage.setItem(
			skipPreLearningPhaseStorageKey,
			JSON.stringify(normalizePositiveIds(skipPreLearningPhaseIds))
		);
	}, [
		phaseContentGeneratingStorageKey,
		generatingKnowledgePhaseIds,
		generatingPreLearningPhaseIds,
		isGeneratingRoadmapPhases,
		preLearningGeneratingStorageKey,
		roadmapPhaseGeneratingStorageKey,
		skipPreLearningPhaseIds,
		skipPreLearningPhaseStorageKey,
		workspaceId,
	]);

	const stopPhaseGenerationPolling = useCallback(() => {
		phaseGenerationPollingRef.current.runId += 1;
		phaseGenerationPollingRef.current.active = false;
	}, []);

	const stopPhaseContentPolling = useCallback((phaseId) => {
		const normalized = Number(phaseId);
		if (!Number.isInteger(normalized) || normalized <= 0) return;
		phaseContentPollingRef.current[normalized] = (phaseContentPollingRef.current[normalized] || 0) + 1;
	}, []);

	const stopKnowledgeQuizPolling = useCallback((phaseId) => {
		const normalized = Number(phaseId);
		if (!Number.isInteger(normalized) || normalized <= 0) return;
		knowledgeQuizPollingRef.current[normalized] = (knowledgeQuizPollingRef.current[normalized] || 0) + 1;
	}, []);

	// Đồng bộ trạng thái phase roadmap từ backend để clear spinner chính xác khi thành công.
	useEffect(() => {
		if (!workspaceId) return;

		let cancelled = false;
		const syncRunId = roadmapStructureSyncRunRef.current + 1;
		roadmapStructureSyncRunRef.current = syncRunId;
		const syncRoadmapPhaseGeneratingStatus = async () => {
			if (cancelled || roadmapStructureSyncRunRef.current !== syncRunId) return;
			const normalizedRoadmapId = Number(roadmapAiRoadmapId);
			if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) {
				if (cancelled || roadmapStructureSyncRunRef.current !== syncRunId) return;
				setIsRoadmapStructureMissing(true);
				setRoadmapHasPhases(false);
				setIsGeneratingRoadmapPhases(false);
				setRoadmapPhaseGenerationTaskId(null);
				setRoadmapPhaseGenerationProgress(0);
				stopPhaseGenerationPolling();
				return;
			}

			try {
				const roadmapData = await getRoadmapStructureById(normalizedRoadmapId);
				if (cancelled || roadmapStructureSyncRunRef.current !== syncRunId) return;

				setIsRoadmapStructureMissing(false);
				const roadmapStatus = String(roadmapData?.status || "").toUpperCase();
				const isProcessing = roadmapStatus === "PROCESSING";
				const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];
				const skipPreLearningPhaseIdSet = new Set(normalizePositiveIds(skipPreLearningPhaseIds));
				const {
					knowledge: inferredPhaseContentGeneratingIds,
					preLearning: inferredPreLearningGeneratingIds,
				} = inferProcessingRoadmapGenerationIds(phases, skipPreLearningPhaseIds);
				
				setIsGeneratingRoadmapPhases(isProcessing);
				if (isProcessing) {
					setRoadmapPhaseGenerationProgress((current) => (current > 0 ? current : 0));
				} else {
					setRoadmapPhaseGenerationTaskId(null);
					setRoadmapPhaseGenerationProgress(0);
				}
				setRoadmapHasPhases(phases.length > 0);

				if (inferredPhaseContentGeneratingIds.length > 0) {
					setGeneratingKnowledgePhaseIds((current) => {
						const merged = new Set([...normalizePositiveIds(current), ...inferredPhaseContentGeneratingIds]);
						return Array.from(merged);
					});
				}

				if (inferredPreLearningGeneratingIds.length > 0) {
					setGeneratingPreLearningPhaseIds((current) => {
						const filteredCurrent = normalizePositiveIds(current)
							.filter((phaseId) => !skipPreLearningPhaseIdSet.has(phaseId));
						const merged = new Set([...filteredCurrent, ...inferredPreLearningGeneratingIds]);
						return Array.from(merged);
					});
				} else if (skipPreLearningPhaseIdSet.size > 0) {
					setGeneratingPreLearningPhaseIds((current) => normalizePositiveIds(current)
						.filter((phaseId) => !skipPreLearningPhaseIdSet.has(phaseId)));
				}

				if (!isProcessing) {
					stopPhaseGenerationPolling();
				}
			} catch (error) {
				if (cancelled || roadmapStructureSyncRunRef.current !== syncRunId) return;
				const statusCode = Number(error?.statusCode ?? error?.status ?? 0);
				if (statusCode === 404) {
					setIsRoadmapStructureMissing(true);
					setRoadmapHasPhases(false);
					setIsGeneratingRoadmapPhases(false);
					setRoadmapPhaseGenerationTaskId(null);
					setRoadmapPhaseGenerationProgress(0);
					stopPhaseGenerationPolling();
					return;
				}
				console.error("Failed to sync roadmap phase generating status:", error);
			}
		};

		syncRoadmapPhaseGeneratingStatus();
		return () => {
			cancelled = true;
		};
	}, [workspaceId, roadmapAiRoadmapId, roadmapReloadToken, skipPreLearningPhaseIds, stopPhaseGenerationPolling]);

	const isMockTestAwaitingBackend = mockTestGenerationState === "pending" && mockTestGenerationProgress >= 92;
	const isMockTestTakingLongerThanExpected = isMockTestAwaitingBackend && mockTestGenerationElapsedSeconds >= 20;
	const mockTestGenerationDisplayMessage = mockTestGenerationState === "pending"
		? isMockTestTakingLongerThanExpected
			? getMockTestLongWaitMessage(mockTestGenerationElapsedSeconds)
			: isMockTestAwaitingBackend
				? getMockTestAwaitingBackendMessage(mockTestGenerationElapsedSeconds)
				: mockTestGenerationMessage
		: mockTestGenerationMessage;
	const mockTestGenerationDisplayLabel = mockTestGenerationState === "pending" && isMockTestAwaitingBackend
		? translateOrFallback(
			t,
			"workspace.profileConfig.messages.mockTemplateAwaitingBackendShort",
			"Đang xác nhận"
		)
		: `${Math.max(0, Math.min(100, Number(mockTestGenerationProgress) || 0))}%`;

	const checkMockTestGenerationStatusNow = useCallback(async () => {
		if (!workspaceId || mockTestGenerationState !== "pending") return;

		try {
			const profileResponse = await getIndividualWorkspaceProfile(workspaceId);
			const profileData = extractProfileData(profileResponse);
			if (profileData) {
				setWorkspaceProfile(profileData);
				setIsProfileConfigured(isProfileOnboardingDone(profileData));
			}

			if (hasCompletedProfileStepTwo(profileData)) {
				setMockTestGenerationProgress(100);
				setMockTestGenerationState("ready");
				setMockTestGenerationMessage(getMockTestReadyMessage());
				if (mockTestShouldCloseAfterStartRef.current && mockTestAutoFinalizePayloadRef.current) {
					await finalizeBackgroundMockTestProfile();
				}
				return;
			}

			if (mockTestGenerationProgress >= 92) {
				setMockTestGenerationMessage(getMockTestAwaitingBackendMessage(mockTestGenerationElapsedSeconds));
			}
		} catch (error) {
			console.error("Failed to manually check mock test status:", error);
			setMockTestGenerationState("error");
			setMockTestGenerationMessage(error?.message || getMockTestStatusErrorMessage());
		}
	}, [
		finalizeBackgroundMockTestProfile,
		getMockTestAwaitingBackendMessage,
		getMockTestReadyMessage,
		getMockTestStatusErrorMessage,
		mockTestGenerationElapsedSeconds,
		mockTestGenerationProgress,
		mockTestGenerationState,
		workspaceId,
	]);

	const refreshWorkspacePersonalization = useCallback(async () => {
		if (!workspaceId) {
			setWorkspacePersonalization(null);
			return null;
		}

		try {
			const response = await getWorkspacePersonalization(workspaceId);
			const payload = response?.data?.data || response?.data || response || null;
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
					const normalizedStatus = String(item?.status || '').toUpperCase();
					return ['PROCESSING', 'UPLOADING', 'PENDING', 'QUEUED'].includes(normalizedStatus);
				})
				.map((item) => item.id);
			reconcileMaterialProgress(processingMaterialIds);

			setSources(visibleSources);
			return visibleSources;
		} catch (err) {
			console.error("âŒ [fetchSources] Failed to fetch materials:", err);
			return [];
		}
	}, [workspaceId, reconcileMaterialProgress]);

	const resolveLatestRoadmapId = useCallback(async () => {
		if (!workspaceId) return null;
		const profileResponse = await getIndividualWorkspaceProfile(workspaceId);
		const profileData = extractProfileData(profileResponse);
		setWorkspaceProfile(profileData);
		setIsProfileConfigured(isProfileOnboardingDone(profileData));
		return extractRoadmapIdFromProfile(profileData);
	}, [workspaceId]);

	const stopPreLearningPolling = useCallback((phaseId) => {
		const normalized = Number(phaseId);
		if (!Number.isInteger(normalized) || normalized <= 0) return;
		preLearningPollingRef.current[normalized] = (preLearningPollingRef.current[normalized] || 0) + 1;
	}, []);

	const persistPreLearningRequestGuard = useCallback((nextGuard) => {
		if (!preLearningRequestGuardStorageKey || typeof window === "undefined") return;
		try {
			window.sessionStorage.setItem(preLearningRequestGuardStorageKey, JSON.stringify(nextGuard || {}));
		} catch (error) {
			console.error("Failed to persist pre-learning request guard:", error);
		}
	}, [preLearningRequestGuardStorageKey]);

	const clearPreLearningRequestGuard = useCallback((options = {}) => {
		const clearAll = options?.all === true;
		const roadmapId = Number(options?.roadmapId);
		const phaseId = Number(options?.phaseId);

		if (clearAll) {
			preLearningRequestGuardRef.current = {};
			persistPreLearningRequestGuard(preLearningRequestGuardRef.current);
			return;
		}

		const next = { ...preLearningRequestGuardRef.current };
		Object.keys(next).forEach((key) => {
			const [rawRoadmapId, rawPhaseId] = String(key || "").split(":");
			const keyRoadmapId = Number(rawRoadmapId);
			const keyPhaseId = Number(rawPhaseId);
			const roadmapMatched = Number.isInteger(roadmapId) && roadmapId > 0 ? keyRoadmapId === roadmapId : true;
			const phaseMatched = Number.isInteger(phaseId) && phaseId > 0 ? keyPhaseId === phaseId : true;
			if (roadmapMatched && phaseMatched) {
				delete next[key];
			}
		});

		preLearningRequestGuardRef.current = next;
		persistPreLearningRequestGuard(preLearningRequestGuardRef.current);
	}, [persistPreLearningRequestGuard]);

	const tryStartPreLearningRequest = useCallback((roadmapId, phaseId, options = {}) => {
		const normalizedRoadmapId = Number(roadmapId);
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) return null;
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return null;

		const cooldownMs = Number(options?.cooldownMs) > 0 ? Number(options.cooldownMs) : 15000;
		const awaitCompletion = options?.awaitCompletion !== false;
		const key = `${normalizedRoadmapId}:${normalizedPhaseId}`;
		const now = Date.now();
		if (preLearningRequestGuardStorageKey && typeof window !== "undefined") {
			try {
				const raw = window.sessionStorage.getItem(preLearningRequestGuardStorageKey);
				if (raw) {
					const persisted = JSON.parse(raw);
					if (persisted && typeof persisted === "object" && !Array.isArray(persisted)) {
						preLearningRequestGuardRef.current = {
							...persisted,
							...preLearningRequestGuardRef.current,
						};
					}
				}
			} catch {
				// bỏ qua lỗi đọc guard, fallback guard trong memory.
			}
		}
		const current = preLearningRequestGuardRef.current[key] || null;

		if (current?.inFlight) {
			return null;
		}

		if (current?.awaitingCompletion === true) {
			return null;
		}

		if (Number(current?.lastRequestedAt) > 0 && now - Number(current.lastRequestedAt) < cooldownMs) {
			return null;
		}

		preLearningRequestGuardRef.current[key] = {
			inFlight: true,
			lastRequestedAt: now,
			awaitingCompletion: awaitCompletion,
		};
		persistPreLearningRequestGuard(preLearningRequestGuardRef.current);

		return key;
	}, [persistPreLearningRequestGuard, preLearningRequestGuardStorageKey]);

	const finishPreLearningRequest = useCallback((requestKey, options = {}) => {
		if (!requestKey) return;
		const current = preLearningRequestGuardRef.current[requestKey] || null;
		if (!current) return;

		const succeeded = options?.succeeded === true;
		if (succeeded) {
			preLearningRequestGuardRef.current[requestKey] = {
				inFlight: false,
				lastRequestedAt: Number(current?.lastRequestedAt) || Date.now(),
				awaitingCompletion: current?.awaitingCompletion === true,
			};
			persistPreLearningRequestGuard(preLearningRequestGuardRef.current);
			return;
		}

		delete preLearningRequestGuardRef.current[requestKey];
		persistPreLearningRequestGuard(preLearningRequestGuardRef.current);
	}, [persistPreLearningRequestGuard]);

	async function triggerNonStudyPreLearningAfterPhases(roadmapIdHint = null) {
		if (!workspaceId || isStudyNewRoadmap) return;
		if (nonStudyPreLearningAutoRunRef.current.active) return;

		const runId = nonStudyPreLearningAutoRunRef.current.runId + 1;
		nonStudyPreLearningAutoRunRef.current.runId = runId;
		nonStudyPreLearningAutoRunRef.current.active = true;

		try {
			const response = await getRoadmapGraph({ workspaceId });
			if (!isMountedRef.current || nonStudyPreLearningAutoRunRef.current.runId !== runId) return;

			const roadmapData = response?.data?.data ?? null;
			const roadmapId = Number(roadmapData?.roadmapId ?? roadmapIdHint ?? roadmapAiRoadmapId);
			if (!Number.isInteger(roadmapId) || roadmapId <= 0) return;

			const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];
			const phaseIdsToGenerate = [];
			
			if (phases.length > 0) {
				const firstPhase = phases[0];
				const hasPreLearning = (firstPhase?.preLearningQuizzes || []).length > 0;
				const hasKnowledge = (firstPhase?.knowledges || []).length > 0;
				
				if (!hasPreLearning && !hasKnowledge) {
					phaseIdsToGenerate.push(firstPhase.phaseId);
				}
			}
			
			const normalizedPhaseIds = normalizePositiveIds(phaseIdsToGenerate);

			if (normalizedPhaseIds.length === 0) return;

			setRoadmapAiRoadmapId(roadmapId);
			focusRoadmapViewSafely();

			for (const phaseId of normalizedPhaseIds) {
				if (!isMountedRef.current || nonStudyPreLearningAutoRunRef.current.runId !== runId) return;
				const requestKey = tryStartPreLearningRequest(roadmapId, phaseId, {
					cooldownMs: 180000,
					awaitCompletion: true,
				});
				if (!requestKey) {
					continue;
				}

				setGeneratingPreLearningPhaseIds((current) => {
					if (current.includes(phaseId)) return current;
					return [...current, phaseId];
				});

				try {
					await generateRoadmapPreLearning({
						roadmapId,
						phaseId,
					});
					finishPreLearningRequest(requestKey, { succeeded: true });
				} catch (error) {
					setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
					finishPreLearningRequest(requestKey, { succeeded: false });
					throw error;
				}
			}

			bumpRoadmapReloadToken();
		} catch (error) {
			console.error("Failed auto-generating pre-learning for non-STUDY_NEW roadmap:", error);
			showError(error?.message || "Tạo pre-learning tự động thất bại.");
		} finally {
			if (nonStudyPreLearningAutoRunRef.current.runId === runId) {
				nonStudyPreLearningAutoRunRef.current.active = false;
			}
		}
	}

	const handleCreateKnowledgeQuizForKnowledge = useCallback(async (phaseId, knowledgeId) => {
		const normalizedPhaseId = Number(phaseId);
		const normalizedKnowledgeId = Number(knowledgeId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		if (!Number.isInteger(normalizedKnowledgeId) || normalizedKnowledgeId <= 0) return;

		const requestKey = `${normalizedPhaseId}:${normalizedKnowledgeId}`;
		if (knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] === true) return;

		setGeneratingKnowledgeQuizPhaseIds((current) => {
			if (current.includes(normalizedPhaseId)) return current;
			return [...current, normalizedPhaseId];
		});
		setGeneratingKnowledgeQuizKnowledgeKeys((current) => {
			if (current.includes(requestKey)) return current;
			return [...current, requestKey];
		});

		knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] = true;
		knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] = true;

		try {
			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError("Không tìm thấy roadmapId trong Workspace Profile.");
				setProfileOverviewOpen(false);
				setProfileConfigOpen(true);
				knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] = false;
				setGeneratingKnowledgeQuizKnowledgeKeys((current) => current.filter((key) => key !== requestKey));
				return;
			}

			await generateRoadmapKnowledgeQuiz({ roadmapId, knowledgeId: normalizedKnowledgeId });
		} catch (error) {
			knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] = false;
			setGeneratingKnowledgeQuizKnowledgeKeys((current) => current.filter((key) => key !== requestKey));
			const hasPendingRequests = Object.entries(knowledgeQuizGenerationRequestedByKnowledgeRef.current)
				.some(([key, requested]) => requested === true && key.startsWith(`${normalizedPhaseId}:`));
			if (!hasPendingRequests) {
				knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] = false;
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			}
			showError(error?.message || "Tạo quiz cho knowledge thất bại.");
		}
	}, [roadmapAiRoadmapId, resolveLatestRoadmapId, showError]);

	const handleOpenRoadmapPhaseDialog = useCallback(async () => {
		if (!workspaceId) return;

		if (!isProfileConfigured) {
			setProfileOverviewOpen(false);
			setProfileConfigOpen(true);
			return;
		}

		try {
			const roadmapId = await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError("Vui lòng nhập Workspace Profile trước khi tạo phase.");
				setProfileOverviewOpen(false);
				setProfileConfigOpen(true);
				return;
			}

			const defaultIds = normalizePositiveIds(sources.filter(isActiveMaterial).map((material) => material.id));
			setRoadmapAiRoadmapId(roadmapId);
			setPhaseGenerateDialogDefaultIds(defaultIds);
			setPhaseGenerateDialogOpen(true);
		} catch (error) {
			showError(error?.message || "Không thể đọc Workspace Profile để lấy roadmapId.");
		}
	}, [isProfileConfigured, resolveLatestRoadmapId, showError, sources, workspaceId]);

	const handleSubmitRoadmapPhaseDialog = useCallback(async ({ files = [], materialIds = [] }) => {
		if (!workspaceId) return;
		setIsSubmittingRoadmapPhaseRequest(true);

		try {
			let latestSources = sources;
			if (files.length > 0) {
				const uploadPromises = files.map((file) => uploadMaterial(file, workspaceId));
				await Promise.all(uploadPromises);
				latestSources = await fetchSources();
			}

			const activeMaterialIds = normalizePositiveIds((latestSources || [])
				.filter(isActiveMaterial)
				.map((item) => item.id));
			const selectedMaterialIds = normalizePositiveIds(materialIds)
				.filter((id) => activeMaterialIds.includes(id));

			if (activeMaterialIds.length === 0) {
				showError("Vui lòng tải tài liệu và đợi tài liệu ở trạng thái ACTIVE trước khi tạo phase.");
				return;
			}

			if (selectedMaterialIds.length === 0) {
				showError("Vui lòng chọn ít nhất 1 tài liệu ACTIVE để tạo phase.");
				return;
			}

			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError("Không tìm thấy roadmapId trong Workspace Profile.");
				setProfileOverviewOpen(false);
				setProfileConfigOpen(true);
				return;
			}

			setRoadmapPhaseGenerationProgress(0);
			setRoadmapPhaseGenerationTaskId(null);
			const roadmapPhaseResponse = await generateRoadmapPhases({
				roadmapId,
				materialIds: selectedMaterialIds,
			});
			const roadmapPhasePayload = roadmapPhaseResponse?.data?.data || roadmapPhaseResponse?.data || roadmapPhaseResponse;
			const responseTaskId = roadmapPhasePayload?.websocketTaskId ?? roadmapPhasePayload?.taskId;
			if (responseTaskId) {
				setRoadmapPhaseGenerationTaskId(responseTaskId);
			}
			setRoadmapPhaseGenerationProgress(clampPercent(roadmapPhasePayload?.percent ?? roadmapPhasePayload?.progressPercent ?? 0));

			setRoadmapAiRoadmapId(roadmapId);
			setPhaseGenerateDialogOpen(false);
			setIsGeneratingRoadmapPhases(true);
			setSelectedRoadmapPhaseId(null);
			setActiveView("roadmap");
			bumpRoadmapReloadToken();
		} catch (error) {
			showError(error?.message || "Tạo phase roadmap thất bại.");
		} finally {
			setIsSubmittingRoadmapPhaseRequest(false);
		}
	}, [
		workspaceId,
		sources,
		fetchSources,
		roadmapAiRoadmapId,
		resolveLatestRoadmapId,
		showError,
		bumpRoadmapReloadToken,
	]);

	const handleCreatePhaseKnowledge = useCallback(async (phaseId, options = {}) => {
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		if (phaseContentRequestInFlightRef.current[normalizedPhaseId]) return;
		const skipPreLearning = Boolean(options?.skipPreLearning);

		phaseContentRequestInFlightRef.current[normalizedPhaseId] = true;

		if (skipPreLearning) {
			setSkipPreLearningPhaseIds((current) => normalizePositiveIds([...current, normalizedPhaseId]));
			setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			stopPreLearningPolling(normalizedPhaseId);
		}

		try {
			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError("Không tìm thấy roadmapId trong Workspace Profile.");
				setProfileOverviewOpen(false);
				setProfileConfigOpen(true);
				return;
			}

			setGeneratingKnowledgePhaseIds((current) => {
				if (current.includes(normalizedPhaseId)) return current;
				return [...current, normalizedPhaseId];
			});

			await generateRoadmapPhaseContent({
				roadmapId,
				phaseId: normalizedPhaseId,
				skipPreLearning,
			});

			setActiveView("roadmap");
			bumpRoadmapReloadToken();
		} catch (error) {
			setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			showError(error?.message || "Tạo knowledge cho phase thất bại.");
		} finally {
			phaseContentRequestInFlightRef.current[normalizedPhaseId] = false;
		}
	}, [
		roadmapAiRoadmapId,
		resolveLatestRoadmapId,
		showError,
		bumpRoadmapReloadToken,
		stopPreLearningPolling,
	]);

	const handleCreatePhasePreLearning = useCallback(async (phaseId, options = {}) => {
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		const skipPreLearning = Boolean(options?.skipPreLearning);
		setSkipPreLearningPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
		let requestKey = null;

		try {
			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError("Không tìm thấy roadmapId trong Workspace Profile.");
				setProfileOverviewOpen(false);
				setProfileConfigOpen(true);
				return;
			}

			requestKey = tryStartPreLearningRequest(roadmapId, normalizedPhaseId, {
				cooldownMs: 180000,
				awaitCompletion: true,
			});
			if (!requestKey) {
				return;
			}

			setGeneratingPreLearningPhaseIds((current) => {
				if (current.includes(normalizedPhaseId)) return current;
				return [...current, normalizedPhaseId];
			});

			await generateRoadmapPreLearning({
				roadmapId,
				phaseId: normalizedPhaseId,
				skipPreLearning,
			});
			finishPreLearningRequest(requestKey, { succeeded: true });

			setActiveView("roadmap");
			bumpRoadmapReloadToken();
		} catch (error) {
			setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			finishPreLearningRequest(requestKey, { succeeded: false });
			showError(error?.message || "Tạo pre-learning cho phase thất bại.");
			throw error;
		}
	}, [
		finishPreLearningRequest,
		roadmapAiRoadmapId,
		resolveLatestRoadmapId,
		showError,
		bumpRoadmapReloadToken,
		tryStartPreLearningRequest,
	]);

	const applyRecoveredActiveTaskSnapshot = useCallback((snapshot) => {
		const snapshotTasks = Array.isArray(snapshot?.activeTasks) ? snapshot.activeTasks : [];
		const currentWorkspaceId = Number(workspaceId);
		const currentRoadmapId = Number(roadmapAiRoadmapId);
		const knownMaterialIds = new Set(
			normalizePositiveIds((sources || []).map((item) => Number(item?.id))),
		);

		const tasks = snapshotTasks.filter((task) => {
			const normalizedStatus = String(task?.status || "").toUpperCase();
			if (normalizedStatus === "ROADMAP_MODERATION_DONE") {
				return false;
			}

			const processingObject = (task?.processingObject && typeof task.processingObject === "object")
				? task.processingObject
				: {};

			const taskWorkspaceId = Number(processingObject?.workspaceId ?? 0);
			if (
				Number.isInteger(taskWorkspaceId)
				&& taskWorkspaceId > 0
				&& Number.isInteger(currentWorkspaceId)
				&& currentWorkspaceId > 0
				&& taskWorkspaceId !== currentWorkspaceId
			) {
				return false;
			}

			const taskRoadmapId = Number(processingObject?.roadmapId ?? 0);
			if (
				Number.isInteger(taskRoadmapId)
				&& taskRoadmapId > 0
				&& Number.isInteger(currentRoadmapId)
				&& currentRoadmapId > 0
				&& taskRoadmapId !== currentRoadmapId
			) {
				return false;
			}

			const taskMaterialId = Number(processingObject?.materialId ?? 0);
			if (
				Number.isInteger(taskMaterialId)
				&& taskMaterialId > 0
				&& knownMaterialIds.size > 0
				&& !knownMaterialIds.has(taskMaterialId)
			) {
				return false;
			}

			return true;
		});

		const hasActiveTask = Boolean(snapshot?.hasActiveTask) && tasks.length > 0;

		if (!hasActiveTask || tasks.length === 0) {
			clearPreLearningRequestGuard({ all: true });
			setIsGeneratingRoadmapPhases(false);
			setRoadmapPhaseGenerationTaskId(null);
			setQuizGenerationTaskByQuizId({});
			setQuizGenerationProgressByQuizId({});
			setGeneratingKnowledgePhaseIds([]);
			setGeneratingKnowledgeQuizPhaseIds([]);
			setGeneratingKnowledgeQuizKnowledgeKeys([]);
			setGeneratingPreLearningPhaseIds([]);

			// Clear stale progress from localStorage to prevent phantom processing state
			const staleKnowledgeKeys = Object.keys(progressTracking.knowledgeProgressByPhaseId || {});
			const stalePreLearningKeys = Object.keys(progressTracking.preLearningProgressByPhaseId || {});
			const stalePostLearningKeys = Object.keys(progressTracking.postLearningProgressByPhaseId || {});
			staleKnowledgeKeys.forEach((id) => progressTracking.clearProgress('knowledge', id));
			stalePreLearningKeys.forEach((id) => progressTracking.clearProgress('preLearning', id));
			stalePostLearningKeys.forEach((id) => progressTracking.clearProgress('postLearning', id));

			void fetchSources();
			bumpRoadmapReloadToken();
			return;
		}

		const recoveredPreLearningPhaseIds = new Set();
		const recoveredKnowledgePhaseIds = new Set();
		const recoveredKnowledgeQuizPhaseIds = new Set();
		const recoveredKnowledgeQuizKeys = new Set();

		tasks.forEach((task) => {
			const normalizedStatus = String(task?.status || "").toUpperCase();
			const normalizedMessage = String(task?.message || "").toUpperCase();
			const taskId = String(task?.taskId || "").trim();
			const percent = clampPercent(task?.percent ?? 0);
			const processingObject = (task?.processingObject && typeof task.processingObject === "object") ? task.processingObject : {};
			const taskType = String(processingObject?.taskType || "").toUpperCase();
			const progressQuizId = Number(processingObject?.quizId ?? 0);
			const progressPhaseId = Number(processingObject?.phaseId ?? 0);
			const progressKnowledgeId = Number(processingObject?.knowledgeId ?? 0);
			const progressRoadmapId = Number(processingObject?.roadmapId ?? 0);
			const hasValidQuizId = Number.isInteger(progressQuizId) && progressQuizId > 0;
			const hasValidPhaseId = Number.isInteger(progressPhaseId) && progressPhaseId > 0;
			const isGenericStatus = normalizedStatus === "PROCESSING" || normalizedStatus === "START";
			const hasExplicitRoadmapPhaseSignal = normalizedStatus === "ROADMAP_PHASES_PROCESSING"
				|| (isGenericStatus && taskType === "ROADMAP_PHASES");
			const hasGenericRoadmapPhaseSignal = normalizedStatus === "PROCESSING"
				&& !hasValidQuizId
				&& !hasValidPhaseId
				&& (
					normalizedMessage.includes("PHASE")
					|| normalizedMessage.includes("ROADMAP")
					|| normalizedMessage.includes("NGU CANH PHASE")
					|| normalizedMessage.includes("NGU CANH")
				);
			const isTaskStillProcessing = !(
				normalizedStatus.includes("COMPLETED")
				|| normalizedStatus.includes("ERROR")
				|| normalizedStatus.includes("FAILED")
				|| normalizedStatus.includes("CANCEL")
			);

			if (taskId) {
				progressTracking.updateTaskProgress(taskId, percent);
			}

			if (Number.isInteger(progressQuizId) && progressQuizId > 0) {
				if (taskId) {
					setQuizGenerationTaskByQuizId((current) => ({ ...current, [progressQuizId]: taskId }));
				}
				setQuizGenerationProgressByQuizId((current) => ({
					...current,
					[progressQuizId]: Math.max(Number(current?.[progressQuizId] ?? 0), percent),
				}));
			}

			if (hasExplicitRoadmapPhaseSignal || hasGenericRoadmapPhaseSignal) {
				setIsGeneratingRoadmapPhases(true);
				if (taskId) {
					setRoadmapPhaseGenerationTaskId(taskId);
				}
				setRoadmapPhaseGenerationProgress((current) => {
					if (percent <= 0) return current;
					return Math.max(Number(current) || 0, percent);
				});
			}

			if (normalizedStatus === "ROADMAP_PHASES_COMPLETED") {
				setIsGeneratingRoadmapPhases(false);
				setRoadmapPhaseGenerationTaskId(null);
				setRoadmapPhaseGenerationProgress(100);
				if (Number.isInteger(progressRoadmapId) && progressRoadmapId > 0) {
					setRoadmapAiRoadmapId(progressRoadmapId);
				}
				bumpRoadmapReloadToken();
			}

			const isPreLearningByStatus = normalizedStatus.includes("PRE_LEARNING");
			const isPreLearningByTaskType = isGenericStatus && taskType === "ROADMAP_PRE_LEARNING";
			const isPreLearning = isPreLearningByStatus || isPreLearningByTaskType;

			const isPhaseContentByStatus = normalizedStatus.includes("ROADMAP_PHASE_CONTENT");
			const isPhaseContentByTaskType = isGenericStatus && taskType === "ROADMAP_PHASE_CONTENT";
			const isPhaseContent = isPhaseContentByStatus || isPhaseContentByTaskType;

			const isKnowledgeQuizByStatus = normalizedStatus.includes("KNOWLEDGE_QUIZ");
			const isKnowledgeQuizByTaskType = isGenericStatus && taskType === "ROADMAP_KNOWLEDGE_QUIZ";
			const isKnowledgeQuiz = isKnowledgeQuizByStatus || isKnowledgeQuizByTaskType;

			const isKnowledgeByStatus = normalizedStatus.includes("KNOWLEDGE") && !isKnowledgeQuiz;
			const isPostLearningByStatus = normalizedStatus.includes("POST_LEARNING");

			if (isPreLearning && Number.isInteger(progressPhaseId) && progressPhaseId > 0 && percent > 0) {
				progressTracking.updatePreLearningProgress(progressPhaseId, percent);
			}

			if ((isKnowledgeByStatus || isKnowledgeQuiz || isPhaseContent)
				&& Number.isInteger(progressPhaseId)
				&& progressPhaseId > 0
				&& percent > 0) {
				progressTracking.updateKnowledgeProgress(progressPhaseId, percent);
			}

			if (isPostLearningByStatus && Number.isInteger(progressPhaseId) && progressPhaseId > 0 && percent > 0) {
				progressTracking.updatePostLearningProgress(progressPhaseId, percent);
			}

			if (!isTaskStillProcessing) {
				return;
			}

			if (isPreLearning && Number.isInteger(progressPhaseId) && progressPhaseId > 0) {
				recoveredPreLearningPhaseIds.add(progressPhaseId);
			}

			if (
				(isPhaseContent
					|| (isKnowledgeByStatus && !isKnowledgeQuiz)
					|| isPostLearningByStatus)
				&& Number.isInteger(progressPhaseId)
				&& progressPhaseId > 0
			) {
				recoveredKnowledgePhaseIds.add(progressPhaseId);
			}

			if (isKnowledgeQuiz && Number.isInteger(progressPhaseId) && progressPhaseId > 0) {
				recoveredKnowledgeQuizPhaseIds.add(progressPhaseId);
				if (Number.isInteger(progressKnowledgeId) && progressKnowledgeId > 0) {
					recoveredKnowledgeQuizKeys.add(`${progressPhaseId}:${progressKnowledgeId}`);
				}
			}
		});

		setGeneratingPreLearningPhaseIds(normalizePositiveIds(Array.from(recoveredPreLearningPhaseIds)));
		setGeneratingKnowledgePhaseIds(normalizePositiveIds(Array.from(recoveredKnowledgePhaseIds)));
		setGeneratingKnowledgeQuizPhaseIds(normalizePositiveIds(Array.from(recoveredKnowledgeQuizPhaseIds)));
		setGeneratingKnowledgeQuizKnowledgeKeys(Array.from(recoveredKnowledgeQuizKeys));
	}, [
		bumpRoadmapReloadToken,
		clearPreLearningRequestGuard,
		fetchSources,
		progressTracking,
		roadmapAiRoadmapId,
		sources,
		workspaceId,
	]);

	// WebSocket nhận realtime update cho tài liệu và roadmap AI progress
	const { isConnected: wsConnected, lastMessage: wsLastMessage } = useWebSocket({
		workspaceId: workspaceId,
		enabled: !!workspaceId,
		onMaterialUploaded: (data) => {
			console.log("[WorkspacePage] Material uploaded via WebSocket:", data);
			fetchSources();
		},
		onMaterialDeleted: () => {
			fetchSources();
		},
		onMaterialUpdated: () => {
			fetchSources();
		},
		onProgress: (progress) => {
			const status = String(progress?.status || "").toUpperCase();
			const progressData = (progress?.data && typeof progress.data === "object")
				? progress.data
				: (progress || {});
			const progressPhaseId = Number(
				progressData?.phaseId
				?? progressData?.phase_id
				?? progress?.phaseId
				?? progress?.phase_id
			);
			const progressRoadmapId = Number(
				progressData?.roadmapId
				?? progressData?.roadmap_id
				?? progress?.roadmapId
				?? progress?.roadmap_id
			);
			const progressPercent = clampPercent(
				progress?.percent
				?? progress?.progressPercent
				?? progressData?.percent
				?? progressData?.progressPercent
				?? 0
			);
			const websocketTaskId = progress?.websocketTaskId ?? progress?.taskId;
			const materialId = Number(progress?.materialId ?? progress?.material_id ?? 0);
			const progressQuizId = Number(
				progressData?.quizId
				?? progressData?.quiz_id
				?? progress?.quizId
				?? progress?.quiz_id
				?? 0
			);
			const progressStep = String(progress?.step ?? progressData?.step ?? "").toUpperCase();
			const progressMessage = String(progress?.message ?? progressData?.message ?? "").toUpperCase();
			const isQuizSignal = Number.isInteger(progressQuizId) && progressQuizId > 0
				|| (
					!status.startsWith("ROADMAP_")
					&& (
						status.includes("QUIZ")
						|| progressStep.includes("QUIZ")
						|| progressMessage.includes("QUIZ")
					)
				);

			// Cập nhật progress tracking cho task và material
			if (websocketTaskId) {
				progressTracking.updateTaskProgress(websocketTaskId, progressPercent);
			}
			if (materialId > 0) {
				progressTracking.updateMaterialProgress(materialId, progressPercent);
			}
			if (Number.isInteger(progressQuizId) && progressQuizId > 0 && websocketTaskId) {
				setQuizGenerationTaskByQuizId((current) => {
					if (current[progressQuizId] === websocketTaskId) return current;
					return {
						...current,
						[progressQuizId]: websocketTaskId,
					};
				});
			}
			if (isQuizSignal && Number.isInteger(progressQuizId) && progressQuizId > 0) {
				setQuizGenerationProgressByQuizId((current) => {
					const nextPercent = progressPercent > 0
						? progressPercent
						: (status.includes("COMPLETED") ? 100 : current[progressQuizId] ?? 0);
					if ((current[progressQuizId] ?? 0) === nextPercent) return current;
					return {
						...current,
						[progressQuizId]: nextPercent,
					};
				});
			}
			if (progressPercent > 0) {
				const isPreLearningSignal = status.includes("PRE_LEARNING")
					|| progressStep.includes("PRE_LEARNING")
					|| progressMessage.includes("PRE-LEARNING")
					|| progressMessage.includes("PRE LEARNING");
				const isKnowledgeSignal = status.includes("KNOWLEDGE") || progressStep.includes("KNOWLEDGE");
				const isKnowledgeQuizSignal = status.includes("KNOWLEDGE_QUIZ")
					|| progressStep.includes("GENERATING")
					|| progressMessage.includes("QUIZ");
				const isPostLearningSignal = status.includes("POST_LEARNING") || progressStep.includes("POST_LEARNING");

				let inferredPhaseId = progressPhaseId;
				if ((!Number.isInteger(inferredPhaseId) || inferredPhaseId <= 0)
					&& generatingPreLearningPhaseIds.length === 1
					&& !isKnowledgeSignal
					&& !isPostLearningSignal) {
					// Một số payload PROCESSING không trả phaseId, fallback phase pre-learning đang generate.
					inferredPhaseId = Number(generatingPreLearningPhaseIds[0]);
				}

				if ((!Number.isInteger(inferredPhaseId) || inferredPhaseId <= 0)
					&& generatingKnowledgeQuizPhaseIds.length === 1
					&& !isPreLearningSignal
					&& !isPostLearningSignal) {
					// Một số payload tạo quiz knowledge không trả phaseId/taskId, fallback phase quiz đang generate.
					inferredPhaseId = Number(generatingKnowledgeQuizPhaseIds[0]);
				}

				if (Number.isInteger(inferredPhaseId) && inferredPhaseId > 0) {
					const isPreLearningSkipped = skipPreLearningPhaseIds.includes(inferredPhaseId);
					if ((isPreLearningSignal || generatingPreLearningPhaseIds.includes(inferredPhaseId)) && !isPreLearningSkipped) {
						progressTracking.updatePreLearningProgress(inferredPhaseId, progressPercent);
					} else if (
						isKnowledgeSignal
						|| isKnowledgeQuizSignal
						|| generatingKnowledgePhaseIds.includes(inferredPhaseId)
						|| generatingKnowledgeQuizPhaseIds.includes(inferredPhaseId)
					) {
						progressTracking.updateKnowledgeProgress(inferredPhaseId, progressPercent);
					} else if (isPostLearningSignal) {
						progressTracking.updatePostLearningProgress(inferredPhaseId, progressPercent);
					}
				}
			}

			if (status === "ROADMAP_STRUCTURE_STARTED" || status === "ROADMAP_STRUCTURE_PROCESSING") {
				setIsGeneratingRoadmapStructure(true);
				focusRoadmapViewSafely();
				return;
			}

			if (status === "ROADMAP_STRUCTURE_COMPLETED" || status === "ROADMAP_COMPLETED") {
				setIsGeneratingRoadmapStructure(false);
				setRoadmapAiRoadmapId(progressRoadmapId || roadmapAiRoadmapId);
				focusRoadmapViewSafely();
				bumpRoadmapReloadToken();
				return;
			}

			if (status === "ROADMAP_PHASES_PROCESSING") {
				setIsGeneratingRoadmapPhases(true);
				if (websocketTaskId) {
					setRoadmapPhaseGenerationTaskId(websocketTaskId);
				}
				setRoadmapPhaseGenerationProgress((current) => {
					if (progressPercent > 0) return progressPercent;
					return current;
				});
				focusRoadmapViewSafely();
				return;
			}

			if (status === "ROADMAP_PHASES_COMPLETED") {
				stopPhaseGenerationPolling();
				setIsGeneratingRoadmapPhases(false);
				setRoadmapPhaseGenerationProgress(100);
				setRoadmapPhaseGenerationTaskId(null);
				if (websocketTaskId) {
					progressTracking.clearProgress('task', websocketTaskId);
				}
				const completedRoadmapId = progressRoadmapId || roadmapAiRoadmapId;
				setRoadmapAiRoadmapId(completedRoadmapId);
				focusRoadmapViewSafely();
				bumpRoadmapReloadToken();
				if (!isStudyNewRoadmap) {
					void triggerNonStudyPreLearningAfterPhases(completedRoadmapId);
				}
				return;
			}

			if (status === "ROADMAP_PHASE_CONTENT_COMPLETED") {
				const phaseId = progressPhaseId;
				if (Number.isInteger(phaseId) && phaseId > 0) {
					stopPhaseContentPolling(phaseId);
					setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== phaseId));
					progressTracking.clearProgress('knowledge', phaseId);
					progressTracking.clearProgress('postLearning', phaseId);
				} else {
					setGeneratingKnowledgePhaseIds([]);
				}
				if (websocketTaskId) {
					progressTracking.clearProgress('task', websocketTaskId);
				}
				focusRoadmapViewSafely();
				bumpRoadmapReloadToken();
				return;
			}

			if (status === "ROADMAP_KNOWLEDGE_QUIZ_COMPLETED") {
				const phaseId = progressPhaseId;
				if (Number.isInteger(phaseId) && phaseId > 0) {
					const knowledgeKeysToRefresh = generatingKnowledgeQuizKnowledgeKeys
						.filter((key) => String(key || "").startsWith(`${phaseId}:`));
					bumpKnowledgeQuizRefreshByKeys(knowledgeKeysToRefresh);

					knowledgeQuizGenerationRequestedRef.current[phaseId] = false;
					Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
						if (key.startsWith(`${phaseId}:`)) {
							knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
						}
					});
					setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== phaseId));
					setGeneratingKnowledgeQuizKnowledgeKeys((current) => current.filter((key) => !key.startsWith(`${phaseId}:`)));
					progressTracking.clearProgress('knowledge', phaseId);
				} else {
					// Payload có thể thiếu phaseId; refresh đúng các knowledge đang generate thay vì reload toàn roadmap.
					bumpKnowledgeQuizRefreshByKeys(generatingKnowledgeQuizKnowledgeKeys);
					knowledgeQuizGenerationRequestedRef.current = {};
					knowledgeQuizGenerationRequestedByKnowledgeRef.current = {};
					setGeneratingKnowledgeQuizPhaseIds([]);
					setGeneratingKnowledgeQuizKnowledgeKeys([]);
				}
				if (websocketTaskId) {
					progressTracking.clearProgress('task', websocketTaskId);
				}
				focusRoadmapViewSafely();
				return;
			}

			if (status === "ROADMAP_KNOWLEDGE_QUIZ_STARTED" || status === "ROADMAP_KNOWLEDGE_QUIZ_PROCESSING") {
				const phaseId = progressPhaseId;
				if (Number.isInteger(phaseId) && phaseId > 0) {
					setGeneratingKnowledgeQuizPhaseIds((current) => {
						if (current.includes(phaseId)) return current;
						return [...current, phaseId];
					});
				}
				focusRoadmapViewSafely();
				return;
			}

			if (status === "ROADMAP_PHASE_CONTENT_STARTED" || status === "ROADMAP_PHASE_CONTENT_PROCESSING") {
				const phaseId = progressPhaseId;
				if (Number.isInteger(phaseId) && phaseId > 0) {
					if (skipPreLearningPhaseIds.includes(phaseId)) {
						setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
					}
					setGeneratingKnowledgePhaseIds((current) => {
						if (current.includes(phaseId)) return current;
						return [...current, phaseId];
					});
				}
				focusRoadmapViewSafely();
				return;
			}

			if (status === "ROADMAP_PRE_LEARNING_STARTED" || status === "ROADMAP_PRE_LEARNING_PROCESSING") {
				const phaseId = progressPhaseId;
				if (Number.isInteger(phaseId) && phaseId > 0) {
					if (skipPreLearningPhaseIds.includes(phaseId)) {
						return;
					}
					setGeneratingPreLearningPhaseIds((current) => {
						if (current.includes(phaseId)) return current;
						return [...current, phaseId];
					});
				}
				focusRoadmapViewSafely();
				return;
			}

			if (status === "ROADMAP_PRE_LEARNING_COMPLETED") {
				const phaseId = progressPhaseId;
				const roadmapId = Number(progressRoadmapId || roadmapAiRoadmapId || 0);
				if (Number.isInteger(phaseId) && phaseId > 0) {
					clearPreLearningRequestGuard({ roadmapId, phaseId });
					progressTracking.clearProgress('preLearning', phaseId);
					if (skipPreLearningPhaseIds.includes(phaseId)) {
						setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
						return;
					}
					setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
				} else {
					setGeneratingPreLearningPhaseIds([]);
				}
				if (websocketTaskId) {
					progressTracking.clearProgress('task', websocketTaskId);
				}
				focusRoadmapViewSafely();
				bumpRoadmapReloadToken();
				return;
			}

				if (status === "ROADMAP_MODERATION_DONE") {
					if (websocketTaskId) {
						progressTracking.clearProgress('task', websocketTaskId);
					}
					void fetchSources();
					return;
				}

			if (status === "ERROR") {
				const phaseId = progressPhaseId;
				const roadmapId = progressRoadmapId;

				if (Number.isInteger(phaseId) && phaseId > 0) {
					clearPreLearningRequestGuard({ roadmapId, phaseId });
					knowledgeQuizGenerationRequestedRef.current[phaseId] = false;
					Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
						if (key.startsWith(`${phaseId}:`)) {
							knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
						}
					});
					setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== phaseId));
					setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== phaseId));
					setGeneratingKnowledgeQuizKnowledgeKeys((current) => current.filter((key) => !key.startsWith(`${phaseId}:`)));
					setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
					progressTracking.clearProgress('knowledge', phaseId);
					progressTracking.clearProgress('preLearning', phaseId);
					progressTracking.clearProgress('postLearning', phaseId);
					stopPhaseContentPolling(phaseId);
					stopPreLearningPolling(phaseId);
					stopKnowledgeQuizPolling(phaseId);
				}

				if (!Number.isInteger(phaseId) || phaseId <= 0) {
					clearPreLearningRequestGuard({ all: true });
					knowledgeQuizGenerationRequestedRef.current = {};
					knowledgeQuizGenerationRequestedByKnowledgeRef.current = {};
					knowledgeQuizPollingRef.current = {};
					setGeneratingKnowledgePhaseIds([]);
					setGeneratingKnowledgeQuizPhaseIds([]);
					setGeneratingKnowledgeQuizKnowledgeKeys([]);
					setGeneratingPreLearningPhaseIds([]);
					preLearningPollingRef.current = {};
				}

				if (websocketTaskId) {
					progressTracking.clearProgress('task', websocketTaskId);
				}

				if (Number.isInteger(roadmapId) && roadmapId > 0) {
					setIsGeneratingRoadmapPhases(false);
					setIsGeneratingRoadmapStructure(false);
					stopPhaseGenerationPolling();
				}

				bumpRoadmapReloadToken();
			}
		},
	});

	const { refreshActiveTaskSnapshot } = useActiveTaskFallback({
		enabled: Boolean(workspaceId),
		lastWebSocketMessage: wsLastMessage,
		onSnapshot: (snapshot) => {
			applyRecoveredActiveTaskSnapshot(snapshot);
		},
		silenceThresholdMs: 15000,
		pollIntervalMs: 15000,
	});

	useEffect(() => {
		if (!workspaceId) return;
		void refreshActiveTaskSnapshot("page-reload");
	}, [workspaceId, refreshActiveTaskSnapshot]);

	// Fetch workspace, initial sources, vÃ  kiá»ƒm tra profile
	useEffect(() => {
		if (!workspaceId) return;

		let isMounted = true;
		fetchWorkspaceDetail(workspaceId).catch(() => {});

		const loadInitialData = async () => {
			try {
				const [initialSources, profileRes] = await Promise.all([
					fetchSources(),
					getIndividualWorkspaceProfile(workspaceId).catch(() => null)
				]);

				if (!isMounted) return;

				// Kiá»ƒm tra xem profile Ä'Ã£ Ä'Æ°á»£c config hay chÆ°a:
				// Hiá»‡n táº¡i: chá»‰ cáº§n cÃ³ learningGoal (báº¯t buá»™c) lÃ  coi nhÆ° Ä'Ã£ cáº¥u hÃ¬nh
				const profileData = extractProfileData(profileRes);
				console.log("[RoadmapGate][WorkspacePage] Initial profile fetch", {
					workspaceId,
					rawProfileResponse: profileRes,
					resolvedProfileData: profileData,
					resolvedRoadmapEnabled: profileData?.roadmapEnabled,
				});
				const isConfigured = isProfileOnboardingDone(profileData);
				const storedMockTestGeneration = readStoredMockTestGeneration();

				setIsProfileConfigured(isConfigured);
				setWorkspaceProfile(profileData);

				if (isMockTestGenerationInProgress(profileData)) {
					mockTestShouldCloseAfterStartRef.current = Boolean(storedMockTestGeneration?.shouldCloseAfterStart);
					mockTestAutoFinalizePayloadRef.current = storedMockTestGeneration?.autoFinalizePayload || null;
					setMockTestGenerationStartedAt(
						Number(storedMockTestGeneration?.startedAt) || Date.now()
					);
					setMockTestGenerationState("pending");
					setMockTestGenerationMessage(getMockTestGeneratingMessage());
					setMockTestGenerationProgress(Number(storedMockTestGeneration?.progress) || 12);
					startMockTestGenerationPolling();
				} else if (hasCompletedProfileStepTwo(profileData) && storedMockTestGeneration) {
					mockTestShouldCloseAfterStartRef.current = Boolean(storedMockTestGeneration?.shouldCloseAfterStart);
					mockTestAutoFinalizePayloadRef.current = storedMockTestGeneration?.autoFinalizePayload || null;
					if (mockTestShouldCloseAfterStartRef.current && mockTestAutoFinalizePayloadRef.current) {
						await finalizeBackgroundMockTestProfile();
						return;
					}
					setMockTestGenerationState("ready");
					setMockTestGenerationMessage(getMockTestReadyMessage());
					setMockTestGenerationProgress(100);
				} else {
					resetMockTestGenerationStatus();
				}

				if (shouldKeepProfileWizardClosed(profileData, storedMockTestGeneration)) {
					setProfileOverviewOpen(false);
					setUploadDialogOpen(false);
					setProfileConfigOpen(false);
					return;
				}

				if (isConfigured) {
					setProfileConfigOpen(false);
					if (openProfileConfig) {
						navigate(`/workspace/${workspaceId}`, { replace: true });
						setProfileOverviewOpen(false);
						setUploadDialogOpen(false);
					} else if (initialSources.length === 0) {
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
		fetchWorkspaceDetail,
		finalizeBackgroundMockTestProfile,
		getMockTestGeneratingMessage,
		getMockTestReadyMessage,
		openProfileConfig,
		readStoredMockTestGeneration,
		resetMockTestGenerationStatus,
		startMockTestGenerationPolling,
	]);

	// Xá»­ lÃ½ Ä'Ã³ng/má»Ÿ profile config dialog
	const handleProfileConfigChange = useCallback((open) => {
		setProfileConfigOpen(open);
		if (open) {
			// Refetch profile khi má»Ÿ Ä'á»ƒ luÃ´n cÃ³ dá»¯ liá»‡u má»›i nháº¥t (bao gá»"m targetLevelId)
			getIndividualWorkspaceProfile(workspaceId)
				.then((res) => {
					const profileData = extractProfileData(res);
					const storedMockTestGeneration = readStoredMockTestGeneration();
					if (!profileData) return;

					setWorkspaceProfile(profileData);
					if (isMockTestGenerationInProgress(profileData)) {
						mockTestShouldCloseAfterStartRef.current = Boolean(storedMockTestGeneration?.shouldCloseAfterStart);
						mockTestAutoFinalizePayloadRef.current = storedMockTestGeneration?.autoFinalizePayload || null;
						setMockTestGenerationStartedAt(
							Number(storedMockTestGeneration?.startedAt) || Date.now()
						);
						setMockTestGenerationState("pending");
						setMockTestGenerationMessage(getMockTestGeneratingMessage());
						setMockTestGenerationProgress(Number(storedMockTestGeneration?.progress) || 12);
						startMockTestGenerationPolling();
					} else if (hasCompletedProfileStepTwo(profileData) && storedMockTestGeneration) {
						mockTestShouldCloseAfterStartRef.current = Boolean(storedMockTestGeneration?.shouldCloseAfterStart);
						mockTestAutoFinalizePayloadRef.current = storedMockTestGeneration?.autoFinalizePayload || null;
						if (mockTestShouldCloseAfterStartRef.current && mockTestAutoFinalizePayloadRef.current) {
							finalizeBackgroundMockTestProfile().catch(() => {});
							return;
						}
						setMockTestGenerationState("ready");
						setMockTestGenerationMessage(getMockTestReadyMessage());
						setMockTestGenerationProgress(100);
					} else {
						resetMockTestGenerationStatus();
					}
				})
				.catch(() => {});
		} else {
			setIsProfileUpdateMode(false);
			if (location.state?.openProfileConfig) {
			navigate(`/workspace/${workspaceId}`, { replace: true });
			}
		}
	}, [
		getMockTestGeneratingMessage,
		getMockTestReadyMessage,
		finalizeBackgroundMockTestProfile,
		location.state,
		navigate,
		readStoredMockTestGeneration,
		resetMockTestGenerationStatus,
		startMockTestGenerationPolling,
		workspaceId,
	]);

	const handleProfileOverviewChange = useCallback((open) => {
		setProfileOverviewOpen(open);
		if (open) {
			Promise.allSettled([
				getIndividualWorkspaceProfile(workspaceId),
				refreshWorkspacePersonalization(),
			])
				.then(([profileResult]) => {
					if (profileResult?.status !== "fulfilled") return;
					const profileData = extractProfileData(profileResult.value);
					if (profileData) setWorkspaceProfile(profileData);
				})
				.catch(() => {});
		} else if (location.state?.openProfileConfig) {
			navigate(`/workspace/${workspaceId}`, { replace: true });
		}
	}, [location.state, navigate, refreshWorkspacePersonalization, workspaceId]);

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
			const roadmapData = roadmapResponse?.data?.data || roadmapResponse?.data || roadmapResponse || null;
			const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];

			for (const phase of phases) {
				const knowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
				for (const knowledge of knowledges) {
					const knowledgeId = Number(knowledge?.knowledgeId);
					const phaseId = Number(phase?.phaseId);
					if (!Number.isInteger(knowledgeId) || knowledgeId <= 0 || !Number.isInteger(phaseId) || phaseId <= 0) {
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
				console.error("Failed to reset roadmap structure before updating onboarding:", error);
			}
		}
	}, [workspaceProfile]);

	const handleDeleteMaterialsForProfileUpdate = useCallback(async () => {
		if (!workspaceId || isResettingWorkspaceForProfileUpdate) return;

		setIsResettingWorkspaceForProfileUpdate(true);

		try {
			const [quizResponse, flashcardResponse] = await Promise.all([
				getQuizzesByScope("WORKSPACE", Number(workspaceId)),
				getFlashcardsByScope("WORKSPACE", Number(workspaceId)),
			]);

			const workspaceQuizzes = Array.isArray(quizResponse?.data) ? quizResponse.data : [];
			const workspaceFlashcards = Array.isArray(flashcardResponse?.data) ? flashcardResponse.data : [];

			await Promise.all(workspaceQuizzes.map((quiz) => {
				const quizId = Number(quiz?.quizId);
				if (!Number.isInteger(quizId) || quizId <= 0) return Promise.resolve();
				return deleteQuiz(quizId);
			}));

			await Promise.all(workspaceFlashcards.map((flashcardSet) => {
				const flashcardSetId = Number(
					flashcardSet?.flashcardSetId
					?? flashcardSet?.id
				);
				if (!Number.isInteger(flashcardSetId) || flashcardSetId <= 0) return Promise.resolve();
				return deleteFlashcardSet(flashcardSetId);
			}));

			await resetRoadmapStructureForProfileUpdate();

			const materialIds = sources
				.map((source) => Number(source?.id))
				.filter((id) => Number.isInteger(id) && id > 0);
			await Promise.all(materialIds.map((materialId) => deleteMaterial(materialId)));

			setSources([]);
			setSelectedSourceIds([]);
			setHasExistingWorkspaceQuiz(false);
			setHasExistingWorkspaceFlashcard(false);
			setRoadmapHasPhases(false);
			setIsRoadmapStructureMissing(false);
			setRoadmapReloadToken((current) => current + 1);
			await fetchWorkspaceDetail(workspaceId).catch(() => {});

			const latestProfile = extractProfileData(await getIndividualWorkspaceProfile(workspaceId));
			if (latestProfile) {
				setWorkspaceProfile(latestProfile);
				setIsProfileConfigured(isProfileOnboardingDone(latestProfile));
			}

			setProfileUpdateGuardOpen(false);
			setProfileOverviewOpen(false);
			setUploadDialogOpen(false);
			setIsProfileUpdateMode(true);
			setProfileConfigOpen(true);
			navigate(`/workspace/${workspaceId}`, { replace: true });
			showSuccess("Đã xóa tài liệu hiện tại. Bạn có thể cập nhật onboarding ngay bây giờ.");
		} catch (error) {
			console.error("Failed to prepare workspace for onboarding update:", error);
			showError(error?.message || "Không thể xóa dữ liệu hiện tại để cập nhật onboarding.");
		} finally {
			setIsResettingWorkspaceForProfileUpdate(false);
		}
	}, [
		workspaceId,
		isResettingWorkspaceForProfileUpdate,
		fetchWorkspaceDetail,
		navigate,
		resetRoadmapStructureForProfileUpdate,
		showError,
		showSuccess,
		sources,
	]);

	const handleSaveProfileConfig = useCallback(async (currentStep, data) => {
		try {
			let savedProfile = null;

			if (currentStep === 1) {
				if (data.workspacePurpose !== "MOCK_TEST") {
					resetMockTestGenerationStatus();
				}
				savedProfile = extractProfileData(await saveIndividualWorkspaceBasicStep(workspaceId, data));
				if (savedProfile) {
					setWorkspaceProfile(savedProfile);
				}
				return savedProfile;
			}

			if (currentStep === 2) {
				if (data.workspacePurpose === "MOCK_TEST") {
					await startIndividualWorkspaceMockTestPersonalInfoStep(workspaceId, data);
					const shouldCloseAfterStart = !data.enableRoadmap;
					mockTestShouldCloseAfterStartRef.current = shouldCloseAfterStart;
					mockTestAutoFinalizePayloadRef.current = shouldCloseAfterStart ? data : null;
					setMockTestGenerationStartedAt(Date.now());
					setMockTestGenerationElapsedSeconds(0);
					setMockTestGenerationProgress(12);
					setMockTestGenerationState("pending");
					setMockTestGenerationMessage(getMockTestGeneratingMessage());
					startMockTestGenerationPolling();
					if (shouldCloseAfterStart) {
						setProfileConfigOpen(false);
						setProfileOverviewOpen(false);
						navigate(`/workspace/${workspaceId}`, { replace: true });
					}
					return { deferred: true, advanceToStep: shouldCloseAfterStart ? null : 3 };
				} else {
					resetMockTestGenerationStatus();
					savedProfile = extractProfileData(await saveIndividualWorkspacePersonalInfoStep(workspaceId, data));
				}

				if (savedProfile) {
					setWorkspaceProfile(savedProfile);
				}
				return savedProfile;
			}

			resetMockTestGenerationStatus();
			savedProfile = extractProfileData(await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, data));
			if (savedProfile) {
				setWorkspaceProfile(savedProfile);
			}
			// Step 3 chỉ lưu draft. Chỉ khi user Confirm mới khóa onboarding và đóng wizard.
			showSuccess("Đã lưu cấu hình (draft). Bạn có thể tiếp tục chỉnh sửa hoặc bấm Xác nhận để hoàn tất.");
			return savedProfile;
		} catch (error) {
			console.error("Failed to config profile:", error);
			showError(
				error?.message
				|| translateOrFallback(
					t,
					"workspace.profileConfig.messages.saveError",
					"Khong the luu tien trinh thiet lap workspace."
				)
			);
			throw error;
		}
	}, [
		workspaceId,
		resetMockTestGenerationStatus,
		getMockTestGeneratingMessage,
		startMockTestGenerationPolling,
		showSuccess,
		t,
		showError,
	]);

	const handleConfirmProfileConfig = useCallback(async () => {
		if (!workspaceId) return;

		try {
			const response = await confirmIndividualWorkspaceProfile(workspaceId);
			const confirmedProfile = extractProfileData(response);

			if (confirmedProfile) {
				setWorkspaceProfile(confirmedProfile);
				setIsProfileConfigured(isProfileOnboardingDone(confirmedProfile));
			}

			setProfileConfigOpen(false);
			setProfileOverviewOpen(false);
			fetchWorkspaceDetail(workspaceId).catch(() => {});

			if (sources.length === 0) {
				setUploadDialogOpen(true);
			}

			showSuccess(
				translateOrFallback(
					t,
					"workspace.profileConfig.messages.finishSuccess",
					"Hoàn thành thiết lập workspace thành công."
				)
			);
			navigate(`/workspace/${workspaceId}`, { replace: true });
		} catch (error) {
			console.error("Failed to confirm profile:", error);
			showError(error?.message || "Không thể xác nhận onboarding. Vui lòng thử lại.");
			throw error;
		}
	}, [workspaceId, fetchWorkspaceDetail, navigate, showError, showSuccess, sources.length, t]);

	// Chặn back navigation quay lại màn hình onboarding sau khi đã hoàn thành
	useEffect(() => {
		if (!isProfileConfigured || profileConfigOpen) return;

		// Đẩy một sentinel entry vào history để có thể intercept back
		window.history.pushState({ __onboardingDone: true }, '');

		const handlePopState = (event) => {
			if (event.state?.__onboardingDone) {
				// Re-push sentinel để ngăn quay lại — người dùng đang "back" vào wizard
				window.history.pushState({ __onboardingDone: true }, '');
			}
		};

		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, [isProfileConfigured, profileConfigOpen]);

	// Xá»­ lÃ½ upload file tÃ i liá»‡u - SONG SONG Ä'á»ƒ tÄƒng tá»'c
	const handleUploadFiles = useCallback(async (files) => {
        try {
            const uploadPromises = files.map((file) => uploadMaterial(file, workspaceId));
            await Promise.all(uploadPromises);
            return await fetchSources();
        } catch (error) {
            console.error("Failed to upload files:", error);
            throw error;
        }
	}, [workspaceId, fetchSources]);

	// XÃ³a tÃ i liá»‡u Ä'Æ¡n láº»
	const handleRemoveSource = useCallback(async (sourceId) => {
        try {
            await deleteMaterial(sourceId);
            fetchSources();
        } catch (error) {
            console.error("Failed to delete material:", error);
        }
	}, [fetchSources]);

	// XÃ³a nhiá»u tÃ i liá»‡u cÃ¹ng lÃºc - SONG SONG
	const handleRemoveMultipleSources = useCallback(async (sourceIds) => {
        try {
            // XÃ³a táº¥t cáº£ files song song thay vÃ¬ tuáº§n tá»±
            const deletePromises = sourceIds.map(id => deleteMaterial(id));
            await Promise.all(deletePromises);
            fetchSources();
        } catch (error) {
            console.error("Failed to delete materials:", error);
        }
	}, [fetchSources]);

	// HÃ m thÃªm vÃ o lá»‹ch sá»­ truy cáº­p â€" ghi nháº­n má»—i láº§n truy cáº­p list view
	const addAccessHistory = useCallback((name, type, actionKey) => {
		setAccessHistory((prev) => {
			// XÃ³a trÃ¹ng náº¿u Ä'Ã£ cÃ³ item cÃ¹ng actionKey
			const filtered = prev.filter((item) => item.actionKey !== actionKey);
			return [{ name, type, actionKey, accessedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
		});
	}, []);

	// Xá»­ lÃ½ action tá»« Studio Panel â€" hiá»ƒn thá»‹ form inline trong ChatPanel
	const handleStudioAction = useCallback((actionKey) => {
		if (actionKey === "roadmap" && shouldDisableRoadmapForStudio) {
			return;
		}

		// Ghi lá»‹ch sá»­ truy cáº­p khi ngÆ°á»i dÃ¹ng má»Ÿ list view
		const viewTypeMap = { roadmap: "roadmap", quiz: "quiz", flashcard: "flashcard", mockTest: "mockTest", questionStats: "questionStats" };
		if (viewTypeMap[actionKey]) {
			addAccessHistory(viewTypeMap[actionKey], viewTypeMap[actionKey], actionKey);
		}
		setActiveView(actionKey);
		if (actionKey !== "quiz" && actionKey !== "quizDetail" && actionKey !== "editQuiz") {
			setQuizBackTarget(null);
		}
		if (actionKey !== "roadmap") {
			setSelectedRoadmapPhaseId(null);
		}
	}, [addAccessHistory, shouldDisableRoadmapForStudio]);

	const handleSelectRoadmapPhase = useCallback((phaseId, options = {}) => {
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		setSelectedRoadmapPhaseId(normalizedPhaseId);

		// Giữ nguyên view hiện tại khi chỉ auto-chọn phase nền, tránh bị kéo khỏi quiz lúc reload.
		if (options?.preserveActiveView) return;

		setSelectedQuiz(null);
		setQuizBackTarget(null);
		setActiveView("roadmap");
	}, []);

	// Xá»­ lÃ½ táº¡o quiz â€" callback khi CreateQuizForm hoÃ n táº¥t API multi-step
	const handleCreateQuiz = useCallback(async (data) => {
		const normalizedQuizId = Number(data?.quizId ?? data?.id ?? 0);
		const websocketTaskId = data?.websocketTaskId ?? data?.taskId ?? null;
		const initialProgress = clampPercent(
			data?.percent
			?? data?.progressPercent
			?? data?.processingPercent
			?? 0
		);

		if (Number.isInteger(normalizedQuizId) && normalizedQuizId > 0 && websocketTaskId) {
			setQuizGenerationTaskByQuizId((current) => {
				if (current[normalizedQuizId] === websocketTaskId) return current;
				return {
					...current,
					[normalizedQuizId]: websocketTaskId,
				};
			});
		}

		if (Number.isInteger(normalizedQuizId) && normalizedQuizId > 0 && initialProgress > 0) {
			setQuizGenerationProgressByQuizId((current) => ({
				...current,
				[normalizedQuizId]: initialProgress,
			}));
		}

		// Quiz Ä'Ã£ Ä'Æ°á»£c táº¡o xong tá»« CreateQuizForm â†' chuyá»ƒn vá» list view
		setActiveView("quiz");
	}, []);

	const handleShareQuiz = useCallback(async (quiz) => {
		const quizId = Number(quiz?.quizId);
		if (!Number.isInteger(quizId) || quizId <= 0) return;

		const shouldShare = quiz?.communityShared !== true;
		await shareQuizToCommunity(quizId, shouldShare);
		showSuccess(
			shouldShare
				? t("workspace.quiz.sharedToCommunitySuccess", "Đã chia sẻ quiz lên cộng đồng.")
				: t("workspace.quiz.unsharedFromCommunitySuccess", "Đã chuyển quiz về private.")
		);
	}, [showSuccess, t]);

	// Xá»­ lÃ½ xem chi tiáº¿t quiz â€" khi click vÃ o quiz trong danh sÃ¡ch
	const handleViewQuiz = useCallback((quiz, options = null) => {
		const backTarget = options?.backTarget || null;
		setSelectedQuiz(quiz);
		setQuizBackTarget(backTarget);
		if (backTarget?.view === "roadmap" && Number.isInteger(Number(backTarget?.phaseId)) && Number(backTarget.phaseId) > 0) {
			setSelectedRoadmapPhaseId(Number(backTarget.phaseId));
		}
		setActiveView("quizDetail");
	}, []);

	// Xá»­ lÃ½ chuyá»ƒn sang chá»‰nh sá»­a quiz â€" tá»« detail view
	const handleEditQuiz = useCallback((quiz) => {
		setSelectedQuiz(quiz);
		setActiveView("editQuiz");
	}, []);

	// Xá»­ lÃ½ lÆ°u quiz sau khi chá»‰nh sá»­a â€" quay vá» detail view
	const handleSaveQuiz = useCallback((updatedQuiz) => {
		setSelectedQuiz((prev) => ({ ...prev, ...updatedQuiz }));
		setActiveView("quizDetail");
	}, []);

	// Xá»­ lÃ½ táº¡o flashcard â€" callback tá»« CreateFlashcardForm (API Ä'Ã£ gá»i xong)
	const handleCreateFlashcard = useCallback(async () => {
		// Chuyá»ƒn vá» list view Ä'á»ƒ reload danh sÃ¡ch
		setActiveView("flashcard");
	}, []);

	// Xá»­ lÃ½ xem chi tiáº¿t flashcard â€" khi click vÃ o flashcard trong danh sÃ¡ch
	const handleViewFlashcard = useCallback((flashcard) => {
		setSelectedFlashcard(flashcard);
		setActiveView("flashcardDetail");
	}, []);

	// Xá»­ lÃ½ xÃ³a flashcard â€" gá»i API xÃ³a flashcard set
	const handleDeleteFlashcard = useCallback(async (flashcard) => {
		if (!window.confirm(t("workspace.confirmDeleteFlashcard"))) return;
		try {
			const { deleteFlashcardSet } = await import("@/api/FlashcardAPI");
			await deleteFlashcardSet(flashcard.flashcardSetId);
			// Quay vá» list view Ä'á»ƒ reload danh sÃ¡ch
			setActiveView("flashcard");
		} catch (err) {
			console.error("XÃ³a flashcard tháº¥t báº¡i:", err);
		}
	}, []);

	// Xá»­ lÃ½ táº¡o roadmap â€" gá»i API táº¡o roadmap cho workspace cÃ¡ nhÃ¢n
	const handleCreateRoadmap = useCallback(async (data) => {
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
			// Lá»—i táº¡o roadmap â€" log Ä'á»ƒ debug
			console.error("Táº¡o roadmap tháº¥t báº¡i:", err);
			throw err;
		}
	}, [workspaceId]);

	// Quay vá» list view tÆ°Æ¡ng á»©ng khi báº¥m nÃºt Back trong form táº¡o
	const handleBackFromForm = useCallback(() => {
		if (activeView === "quizDetail" && quizBackTarget?.view === "roadmap") {
			const phaseId = Number(quizBackTarget?.phaseId);
			setSelectedQuiz(null);
			setActiveView("roadmap");
			if (Number.isInteger(phaseId) && phaseId > 0) {
				setSelectedRoadmapPhaseId(phaseId);
				const normalizedRoadmapId = Number(quizBackTarget?.roadmapId || roadmapAiRoadmapId);
				if (workspaceId && Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0) {
					navigate(`/workspace/${workspaceId}/roadmap/${normalizedRoadmapId}/phase/${phaseId}`, { replace: true });
				} else if (workspaceId) {
					navigate(`/workspace/${workspaceId}/roadmap`, { replace: true });
				}
			}
			return;
		}

		const formToList = { createRoadmap: "roadmap", createQuiz: "quiz", createFlashcard: "flashcard", quizDetail: "quiz", editQuiz: "quizDetail", flashcardDetail: "flashcard", createMockTest: "mockTest", mockTestDetail: "mockTest", editMockTest: "mockTestDetail" };
		const nextView = formToList[activeView] || null;
		if (nextView !== "quizDetail" && nextView !== "editQuiz") {
			setSelectedQuiz(null);
			setQuizBackTarget(null);
		}
		if (nextView !== "flashcardDetail") {
			setSelectedFlashcard(null);
		}
		if (nextView !== "mockTestDetail" && nextView !== "editMockTest") {
			setSelectedMockTest(null);
		}
		setActiveView(nextView);
	}, [activeView, navigate, quizBackTarget, workspaceId]);

	// Xá»­ lÃ½ táº¡o mock test â€" quay vá» list sau khi táº¡o thÃ nh cÃ´ng
	const handleCreateMockTest = useCallback(async () => {
		setActiveView("mockTest");
	}, []);

	// Xá»­ lÃ½ xem chi tiáº¿t mock test
	const handleViewMockTest = useCallback((mt) => {
		setSelectedMockTest(mt);
		setActiveView("mockTestDetail");
	}, []);

	// Xá»­ lÃ½ chá»‰nh sá»­a mock test
	const handleEditMockTest = useCallback((mt) => {
		setSelectedMockTest(mt);
		setActiveView("editMockTest");
	}, []);

	// Xá»­ lÃ½ lÆ°u mock test sau khi chá»‰nh sá»­a
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

	const headerActionClass = `app-topbar-action gap-1.5 ${
		isDarkMode
			? "border-white/10 bg-slate-900/85 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(2,6,23,0.32)] hover:border-cyan-400/30 hover:bg-slate-800/95 hover:text-white"
			: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
	}`;

	const settingsMenu = (
		<div className="flex items-center gap-2">
			<Button
				variant="outline"
				type="button"
				onClick={handleWorkspaceProfileClick}
				className={`${headerActionClass} lg:min-w-[14rem] lg:justify-start`}
				title={t("workspace.settingsMenu.workspaceProfile")}
			>
				<UserCircle className="h-4 w-4 shrink-0" />
				<span className="app-topbar-action-label hidden lg:inline">
					{t("workspace.settingsMenu.workspaceProfile")}
				</span>
			</Button>

			<Button
				variant="outline"
				type="button"
				onClick={toggleLanguage}
				className={`${headerActionClass} min-w-[4.25rem] justify-center`}
				title={t("common.language")}
			>
				<Globe className="h-4 w-4 shrink-0" />
				<span className="app-topbar-action-value hidden sm:inline min-w-[1.75rem] uppercase">
					{currentLang === "vi" ? "VI" : "EN"}
				</span>
			</Button>

			<Button
				variant="outline"
				type="button"
				onClick={toggleDarkMode}
				className={`${headerActionClass} min-w-[6rem] justify-center`}
				title={t("common.theme")}
			>
				{isDarkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
				<span className="app-topbar-action-value hidden md:inline min-w-[3.25rem]">
					{isDarkMode ? t("common.dark") : t("common.light")}
				</span>
			</Button>
		</div>
	);

	// Xá»­ lÃ½ nÃºt click Ä'á»ƒ má»Ÿ Upload Dialog â€" Pháº£i check config trÆ°á»›c
	const handleUploadClickSafe = useCallback(() => {
		if (!isProfileConfigured) {
			// Profile chÆ°a cáº¥u hÃ¬nh Ä'á»§, yÃªu cáº§u cáº­p nháº­t Profile trÆ°á»›c
			setProfileConfigOpen(true);
			setProfileOverviewOpen(false);
		} else {
			// Profile há»£p lá»‡, cho phÃ©p upload
			setUploadDialogOpen(true);
		}
	}, [isProfileConfigured]);

	return (
		<div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${isDarkMode ? "bg-slate-950" : "bg-[#F7FBFF]"}`}>
			<WorkspaceHeader
				settingsMenu={settingsMenu}
				isDarkMode={isDarkMode}
				workspaceTitle={currentWorkspace?.displayTitle || currentWorkspace?.title || currentWorkspace?.name || ""}
				workspaceName={currentWorkspace?.title || currentWorkspace?.name || ""}
				workspaceSubtitle={currentWorkspace?.topic?.title || currentWorkspace?.subject?.title}
				workspaceDescription={currentWorkspace?.description || ""}
				onEditWorkspace={async (data) => {
					await editWorkspace(Number(workspaceId), data);
				}}
				wsConnected={wsConnected}
			/>
			{mockTestGenerationState !== "idle" ? (
				<div className="px-4 pt-4">
					<div className={`max-w-[1740px] mx-auto rounded-2xl border px-4 py-3 ${
						mockTestGenerationState === "ready"
							? isDarkMode
								? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
								: "border-emerald-200 bg-emerald-50 text-emerald-800"
							: isMockTestTakingLongerThanExpected
								? isDarkMode
									? "border-amber-400/20 bg-amber-500/10 text-amber-100"
									: "border-amber-200 bg-amber-50 text-amber-800"
							: mockTestGenerationState === "error"
								? isDarkMode
									? "border-rose-400/20 bg-rose-500/10 text-rose-100"
									: "border-rose-200 bg-rose-50 text-rose-800"
								: isDarkMode
									? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
									: "border-cyan-200 bg-cyan-50 text-cyan-800"
					}`}>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="min-w-0 flex-1">
								<p className={`text-sm font-semibold ${fontClass}`}>{mockTestGenerationDisplayMessage}</p>
								<div className={`mt-2 h-2 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-900/70" : "bg-white/80"}`}>
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
										style={{ width: `${Math.max(0, Math.min(100, Number(mockTestGenerationProgress) || 0))}%` }}
									/>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<span className={`text-xs font-semibold ${fontClass}`}>{mockTestGenerationDisplayLabel}</span>
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
									className={`rounded-full ${isDarkMode ? "border-white/10 bg-slate-950/40 text-white hover:bg-slate-900" : "border-white bg-white text-slate-700 hover:bg-slate-100"}`}
								>
									{mockTestGenerationState === "ready" ? "Mở Mock test" : mockTestGenerationState === "pending" ? "Kiểm tra lại ngay" : "Xem trạng thái"}
								</Button>
							</div>
						</div>
					</div>
				</div>
			) : null}
			<div className="flex-1 min-h-0">
				<div ref={workspaceLayoutRef} className="max-w-[1740px] mx-auto px-4 py-4 h-full">
					{/* Layout workspace: bình thường là 3 cột, màn hình quá nhỏ thì đưa sources + studio xuống dưới */}
					{shouldStackSidePanels ? (
						<div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,40%)] gap-4">
							<div className="min-h-0">
								<ChatPanel
									isDarkMode={isDarkMode}
									sources={sources}
									selectedSourceIds={selectedSourceIds}
									selectedRoadmapPhaseId={selectedRoadmapPhaseId}
									activeView={activeView}
									createdItems={createdItems}
									onUploadClick={handleUploadClickSafe}
									onChangeView={handleStudioAction}
									onCreateQuiz={handleCreateQuiz}
									onCreateFlashcard={handleCreateFlashcard}
									onCreateRoadmap={handleCreateRoadmap}
											onCreateRoadmapPhases={handleOpenRoadmapPhaseDialog}
											onRoadmapPhaseFocus={handleSelectRoadmapPhase}
											onCreatePhaseKnowledge={handleCreatePhaseKnowledge}
											onCreateKnowledgeQuizForKnowledge={handleCreateKnowledgeQuizForKnowledge}
											onCreatePhasePreLearning={handleCreatePhasePreLearning}
											isStudyNewRoadmap={isStudyNewRoadmap}
											isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
											roadmapPhaseGenerationProgress={effectiveRoadmapPhaseGenerationProgress}
											generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
											generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
											generatingKnowledgeQuizKnowledgeKeys={generatingKnowledgeQuizKnowledgeKeys}
											knowledgeQuizRefreshByKey={knowledgeQuizRefreshByKey}
											generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
											skipPreLearningPhaseIds={skipPreLearningPhaseIds}
											roadmapReloadToken={roadmapReloadToken}
											onReloadRoadmap={bumpRoadmapReloadToken}
									onCreateMockTest={handleCreateMockTest}
									onBack={handleBackFromForm}
									workspaceId={workspaceId}
									selectedQuiz={selectedQuiz}
									onViewQuiz={handleViewQuiz}
									onEditQuiz={handleEditQuiz}
									onSaveQuiz={handleSaveQuiz}
									onShareQuiz={handleShareQuiz}
									selectedFlashcard={selectedFlashcard}
									onViewFlashcard={handleViewFlashcard}
									onDeleteFlashcard={handleDeleteFlashcard}
									selectedMockTest={selectedMockTest}
									onViewMockTest={handleViewMockTest}
									onEditMockTest={handleEditMockTest}
									onSaveMockTest={handleSaveMockTest}
									shouldDisableQuiz={shouldDisableQuiz}
									shouldDisableFlashcard={shouldDisableFlashcard}
									shouldDisableRoadmap={shouldDisableRoadmapForStudio}
									showRoadmapAction={shouldShowRoadmapAction}
									shouldDisableCreateQuiz={shouldDisableCreateQuiz}
									shouldDisableCreateFlashcard={shouldDisableCreateFlashcard}
									progressTracking={progressTracking}
									quizGenerationTaskByQuizId={quizGenerationTaskByQuizId}
									quizGenerationProgressByQuizId={quizGenerationProgressByQuizId}
								/>
							</div>

							<div className="grid min-h-0 grid-cols-2 gap-4">
								<div className="min-w-0 min-h-0">
									<div className="relative h-full overflow-hidden">
										<div className={`absolute inset-0 transition-all duration-300 ${isRoadmapJourActive ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}>
											<SourcesPanel
												isDarkMode={isDarkMode}
												sources={sources}
												onAddSource={handleUploadClickSafe}
												onRemoveSource={handleRemoveSource}
												onRemoveMultiple={handleRemoveMultipleSources}
												selectedIds={selectedSourceIds}
												onSelectionChange={setSelectedSourceIds}
												onSourceUpdated={(updatedSource) => {
													setSources((prev) => prev.map((item) => item.id === updatedSource.id ? { ...item, ...updatedSource } : item));
												}}
												onDetailViewChange={setIsMaterialDetailOpen}
												forceCloseDetail={isRoadmapJourActive}
												isCollapsed={false}
												onToggleCollapse={handleToggleSourcesCollapse}
												progressTracking={progressTracking}
											/>
										</div>
										{shouldRenderRoadmapJourPanel ? (
											<div className={`absolute inset-0 transition-all duration-300 ${isRoadmapJourActive ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
												<DeferredWorkspacePanel>
													<LazyRoadmapJourPanel
														isDarkMode={isDarkMode}
														workspaceId={workspaceId}
														selectedPhaseId={selectedRoadmapPhaseId}
														onSelectPhase={handleSelectRoadmapPhase}
														reloadToken={roadmapReloadToken}
														isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
														roadmapPhaseGenerationProgress={effectiveRoadmapPhaseGenerationProgress}
														progressTracking={progressTracking}
														generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
														generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
														generatingKnowledgeQuizKnowledgeKeys={generatingKnowledgeQuizKnowledgeKeys}
														generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
														isCollapsed={false}
														onToggleCollapse={handleToggleSourcesCollapse}
													/>
												</DeferredWorkspacePanel>
											</div>
										) : null}
									</div>
								</div>

								<div className="min-w-0 min-h-0">
									<StudioPanel
										isDarkMode={isDarkMode}
										onAction={handleStudioAction}
										accessHistory={accessHistory}
										isCollapsed={false}
										onToggleCollapse={handleToggleStudioCollapse}
										activeView={activeView}
										shouldDisableQuiz={shouldDisableQuiz}
										shouldDisableFlashcard={shouldDisableFlashcard}
										shouldDisableRoadmap={shouldDisableRoadmapForStudio}
										showRoadmapAction={shouldShowRoadmapAction}
									/>
								</div>
							</div>
						</div>
					) : (
						<div className="flex h-full gap-4">
							{/* Panel nguá»"n tÃ i liá»‡u (trÃ¡i) */}
							<div
								style={{ width: effectiveLeftWidth, minWidth: effectiveLeftWidth }}
								className="shrink-0 h-full transition-[width,min-width] duration-300 ease-in-out"
							>
								<div className="relative h-full overflow-hidden">
									<div className={`absolute inset-0 transition-all duration-300 ${isRoadmapJourActive ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}>
										<SourcesPanel
											isDarkMode={isDarkMode}
											sources={sources}
											onAddSource={handleUploadClickSafe}
											onRemoveSource={handleRemoveSource}
											onRemoveMultiple={handleRemoveMultipleSources}
											selectedIds={selectedSourceIds}
											onSelectionChange={setSelectedSourceIds}
											onSourceUpdated={(updatedSource) => {
												setSources((prev) => prev.map((item) => item.id === updatedSource.id ? { ...item, ...updatedSource } : item));
											}}
											onDetailViewChange={setIsMaterialDetailOpen}
											forceCloseDetail={isRoadmapJourActive}
											isCollapsed={effectiveSourcesCollapsed}
											onToggleCollapse={handleToggleSourcesCollapse}
											progressTracking={progressTracking}
										/>
									</div>
									{shouldRenderRoadmapJourPanel ? (
										<div className={`absolute inset-0 transition-all duration-300 ${isRoadmapJourActive ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
											<DeferredWorkspacePanel>
												<LazyRoadmapJourPanel
													isDarkMode={isDarkMode}
													workspaceId={workspaceId}
													selectedPhaseId={selectedRoadmapPhaseId}
													onSelectPhase={handleSelectRoadmapPhase}
													reloadToken={roadmapReloadToken}
													isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
													roadmapPhaseGenerationProgress={effectiveRoadmapPhaseGenerationProgress}
													progressTracking={progressTracking}
													generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
													generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
													generatingKnowledgeQuizKnowledgeKeys={generatingKnowledgeQuizKnowledgeKeys}
													generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
													isCollapsed={effectiveSourcesCollapsed}
													onToggleCollapse={handleToggleSourcesCollapse}
												/>
											</DeferredWorkspacePanel>
										</div>
									) : null}
								</div>
							</div>


							{/* Panel khu vá»±c há»c táº­p (giá»¯a) */}
							<div style={{ minWidth: CHAT_PANEL_MIN_WIDTH }} className="flex-1 min-w-0 h-full">
								<ChatPanel
									isDarkMode={isDarkMode}
									sources={sources}
									selectedSourceIds={selectedSourceIds}
									selectedRoadmapPhaseId={selectedRoadmapPhaseId}
									activeView={activeView}
									createdItems={createdItems}
									onUploadClick={handleUploadClickSafe}
									onChangeView={handleStudioAction}
									onCreateQuiz={handleCreateQuiz}
									onCreateFlashcard={handleCreateFlashcard}
									onCreateRoadmap={handleCreateRoadmap}
									onCreateRoadmapPhases={handleOpenRoadmapPhaseDialog}
									onRoadmapPhaseFocus={handleSelectRoadmapPhase}
									onCreatePhaseKnowledge={handleCreatePhaseKnowledge}
									onCreateKnowledgeQuizForKnowledge={handleCreateKnowledgeQuizForKnowledge}
									onCreatePhasePreLearning={handleCreatePhasePreLearning}
									isStudyNewRoadmap={isStudyNewRoadmap}
									adaptationMode={workspaceAdaptationMode}
									isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
									roadmapPhaseGenerationProgress={effectiveRoadmapPhaseGenerationProgress}
									generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
									generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
									generatingKnowledgeQuizKnowledgeKeys={generatingKnowledgeQuizKnowledgeKeys}
									knowledgeQuizRefreshByKey={knowledgeQuizRefreshByKey}
									generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
									skipPreLearningPhaseIds={skipPreLearningPhaseIds}
									roadmapReloadToken={roadmapReloadToken}
									onReloadRoadmap={bumpRoadmapReloadToken}
									onCreateMockTest={handleCreateMockTest}
									onBack={handleBackFromForm}
									workspaceId={workspaceId}
									selectedQuiz={selectedQuiz}
									onViewQuiz={handleViewQuiz}
									onEditQuiz={handleEditQuiz}
									onSaveQuiz={handleSaveQuiz}
									onShareQuiz={handleShareQuiz}
									selectedFlashcard={selectedFlashcard}
									onViewFlashcard={handleViewFlashcard}
									onDeleteFlashcard={handleDeleteFlashcard}
									selectedMockTest={selectedMockTest}
									onViewMockTest={handleViewMockTest}
									onEditMockTest={handleEditMockTest}
									onSaveMockTest={handleSaveMockTest}
									shouldDisableQuiz={shouldDisableQuiz}
									shouldDisableFlashcard={shouldDisableFlashcard}
									shouldDisableRoadmap={shouldDisableRoadmapForStudio}
									showRoadmapAction={shouldShowRoadmapAction}
									shouldDisableCreateQuiz={shouldDisableCreateQuiz}
									shouldDisableCreateFlashcard={shouldDisableCreateFlashcard}
									progressTracking={progressTracking}
									quizGenerationTaskByQuizId={quizGenerationTaskByQuizId}
									quizGenerationProgressByQuizId={quizGenerationProgressByQuizId}
								/>
							</div>


							{/* Panel Studio (pháº£i) */}
							<div
								style={{ width: effectiveRightWidth, minWidth: effectiveRightWidth }}
								className="shrink-0 h-full transition-[width,min-width] duration-300 ease-in-out"
							>
								<StudioPanel
									isDarkMode={isDarkMode}
									onAction={handleStudioAction}
									accessHistory={accessHistory}
									isCollapsed={effectiveStudioCollapsed}
									onToggleCollapse={handleToggleStudioCollapse}
									activeView={activeView}
									shouldDisableQuiz={shouldDisableQuiz}
									shouldDisableFlashcard={shouldDisableFlashcard}
									shouldDisableRoadmap={shouldDisableRoadmapForStudio}
									showRoadmapAction={shouldShowRoadmapAction}
								/>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Dialog táº£i tÃ i liá»‡u */}
			{uploadDialogOpen ? (
				<DeferredWorkspaceDialog>
					<LazyUploadSourceDialog
						open={uploadDialogOpen}
						onOpenChange={setUploadDialogOpen}
						isDarkMode={isDarkMode}
						onUploadFiles={handleUploadFiles}
						workspaceId={workspaceId}
						onSuggestedImported={fetchSources}
					/>
				</DeferredWorkspaceDialog>
			) : null}

			{phaseGenerateDialogOpen ? (
				<DeferredWorkspaceDialog>
					<LazyRoadmapPhaseGenerateDialog
						open={phaseGenerateDialogOpen}
						onOpenChange={setPhaseGenerateDialogOpen}
						isDarkMode={isDarkMode}
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
						isDarkMode={isDarkMode}
						uploadedMaterials={sources}
						workspaceId={workspaceId}
						forceStartAtStepOne={isProfileUpdateMode || (openProfileConfig && !isProfileConfigured)}
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
						isDarkMode={isDarkMode}
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
						isDarkMode={isDarkMode}
						currentLang={i18n.language?.startsWith('en') ? 'en' : 'vi'}
						materialCount={materialCountForProfile}
						hasLearningData={hasWorkspaceLearningDataAtRisk}
						onDeleteAndContinue={handleDeleteMaterialsForProfileUpdate}
						deleting={isResettingWorkspaceForProfileUpdate}
					/>
				</DeferredWorkspaceDialog>
			) : null}


		</div>
	);
}

export default WorkspacePage;

