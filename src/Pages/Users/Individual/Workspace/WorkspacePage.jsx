import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/Components/ui/button";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import RoadmapJourPanel from "@/Pages/Users/Individual/Workspace/Components/RoadmapJourPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";
import UploadSourceDialog from "@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog";
import RoadmapPhaseGenerateDialog from "@/Pages/Users/Individual/Workspace/Components/RoadmapPhaseGenerateDialog";
import IndividualWorkspaceProfileConfigDialog from "@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog";
import IndividualWorkspaceProfileOverviewDialog from "@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog";
import { Globe, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProgressTracking } from "@/hooks/useProgressTracking";
import {
	getIndividualWorkspaceProfile,
	saveIndividualWorkspaceBasicStep,
	saveIndividualWorkspacePersonalInfoStep,
	saveIndividualWorkspaceRoadmapConfigStep,
	startIndividualWorkspaceMockTestPersonalInfoStep,
	confirmIndividualWorkspaceProfile,
} from "@/api/WorkspaceAPI";
import { useWebSocket } from "@/hooks/useWebSocket";
import { createRoadmapForWorkspace, getRoadmapGraph } from "@/api/RoadmapAPI";
import { generateRoadmapKnowledgeQuiz, generateRoadmapPhaseContent, generateRoadmapPhases, generateRoadmapPreLearning } from "@/api/AIAPI";
import { getMaterialsByWorkspace, deleteMaterial, uploadMaterial } from "@/api/MaterialAPI";
import { getQuizzesByScope } from "@/api/QuizAPI";
import { getFlashcardsByScope } from "@/api/FlashcardAPI";
import { useToast } from "@/context/ToastContext";

const VIEW_TO_PATH = {
	roadmap: "roadmap",
	quiz: "quiz",
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

	const directView = PATH_TO_VIEW[subPath];
	if (directView) {
		return { view: directView, quizId: null, backTarget: null };
	}

	const roadmapQuizEditMatch = subPath.match(/^roadmap\/quiz\/(\d+)\/edit$/);
	if (roadmapQuizEditMatch) {
		return {
			view: "editQuiz",
			quizId: Number(roadmapQuizEditMatch[1]),
			backTarget: { view: "roadmap" },
		};
	}

	const roadmapQuizDetailMatch = subPath.match(/^roadmap\/quiz\/(\d+)$/);
	if (roadmapQuizDetailMatch) {
		return {
			view: "quizDetail",
			quizId: Number(roadmapQuizDetailMatch[1]),
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
			return `roadmap/quiz/${selectedQuiz.quizId}`;
		}
		return `quiz/${selectedQuiz.quizId}`;
	}

	if (view === "editQuiz" && selectedQuiz?.quizId) {
		if (quizBackTarget?.view === "roadmap") {
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
	return response?.data?.data || response?.data || response || null;
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

function WorkspacePage() {
	const { workspaceId } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const { showError, showSuccess } = useToast();
	const { isDarkMode, toggleDarkMode } = useDarkMode();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const settingsRef = useRef(null);

	const openProfileConfig = location.state?.openProfileConfig || false;
	const [profileConfigOpen, setProfileConfigOpen] = useState(false);
	const [profileOverviewOpen, setProfileOverviewOpen] = useState(false);
	const [isProfileConfigured, setIsProfileConfigured] = useState(false);
	const [workspaceProfile, setWorkspaceProfile] = useState(null);
	const [mockTestGenerationState, setMockTestGenerationState] = useState("idle");
	const [mockTestGenerationMessage, setMockTestGenerationMessage] = useState("");
	const [mockTestGenerationProgress, setMockTestGenerationProgress] = useState(0);
	const [mockTestGenerationStartedAt, setMockTestGenerationStartedAt] = useState(null);
	const [mockTestGenerationElapsedSeconds, setMockTestGenerationElapsedSeconds] = useState(0);

	const { currentWorkspace, fetchWorkspaceDetail, editWorkspace } = useWorkspace();
	const progressTracking = useProgressTracking();
	const isMountedRef = useRef(true);
	const mockTestPollingActiveRef = useRef(false);
	const mockTestPollingRunRef = useRef(0);
	const mockTestProgressTimerRef = useRef(null);
	const mockTestElapsedTimerRef = useRef(null);
	const mockTestReadyAutoHideTimerRef = useRef(null);
	const mockTestAutoFinalizePayloadRef = useRef(null);
	const mockTestShouldCloseAfterStartRef = useRef(false);
	const mockTestGenerationStorageKey = workspaceId ? `workspace_${workspaceId}_mockTestGeneration` : null;

	// State quáº£n lÃ½ tÃ i liá»‡u (sources) â€” mock data, sáº½ káº¿t ná»‘i API sau
	const [sources, setSources] = useState([]);
	const [selectedSourceIds, setSelectedSourceIds] = useState([]); // Selected sources from SourcesPanel
	const [createdItems, setCreatedItems] = useState([]);
	const [accessHistory, setAccessHistory] = useState([]);

	// State quáº£n lÃ½ dialog upload â€” chá»‰ má»Ÿ khi workspace chÆ°a cÃ³ tÃ i liá»‡u sau láº§n fetch Ä‘áº§u tiÃªn
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
	const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);
	const workspaceLayoutRef = useRef(null);
	const [workspaceLayoutWidth, setWorkspaceLayoutWidth] = useState(0);

	// Tráº¡ng thÃ¡i hiá»ƒn thá»‹ ná»™i dung chÃ­nh â€” Æ°u tiÃªn route hiá»‡n táº¡i, khÃ´ng dÃ¹ng sessionStorage
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
	// State lÆ°u quiz Ä‘ang Ä‘Æ°á»£c xem chi tiáº¿t hoáº·c chá»‰nh sá»­a
	const [selectedQuiz, setSelectedQuiz] = useState(null);
	const [quizBackTarget, setQuizBackTarget] = useState(null);
	// State lÆ°u flashcard Ä‘ang Ä‘Æ°á»£c xem chi tiáº¿t
	const [selectedFlashcard, setSelectedFlashcard] = useState(null);
	// State lÆ°u mock test Ä‘ang Ä‘Æ°á»£c xem chi tiáº¿t hoáº·c chá»‰nh sá»­a
	const [selectedMockTest, setSelectedMockTest] = useState(null);
	const [selectedRoadmapPhaseId, setSelectedRoadmapPhaseId] = useState(null);
	const [roadmapReloadToken, setRoadmapReloadToken] = useState(0);
	const [phaseGenerateDialogOpen, setPhaseGenerateDialogOpen] = useState(false);
	const [phaseGenerateDialogDefaultIds, setPhaseGenerateDialogDefaultIds] = useState([]);
	const [roadmapAiRoadmapId, setRoadmapAiRoadmapId] = useState(null);
	const [roadmapHasPhases, setRoadmapHasPhases] = useState(false);
	const [hasExistingWorkspaceQuiz, setHasExistingWorkspaceQuiz] = useState(false);
	const [hasExistingWorkspaceFlashcard, setHasExistingWorkspaceFlashcard] = useState(false);
	const [isGeneratingRoadmapPhases, setIsGeneratingRoadmapPhases] = useState(false);
	const [isGeneratingRoadmapStructure, setIsGeneratingRoadmapStructure] = useState(false);
	const [isSubmittingRoadmapPhaseRequest, setIsSubmittingRoadmapPhaseRequest] = useState(false);
	const [generatingKnowledgePhaseIds, setGeneratingKnowledgePhaseIds] = useState([]);
	const [generatingKnowledgeQuizPhaseIds, setGeneratingKnowledgeQuizPhaseIds] = useState([]);
	const [generatingPreLearningPhaseIds, setGeneratingPreLearningPhaseIds] = useState([]);
	const roadmapPhaseGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_roadmapPhaseGenerating` : null;
	const phaseContentGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_phaseContentGeneratingPhaseIds` : null;
	const preLearningGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_preLearningGeneratingPhaseIds` : null;
	const phaseGenerationPollingRef = useRef({ runId: 0, active: false });
	const phaseContentPollingRef = useRef({});
	const preLearningPollingRef = useRef({});
	const nonStudyPreLearningAutoRunRef = useRef({ runId: 0, active: false });
	const knowledgeQuizPollingRef = useRef({});
	const knowledgeQuizGenerationRequestedRef = useRef({});
	const knowledgeQuizGenerationRequestedByKnowledgeRef = useRef({});
	const bumpRoadmapReloadToken = useCallback(() => {
		setRoadmapReloadToken((current) => current + 1);
	}, []);

	// Háº±ng sá»‘ kÃ­ch thÆ°á»›c panel
	const COLLAPSED_WIDTH = 56;
	const DEFAULT_SIDE_PANEL_WIDTH = 280;
	const COLLAPSED_HANDLE_WIDTH = 8;
	const EXPANDED_HANDLE_WIDTH = 16;
	const CHAT_MIN_WIDTH = 760;

	const effectiveLeftWidth = isSourcesCollapsed ? COLLAPSED_WIDTH : DEFAULT_SIDE_PANEL_WIDTH;
	const effectiveRightWidth = isStudioCollapsed ? COLLAPSED_WIDTH : DEFAULT_SIDE_PANEL_WIDTH;

	const getRequiredLayoutWidth = useCallback((sourcesCollapsed, studioCollapsed) => {
		const leftPanelWidth = sourcesCollapsed ? COLLAPSED_WIDTH : DEFAULT_SIDE_PANEL_WIDTH;
		const rightPanelWidth = studioCollapsed ? COLLAPSED_WIDTH : DEFAULT_SIDE_PANEL_WIDTH;
		const leftHandleWidth = sourcesCollapsed ? COLLAPSED_HANDLE_WIDTH : EXPANDED_HANDLE_WIDTH;
		const rightHandleWidth = studioCollapsed ? COLLAPSED_HANDLE_WIDTH : EXPANDED_HANDLE_WIDTH;
		return CHAT_MIN_WIDTH + leftPanelWidth + rightPanelWidth + leftHandleWidth + rightHandleWidth;
	}, [CHAT_MIN_WIDTH]);

	const minWidthForChatWithOneSidePanel = getRequiredLayoutWidth(false, true);
	const shouldStackSidePanels = workspaceLayoutWidth > 0 && workspaceLayoutWidth < minWidthForChatWithOneSidePanel;
	const isRoadmapJourActive = activeView === "roadmap"
		|| (quizBackTarget?.view === "roadmap" && (activeView === "quizDetail" || activeView === "editQuiz"));
	const isOnWorkspaceQuizRoute = useMemo(() => {
		if (!workspaceId || !location.pathname) return false;
		return new RegExp(`^/workspace/${workspaceId}/quiz(?:/|$)`).test(location.pathname);
	}, [location.pathname, workspaceId]);
	const focusRoadmapViewSafely = useCallback(() => {
		if (isOnWorkspaceQuizRoute) return;
		setActiveView("roadmap");
	}, [isOnWorkspaceQuizRoute]);

	useEffect(() => {
		if (!workspaceId) {
			setHasExistingWorkspaceQuiz(false);
			setHasExistingWorkspaceFlashcard(false);
			return;
		}

		let cancelled = false;

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

		syncExistingWorkspaceContent();

		return () => {
			cancelled = true;
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
	const shouldDisableRoadmap = !hasAtLeastOneActiveSource && !roadmapHasPhases;
	const isStudyNewRoadmap = getProfilePurpose(workspaceProfile) === "STUDY_NEW";

	const resolveCollapsedStateByWidth = useCallback((layoutWidth, sourcesCollapsed, studioCollapsed) => {
		let nextSourcesCollapsed = sourcesCollapsed;
		let nextStudioCollapsed = studioCollapsed;

		if (layoutWidth < getRequiredLayoutWidth(nextSourcesCollapsed, nextStudioCollapsed) && !nextSourcesCollapsed) {
			nextSourcesCollapsed = true;
		}

		if (layoutWidth < getRequiredLayoutWidth(nextSourcesCollapsed, nextStudioCollapsed) && !nextStudioCollapsed) {
			nextStudioCollapsed = true;
		}

		return { nextSourcesCollapsed, nextStudioCollapsed };
	}, [getRequiredLayoutWidth]);

	const handleToggleSourcesCollapse = useCallback(() => {
		const nextSourcesCollapsed = !isSourcesCollapsed;

		if (nextSourcesCollapsed) {
			setIsSourcesCollapsed(true);
			return;
		}

		let nextStudioCollapsed = isStudioCollapsed;
		if (workspaceLayoutWidth > 0 && workspaceLayoutWidth < getRequiredLayoutWidth(false, nextStudioCollapsed)) {
			nextStudioCollapsed = true;
		}

		setIsStudioCollapsed(nextStudioCollapsed);
		setIsSourcesCollapsed(false);
	}, [getRequiredLayoutWidth, isSourcesCollapsed, isStudioCollapsed, workspaceLayoutWidth]);

	const handleToggleStudioCollapse = useCallback(() => {
		const nextStudioCollapsed = !isStudioCollapsed;

		if (nextStudioCollapsed) {
			setIsStudioCollapsed(true);
			return;
		}

		let nextSourcesCollapsed = isSourcesCollapsed;
		if (workspaceLayoutWidth > 0 && workspaceLayoutWidth < getRequiredLayoutWidth(nextSourcesCollapsed, false)) {
			nextSourcesCollapsed = true;
		}

		setIsSourcesCollapsed(nextSourcesCollapsed);
		setIsStudioCollapsed(false);
	}, [getRequiredLayoutWidth, isSourcesCollapsed, isStudioCollapsed, workspaceLayoutWidth]);

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

	useEffect(() => {
		if (!workspaceLayoutWidth || shouldStackSidePanels) return;

		const { nextSourcesCollapsed, nextStudioCollapsed } = resolveCollapsedStateByWidth(
			workspaceLayoutWidth,
			isSourcesCollapsed,
			isStudioCollapsed
		);

		if (nextSourcesCollapsed !== isSourcesCollapsed) {
			setIsSourcesCollapsed(nextSourcesCollapsed);
		}

		if (nextStudioCollapsed !== isStudioCollapsed) {
			setIsStudioCollapsed(nextStudioCollapsed);
		}
	}, [isSourcesCollapsed, isStudioCollapsed, resolveCollapsedStateByWidth, shouldStackSidePanels, workspaceLayoutWidth]);

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

		const { view: mappedView, quizId, backTarget } = resolveViewFromSubPath(subPath);
		if (!mappedView) return;

		if (backTarget?.view === "roadmap") {
			const phaseParam = new URLSearchParams(location.search).get("phaseId");
			const parsedPhaseId = Number(phaseParam);
			setQuizBackTarget({
				view: "roadmap",
				phaseId: Number.isInteger(parsedPhaseId) && parsedPhaseId > 0 ? parsedPhaseId : null,
			});
		} else if (mappedView === "quizDetail" || mappedView === "editQuiz") {
			setQuizBackTarget(null);
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

		const mappedPath = buildPathForView(activeView, selectedQuiz, quizBackTarget);
		if (!mappedPath) return;

		const currentSubPath = getWorkspaceSubPath();
		const isQuizDeepLink = /^quiz\/\d+(?:\/edit)?$/.test(currentSubPath)
			|| /^roadmap\/quiz\/\d+(?:\/edit)?$/.test(currentSubPath);

		if (isQuizDeepLink) {
			const { view: routeView, quizId: routeQuizId } = resolveViewFromSubPath(currentSubPath);
			const currentSelectedQuizId = Number(selectedQuiz?.quizId);

			// Chặn redirect theo activeView cũ (lấy từ sessionStorage) trước khi route deep-link hydrate xong.
			if (routeView && routeView !== activeView) return;
			if (Number.isInteger(routeQuizId) && routeQuizId > 0 && currentSelectedQuizId !== routeQuizId) return;
		}

		if (currentSubPath === mappedPath) return;

		navigate(`/workspace/${workspaceId}/${mappedPath}`, { replace: true });
	}, [activeView, getWorkspaceSubPath, navigate, quizBackTarget, selectedQuiz, workspaceId]);

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
		phaseGenerationPollingRef.current.runId += 1;
		phaseGenerationPollingRef.current.active = false;
		phaseContentPollingRef.current = {};
		preLearningPollingRef.current = {};
		knowledgeQuizPollingRef.current = {};
		knowledgeQuizGenerationRequestedRef.current = {};
		knowledgeQuizGenerationRequestedByKnowledgeRef.current = {};
		setIsGeneratingRoadmapPhases(false);
		setGeneratingKnowledgePhaseIds([]);
		setGeneratingKnowledgeQuizPhaseIds([]);
		setGeneratingPreLearningPhaseIds([]);
		setPhaseGenerateDialogOpen(false);
	}, [workspaceId]);

	// Khôi phục trạng thái generating sau khi reload trang.
	useEffect(() => {
		if (!workspaceId || typeof window === "undefined") return;

		try {
			const storedRoadmapGenerating = window.sessionStorage.getItem(roadmapPhaseGeneratingStorageKey);
			const storedPhaseContentGenerating = window.sessionStorage.getItem(phaseContentGeneratingStorageKey);
			const storedPreLearningGenerating = window.sessionStorage.getItem(preLearningGeneratingStorageKey);

			if (storedRoadmapGenerating !== null) {
				setIsGeneratingRoadmapPhases(storedRoadmapGenerating === "true");
			}

			if (storedPreLearningGenerating) {
				const parsedPhaseIds = JSON.parse(storedPreLearningGenerating);
				setGeneratingPreLearningPhaseIds(normalizePositiveIds(parsedPhaseIds));
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
	}, [
		phaseContentGeneratingStorageKey,
		generatingKnowledgePhaseIds,
		generatingPreLearningPhaseIds,
		isGeneratingRoadmapPhases,
		preLearningGeneratingStorageKey,
		roadmapPhaseGeneratingStorageKey,
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
		const syncRoadmapPhaseGeneratingStatus = async () => {
			try {
				const response = await getRoadmapGraph({ workspaceId });
				if (cancelled) return;

				const roadmapData = response?.data?.data ?? null;
				const roadmapStatus = String(roadmapData?.status || "").toUpperCase();
				const isProcessing = roadmapStatus === "PROCESSING";
				const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];
				const processingPhases = phases.filter((phase) => String(phase?.status || "").toUpperCase() === "PROCESSING");
				const inferredPhaseContentGeneratingIds = normalizePositiveIds(
					processingPhases
						.filter((phase) => {
							const hasPreLearning = (phase?.preLearningQuizzes || []).length > 0;
							const hasKnowledge = (phase?.knowledges || []).length > 0;
							return hasPreLearning && !hasKnowledge;
						})
						.map((phase) => phase?.phaseId)
				);
				const inferredPreLearningGeneratingIds = normalizePositiveIds(
					processingPhases
						.filter((phase) => {
							const hasPreLearning = (phase?.preLearningQuizzes || []).length > 0;
							const hasKnowledge = (phase?.knowledges || []).length > 0;
							return !hasPreLearning && !hasKnowledge;
						})
						.map((phase) => phase?.phaseId)
				);
				
				setIsGeneratingRoadmapPhases(isProcessing);
				setRoadmapHasPhases(phases.length > 0);

				if (inferredPhaseContentGeneratingIds.length > 0) {
					setGeneratingKnowledgePhaseIds((current) => {
						const merged = new Set([...normalizePositiveIds(current), ...inferredPhaseContentGeneratingIds]);
						return Array.from(merged);
					});
				}

				if (inferredPreLearningGeneratingIds.length > 0) {
					setGeneratingPreLearningPhaseIds((current) => {
						const merged = new Set([...normalizePositiveIds(current), ...inferredPreLearningGeneratingIds]);
						return Array.from(merged);
					});
				}

				if (!isProcessing) {
					stopPhaseGenerationPolling();
				}
			} catch (error) {
				console.error("Failed to sync roadmap phase generating status:", error);
			}
		};

		syncRoadmapPhaseGeneratingStatus();
		return () => {
			cancelled = true;
		};
	}, [workspaceId, roadmapReloadToken, stopPhaseGenerationPolling]);

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

			setSources(mappedSources);
			return mappedSources;
		} catch (err) {
			console.error("âŒ [fetchSources] Failed to fetch materials:", err);
			return [];
		}
	}, [workspaceId]);

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

	const startPhaseGenerationPolling = useCallback(async (roadmapId) => {
		if (!workspaceId || !roadmapId) return;
		const runId = phaseGenerationPollingRef.current.runId + 1;
		phaseGenerationPollingRef.current.runId = runId;
		phaseGenerationPollingRef.current.active = true;

		try {
			for (let attempt = 0; attempt < 80; attempt += 1) {
				if (!isMountedRef.current || phaseGenerationPollingRef.current.runId !== runId) return;
				const response = await getRoadmapGraph({ workspaceId });
				const roadmapData = response?.data?.data ?? null;
				const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];
				if (phases.length > 0) {
					const completedRoadmapId = Number(roadmapData?.roadmapId) || roadmapId;
					setIsGeneratingRoadmapPhases(false);
					setRoadmapAiRoadmapId(completedRoadmapId);
					bumpRoadmapReloadToken();
					if (!isStudyNewRoadmap) {
						void triggerNonStudyPreLearningAfterPhases(completedRoadmapId);
					}
					return;
				}
				await delay(1500);
			}
		} catch (error) {
			console.error("Failed polling roadmap phase generation:", error);
		} finally {
			if (phaseGenerationPollingRef.current.runId === runId) {
				phaseGenerationPollingRef.current.active = false;
				setIsGeneratingRoadmapPhases(false);
			}
		}
	}, [
		bumpRoadmapReloadToken,
		isStudyNewRoadmap,
		triggerNonStudyPreLearningAfterPhases,
		workspaceId,
	]);

	const startPhaseContentPolling = useCallback(async (phaseId) => {
		if (!workspaceId || !phaseId) return;
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;

		const runId = (phaseContentPollingRef.current[normalizedPhaseId] || 0) + 1;
		phaseContentPollingRef.current[normalizedPhaseId] = runId;

		try {
			for (let attempt = 0; attempt < 80; attempt += 1) {
				if (!isMountedRef.current || phaseContentPollingRef.current[normalizedPhaseId] !== runId) return;
				const response = await getRoadmapGraph({ workspaceId });
				const roadmapData = response?.data?.data ?? null;
				const phase = (roadmapData?.phases || []).find((item) => Number(item?.phaseId) === normalizedPhaseId);
				const knowledges = phase?.knowledges || [];
				const hasKnowledge = knowledges.length > 0;
				const allKnowledgeQuizzesReady = hasKnowledge
					&& knowledges.every((knowledge) => (knowledge?.quizzes || []).length > 0);

				if (hasKnowledge && !allKnowledgeQuizzesReady) {
					void triggerKnowledgeQuizGenerationForPhase(normalizedPhaseId);
				}

				// Chỉ exit khi tất cả knowledge quizzes sẵn sàng
				if (hasKnowledge && allKnowledgeQuizzesReady) {
					setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
					setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
					bumpRoadmapReloadToken();
					return;
				}

				await delay(1500);
			}
		} catch (error) {
			console.error("Failed polling phase content generation:", error);
		} finally {
			if (phaseContentPollingRef.current[normalizedPhaseId] === runId) {
				setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			}
		}
	}, [
		bumpRoadmapReloadToken,
		triggerKnowledgeQuizGenerationForPhase,
		workspaceId,
	]);

	useEffect(() => {
		if (!workspaceId || generatingKnowledgePhaseIds.length === 0) return;

		const phaseIds = normalizePositiveIds(generatingKnowledgePhaseIds);
		phaseIds.forEach((phaseId) => {
			startPhaseContentPolling(phaseId);
		});
	}, [generatingKnowledgePhaseIds, startPhaseContentPolling, workspaceId]);

	const startKnowledgeQuizPolling = useCallback(async (phaseId) => {
		if (!workspaceId || !phaseId) return;
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;

		const runId = (knowledgeQuizPollingRef.current[normalizedPhaseId] || 0) + 1;
		knowledgeQuizPollingRef.current[normalizedPhaseId] = runId;

		try {
			for (let attempt = 0; attempt < 80; attempt += 1) {
				if (!isMountedRef.current || knowledgeQuizPollingRef.current[normalizedPhaseId] !== runId) return;
				const response = await getRoadmapGraph({ workspaceId });
				const roadmapData = response?.data?.data ?? null;
				const phase = (roadmapData?.phases || []).find((item) => Number(item?.phaseId) === normalizedPhaseId);
				if (!phase) {
					await delay(1500);
					continue;
				}

				const knowledges = phase?.knowledges || [];
				if (knowledges.length === 0) {
					await delay(1500);
					continue;
				}

				const allKnowledgeQuizzesReady = knowledges.every((knowledge) => (knowledge?.quizzes || []).length > 0);
				if (allKnowledgeQuizzesReady) {
					knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] = false;
					Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
						if (key.startsWith(`${normalizedPhaseId}:`)) {
							knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
						}
					});
					setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
					bumpRoadmapReloadToken();
					return;
				}

				await delay(1500);
			}
		} catch (error) {
			console.error("Failed polling phase knowledge-quiz generation:", error);
		} finally {
			if (knowledgeQuizPollingRef.current[normalizedPhaseId] === runId) {
				knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] = false;
				Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
					if (key.startsWith(`${normalizedPhaseId}:`)) {
						knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
					}
				});
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			}
		}
	}, [bumpRoadmapReloadToken, workspaceId]);

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
			const phaseIdsToGenerate = normalizePositiveIds(
				phases
					.filter((phase) => {
						const hasPreLearning = (phase?.preLearningQuizzes || []).length > 0;
						const hasKnowledge = (phase?.knowledges || []).length > 0;
						return !hasPreLearning && !hasKnowledge;
					})
					.map((phase) => phase?.phaseId)
			);

			if (phaseIdsToGenerate.length === 0) return;

			setRoadmapAiRoadmapId(roadmapId);
			focusRoadmapViewSafely();

			for (const phaseId of phaseIdsToGenerate) {
				if (!isMountedRef.current || nonStudyPreLearningAutoRunRef.current.runId !== runId) return;

				setGeneratingPreLearningPhaseIds((current) => {
					if (current.includes(phaseId)) return current;
					return [...current, phaseId];
				});

				try {
					await generateRoadmapPreLearning({
						roadmapId,
						phaseId,
					});
					void startPreLearningPolling(phaseId);
				} catch (error) {
					setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
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

	async function triggerKnowledgeQuizGenerationForPhase(phaseId) {
		if (!workspaceId || !phaseId) return;
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		if (knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] === true) return;

		// Bắt đầu set flag generating - để UI hiển thị placeholder loading ngay lập tức
		setGeneratingKnowledgeQuizPhaseIds((current) => {
			if (current.includes(normalizedPhaseId)) return current;
			return [...current, normalizedPhaseId];
		});

		try {
			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError("Không tìm thấy roadmapId trong Workspace Profile.");
				setProfileOverviewOpen(false);
				setProfileConfigOpen(true);
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
				return;
			}

			const graphResponse = await getRoadmapGraph({ workspaceId });
			const roadmapData = graphResponse?.data?.data ?? null;
			const phase = (roadmapData?.phases || []).find((item) => Number(item?.phaseId) === normalizedPhaseId);
			if (!phase) {
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
				return;
			}

			const knowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
			if (knowledges.length === 0) {
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
				return;
			}

			const pendingKnowledgeIds = Array.from(new Set(knowledges
				.filter((knowledge) => Number(knowledge?.knowledgeId) > 0 && (knowledge?.quizzes || []).length === 0)
				.map((knowledge) => Number(knowledge.knowledgeId))));

			const validatedKnowledgeIds = pendingKnowledgeIds.filter((knowledgeId) => {
				const requestKey = `${normalizedPhaseId}:${knowledgeId}`;
				return knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] !== true;
			});

			if (validatedKnowledgeIds.length === 0) {
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
				return;
			}

			validatedKnowledgeIds.forEach((knowledgeId) => {
				const requestKey = `${normalizedPhaseId}:${knowledgeId}`;
				knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] = true;
			});
			knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] = true;
			await Promise.all(
				validatedKnowledgeIds.map((knowledgeId) =>
					generateRoadmapKnowledgeQuiz({ roadmapId, knowledgeId })
				)
			);

			startKnowledgeQuizPolling(normalizedPhaseId);
		} catch (error) {
			knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] = false;
			Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
				if (key.startsWith(`${normalizedPhaseId}:`)) {
					knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
				}
			});
			setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			showError(error?.message || "Tạo knowledge-quiz cho phase thất bại.");
		}
	}

	const startPreLearningPolling = useCallback(async (phaseId) => {
		if (!workspaceId || !phaseId) return;
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;

		const runId = (preLearningPollingRef.current[normalizedPhaseId] || 0) + 1;
		preLearningPollingRef.current[normalizedPhaseId] = runId;

		try {
			for (let attempt = 0; attempt < 80; attempt += 1) {
				if (!isMountedRef.current || preLearningPollingRef.current[normalizedPhaseId] !== runId) return;
				const response = await getRoadmapGraph({ workspaceId });
				const roadmapData = response?.data?.data ?? null;
				const phase = (roadmapData?.phases || []).find((item) => Number(item?.phaseId) === normalizedPhaseId);
				if (!phase) {
					await delay(1500);
					continue;
				}

				const hasPreLearning = (phase?.preLearningQuizzes || []).length > 0;
				if (hasPreLearning) {
					setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
					bumpRoadmapReloadToken();
					return;
				}

				await delay(1500);
			}
		} catch (error) {
			console.error("Failed polling phase pre-learning generation:", error);
		} finally {
			// Giữ trạng thái loading cho đến khi có event ERROR hoặc polling xác nhận đã có pre-learning.
			// Tránh trường hợp backend bắn COMPLETED sớm hơn lúc graph phản ánh dữ liệu quiz mới.
		}
	}, [
		bumpRoadmapReloadToken,
		workspaceId,
	]);

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

			await generateRoadmapPhases({
				roadmapId,
				materialIds: selectedMaterialIds,
			});

			setRoadmapAiRoadmapId(roadmapId);
			setPhaseGenerateDialogOpen(false);
			setIsGeneratingRoadmapPhases(true);
			setSelectedRoadmapPhaseId(null);
			setActiveView("roadmap");
			bumpRoadmapReloadToken();
			startPhaseGenerationPolling(roadmapId);
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
		startPhaseGenerationPolling,
	]);

	const handleCreatePhaseKnowledge = useCallback(async (phaseId, options = {}) => {
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		const skipPreLearning = Boolean(options?.skipPreLearning);

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
			startPhaseContentPolling(normalizedPhaseId);
		} catch (error) {
			setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			showError(error?.message || "Tạo knowledge cho phase thất bại.");
		}
	}, [
		roadmapAiRoadmapId,
		resolveLatestRoadmapId,
		showError,
		bumpRoadmapReloadToken,
		startPhaseContentPolling,
	]);

	const handleCreatePhasePreLearning = useCallback(async (phaseId, options = {}) => {
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		const skipPreLearning = Boolean(options?.skipPreLearning);

		try {
			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError("Không tìm thấy roadmapId trong Workspace Profile.");
				setProfileOverviewOpen(false);
				setProfileConfigOpen(true);
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

			setActiveView("roadmap");
			bumpRoadmapReloadToken();
			startPreLearningPolling(normalizedPhaseId);
		} catch (error) {
			setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			showError(error?.message || "Tạo pre-learning cho phase thất bại.");
		}
	}, [
		roadmapAiRoadmapId,
		resolveLatestRoadmapId,
		showError,
		bumpRoadmapReloadToken,
		startPreLearningPolling,
	]);

	// WebSocket nhận realtime update cho tài liệu và roadmap AI progress
	const { isConnected: wsConnected } = useWebSocket({
		workspaceId: workspaceId,
		enabled: !!workspaceId,
		onMaterialUploaded: (data) => {
			console.log("ðŸ“¤ [WorkspacePage] Material uploaded via WebSocket:", data);
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
			const progressPhaseId = Number(progressData?.phaseId ?? progress?.phaseId);
			const progressRoadmapId = Number(progressData?.roadmapId ?? progress?.roadmapId);
			const progressPercent = Number(progress?.percent ?? progress?.progressPercent ?? 0);
			const websocketTaskId = progress?.websocketTaskId ?? progress?.taskId;
			const materialId = Number(progress?.materialId ?? 0);

			// Cập nhật progress tracking cho task và material
			if (websocketTaskId) {
				progressTracking.updateTaskProgress(websocketTaskId, progressPercent);
			}
			if (materialId > 0) {
				progressTracking.updateMaterialProgress(materialId, progressPercent);
			}
			if (progressPhaseId > 0 && progressPercent > 0) {
				// Tự động nhận diện loại progress dựa trên status
				if (status.includes("PRE_LEARNING")) {
					progressTracking.updatePreLearningProgress(progressPhaseId, progressPercent);
				} else if (status.includes("KNOWLEDGE")) {
					progressTracking.updateKnowledgeProgress(progressPhaseId, progressPercent);
				} else if (status.includes("POST_LEARNING")) {
					progressTracking.updatePostLearningProgress(progressPhaseId, progressPercent);
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
				focusRoadmapViewSafely();
				return;
			}

			if (status === "ROADMAP_PHASES_COMPLETED") {
				stopPhaseGenerationPolling();
				setIsGeneratingRoadmapPhases(false);
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
					setGeneratingKnowledgeQuizPhaseIds((current) => {
						if (current.includes(phaseId)) return current;
						return [...current, phaseId];
					});
					void triggerKnowledgeQuizGenerationForPhase(phaseId);
				} else {
					// WS roadmap payload có thể không có phaseId, fallback sang polling các phase đang generate.
					const fallbackPhaseIds = normalizePositiveIds(generatingKnowledgePhaseIds);
					fallbackPhaseIds.forEach((id) => {
						startPhaseContentPolling(id);
					});
				}
				focusRoadmapViewSafely();
				bumpRoadmapReloadToken();
				return;
			}

			if (status === "ROADMAP_KNOWLEDGE_QUIZ_COMPLETED") {
				const phaseId = progressPhaseId;
				if (Number.isInteger(phaseId) && phaseId > 0) {
					knowledgeQuizGenerationRequestedRef.current[phaseId] = false;
					Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
						if (key.startsWith(`${phaseId}:`)) {
							knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
						}
					});
					setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== phaseId));
				} else {
					const fallbackPhaseIds = normalizePositiveIds(generatingKnowledgeQuizPhaseIds);
					fallbackPhaseIds.forEach((id) => {
						startKnowledgeQuizPolling(id);
					});
				}
				focusRoadmapViewSafely();
				bumpRoadmapReloadToken();
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
				if (Number.isInteger(phaseId) && phaseId > 0) {
					setGeneratingPreLearningPhaseIds((current) => {
						if (current.includes(phaseId)) return current;
						return [...current, phaseId];
					});
					startPreLearningPolling(phaseId);
				} else {
					const fallbackPhaseIds = normalizePositiveIds(generatingPreLearningPhaseIds);
					fallbackPhaseIds.forEach((id) => {
						startPreLearningPolling(id);
					});
				}
				focusRoadmapViewSafely();
				bumpRoadmapReloadToken();
				return;
			}

			if (status === "ERROR") {
				const phaseId = progressPhaseId;
				const roadmapId = progressRoadmapId;

				if (Number.isInteger(phaseId) && phaseId > 0) {
					knowledgeQuizGenerationRequestedRef.current[phaseId] = false;
					Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
						if (key.startsWith(`${phaseId}:`)) {
							knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
						}
					});
					setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== phaseId));
					setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== phaseId));
					setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
					stopPhaseContentPolling(phaseId);
					stopPreLearningPolling(phaseId);
					stopKnowledgeQuizPolling(phaseId);
				}

				if (!Number.isInteger(phaseId) || phaseId <= 0) {
					knowledgeQuizGenerationRequestedRef.current = {};
					knowledgeQuizGenerationRequestedByKnowledgeRef.current = {};
					knowledgeQuizPollingRef.current = {};
					setGeneratingKnowledgePhaseIds([]);
					setGeneratingKnowledgeQuizPhaseIds([]);
					setGeneratingPreLearningPhaseIds([]);
					preLearningPollingRef.current = {};
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

				// Kiá»ƒm tra xem profile Ä‘Ã£ Ä‘Æ°á»£c config hay chÆ°a:
				// Hiá»‡n táº¡i: chá»‰ cáº§n cÃ³ learningGoal (báº¯t buá»™c) lÃ  coi nhÆ° Ä‘Ã£ cáº¥u hÃ¬nh
				const profileData = profileRes?.data?.data || profileRes?.data || null;
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
						setProfileOverviewOpen(true);
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

	// Xá»­ lÃ½ Ä‘Ã³ng/má»Ÿ profile config dialog
	const handleProfileConfigChange = useCallback((open) => {
		setProfileConfigOpen(open);
		if (open) {
			// Refetch profile khi má»Ÿ Ä‘á»ƒ luÃ´n cÃ³ dá»¯ liá»‡u má»›i nháº¥t (bao gá»“m targetLevelId)
			getIndividualWorkspaceProfile(workspaceId)
				.then((res) => {
					const profileData = res?.data?.data || res?.data || res;
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
		} else if (location.state?.openProfileConfig) {
			navigate(`/workspace/${workspaceId}`, { replace: true });
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
			getIndividualWorkspaceProfile(workspaceId)
				.then((res) => {
					const profileData = res?.data?.data || res?.data || res;
					if (profileData) setWorkspaceProfile(profileData);
				})
				.catch(() => {});
		} else if (location.state?.openProfileConfig) {
			navigate(`/workspace/${workspaceId}`, { replace: true });
		}
	}, [location.state, navigate, workspaceId]);

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

	// ÄÃ³ng settings khi click ra ngoÃ i
	useEffect(() => {
		if (!isSettingsOpen) return;
		const handleClickOutside = (event) => {
			if (settingsRef.current && !settingsRef.current.contains(event.target)) {
				setIsSettingsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isSettingsOpen]);

	// Xá»­ lÃ½ upload file tÃ i liá»‡u - SONG SONG Ä‘á»ƒ tÄƒng tá»‘c
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

	// XÃ³a tÃ i liá»‡u Ä‘Æ¡n láº»
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

	// Xá»­ lÃ½ action tá»« Studio Panel â€” hiá»ƒn thá»‹ form inline trong ChatPanel
	const handleStudioAction = useCallback((actionKey) => {
		// Ghi lá»‹ch sá»­ truy cáº­p khi ngÆ°á»i dÃ¹ng má»Ÿ list view
		const viewTypeMap = { roadmap: "Roadmap", quiz: "Quiz", flashcard: "Flashcard", mockTest: "MockTest" };
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
	}, []);

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

	// HÃ m thÃªm vÃ o lá»‹ch sá»­ truy cáº­p â€” ghi nháº­n má»—i láº§n truy cáº­p list view
	const addAccessHistory = useCallback((name, type, actionKey) => {
		setAccessHistory((prev) => {
			// XÃ³a trÃ¹ng náº¿u Ä‘Ã£ cÃ³ item cÃ¹ng actionKey
			const filtered = prev.filter((item) => item.actionKey !== actionKey);
			return [{ name, type, actionKey, accessedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
		});
	}, []);

	// Xá»­ lÃ½ táº¡o quiz â€” callback khi CreateQuizForm hoÃ n táº¥t API multi-step
	const handleCreateQuiz = useCallback(async (data) => {
		// Quiz Ä‘Ã£ Ä‘Æ°á»£c táº¡o xong tá»« CreateQuizForm â†’ chuyá»ƒn vá» list view
		setActiveView("quiz");
	}, []);

	// Xá»­ lÃ½ xem chi tiáº¿t quiz â€” khi click vÃ o quiz trong danh sÃ¡ch
	const handleViewQuiz = useCallback((quiz, options = null) => {
		const backTarget = options?.backTarget || null;
		setSelectedQuiz(quiz);
		setQuizBackTarget(backTarget);
		if (backTarget?.view === "roadmap" && Number.isInteger(Number(backTarget?.phaseId)) && Number(backTarget.phaseId) > 0) {
			setSelectedRoadmapPhaseId(Number(backTarget.phaseId));
		}
		setActiveView("quizDetail");
	}, []);

	// Xá»­ lÃ½ chuyá»ƒn sang chá»‰nh sá»­a quiz â€” tá»« detail view
	const handleEditQuiz = useCallback((quiz) => {
		setSelectedQuiz(quiz);
		setActiveView("editQuiz");
	}, []);

	// Xá»­ lÃ½ lÆ°u quiz sau khi chá»‰nh sá»­a â€” quay vá» detail view
	const handleSaveQuiz = useCallback((updatedQuiz) => {
		setSelectedQuiz((prev) => ({ ...prev, ...updatedQuiz }));
		setActiveView("quizDetail");
	}, []);

	// Xá»­ lÃ½ táº¡o flashcard â€” callback tá»« CreateFlashcardForm (API Ä‘Ã£ gá»i xong)
	const handleCreateFlashcard = useCallback(async () => {
		// Chuyá»ƒn vá» list view Ä‘á»ƒ reload danh sÃ¡ch
		setActiveView("flashcard");
	}, []);

	// Xá»­ lÃ½ xem chi tiáº¿t flashcard â€” khi click vÃ o flashcard trong danh sÃ¡ch
	const handleViewFlashcard = useCallback((flashcard) => {
		setSelectedFlashcard(flashcard);
		setActiveView("flashcardDetail");
	}, []);

	// Xá»­ lÃ½ xÃ³a flashcard â€” gá»i API xÃ³a flashcard set
	const handleDeleteFlashcard = useCallback(async (flashcard) => {
		if (!window.confirm(t("workspace.confirmDeleteFlashcard"))) return;
		try {
			const { deleteFlashcardSet } = await import("@/api/FlashcardAPI");
			await deleteFlashcardSet(flashcard.flashcardSetId);
			// Quay vá» list view Ä‘á»ƒ reload danh sÃ¡ch
			setActiveView("flashcard");
		} catch (err) {
			console.error("XÃ³a flashcard tháº¥t báº¡i:", err);
		}
	}, []);

	// Xá»­ lÃ½ táº¡o roadmap â€” gá»i API táº¡o roadmap cho workspace cÃ¡ nhÃ¢n
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
			// Lá»—i táº¡o roadmap â€” log Ä‘á»ƒ debug
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
				if (workspaceId) {
					navigate(`/workspace/${workspaceId}/roadmap?phaseId=${phaseId}`, { replace: true });
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

	// Xá»­ lÃ½ táº¡o mock test â€” quay vá» list sau khi táº¡o thÃ nh cÃ´ng
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

	const settingsMenu = (
		<div ref={settingsRef} className="relative">
			<Button
				variant="outline"
				type="button"
				onClick={() => setIsSettingsOpen((prev) => !prev)}
				className={`rounded-full h-9 px-4 flex items-center gap-2 ${
					isDarkMode
						? "border-slate-700 text-slate-200 hover:bg-slate-900"
						: "border-gray-200"
				}`}
				aria-expanded={isSettingsOpen}
				aria-haspopup="menu"
			>
				<Settings className="w-4 h-4" />
				<span className={fontClass}>{t("common.settings")}</span>
			</Button>

			{isSettingsOpen ? (
				<div
					role="menu"
					className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
						isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-gray-200 text-gray-800"
					}`}
				>
					<button
						type="button"
						onClick={() => {
							setIsSettingsOpen(false);
							if (isProfileConfigured) {
								setProfileOverviewOpen(true);
								setProfileConfigOpen(false);
								return;
							}

							setProfileConfigOpen(true);
							setProfileOverviewOpen(false);
						}}
						className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
							isDarkMode ? "hover:bg-slate-900 border-b border-slate-800" : "hover:bg-gray-50 border-b border-gray-100"
						}`}
					>
						<span className={`flex items-center gap-2 ${fontClass}`}>
							<UserCircle className="w-4 h-4" />
							{t("workspace.settingsMenu.workspaceProfile")}
						</span>
					</button>
					<button
						type="button"
						onClick={toggleLanguage}
						className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
							isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
						}`}
					>
						<span className={`flex items-center gap-2 ${fontClass}`}>
							<Globe className="w-4 h-4" />
							{t("common.language")}
						</span>
						<span className={`text-xs font-semibold ${fontClass}`}>
							{currentLang === "vi" ? "VI" : "EN"}
						</span>
					</button>
					<button
						type="button"
						onClick={toggleDarkMode}
						className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
							isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
						}`}
					>
						<span className={`flex items-center gap-2 ${fontClass}`}>
							{isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
							{t("common.theme")}
						</span>
						<span className={`text-xs font-semibold ${fontClass}`}>
							{isDarkMode ? t("common.dark") : t("common.light")}
						</span>
					</button>
				</div>
			) : null}
		</div>
	);

	// Xá»­ lÃ½ nÃºt click Ä‘á»ƒ má»Ÿ Upload Dialog â€” Pháº£i check config trÆ°á»›c
	const handleUploadClickSafe = useCallback(() => {
		if (!isProfileConfigured) {
			// Profile chÆ°a cáº¥u hÃ¬nh Ä‘á»§, yÃªu cáº§u cáº­p nháº­t Profile trÆ°á»›c
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
											onCreatePhaseKnowledge={handleCreatePhaseKnowledge}
											onCreatePhasePreLearning={handleCreatePhasePreLearning}
											isStudyNewRoadmap={isStudyNewRoadmap}
											isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
											generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
											generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
											generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
											roadmapReloadToken={roadmapReloadToken}
									onCreateMockTest={handleCreateMockTest}
									onBack={handleBackFromForm}
									workspaceId={workspaceId}
									selectedQuiz={selectedQuiz}
									onViewQuiz={handleViewQuiz}
									onEditQuiz={handleEditQuiz}
									onSaveQuiz={handleSaveQuiz}
									selectedFlashcard={selectedFlashcard}
									onViewFlashcard={handleViewFlashcard}
									onDeleteFlashcard={handleDeleteFlashcard}
									selectedMockTest={selectedMockTest}
									onViewMockTest={handleViewMockTest}
									onEditMockTest={handleEditMockTest}
									onSaveMockTest={handleSaveMockTest}
									shouldDisableQuiz={shouldDisableQuiz}
									shouldDisableFlashcard={shouldDisableFlashcard}
									shouldDisableRoadmap={shouldDisableRoadmap}
									shouldDisableCreateQuiz={shouldDisableCreateQuiz}
									shouldDisableCreateFlashcard={shouldDisableCreateFlashcard}
									progressTracking={progressTracking}
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
												isCollapsed={false}
												onToggleCollapse={handleToggleSourcesCollapse}
												progressTracking={progressTracking}
											/>
										</div>
										<div className={`absolute inset-0 transition-all duration-300 ${isRoadmapJourActive ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
											<RoadmapJourPanel
												isDarkMode={isDarkMode}
												workspaceId={workspaceId}
												selectedPhaseId={selectedRoadmapPhaseId}
												onSelectPhase={handleSelectRoadmapPhase}
												reloadToken={roadmapReloadToken}
												isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
												isCollapsed={false}
												onToggleCollapse={handleToggleSourcesCollapse}
											/>
										</div>
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
										shouldDisableRoadmap={shouldDisableRoadmap}
									/>
								</div>
							</div>
						</div>
					) : (
						<div className="flex h-full">
							{/* Panel nguá»“n tÃ i liá»‡u (trÃ¡i) */}
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
											isCollapsed={isSourcesCollapsed}
											onToggleCollapse={handleToggleSourcesCollapse}
											progressTracking={progressTracking}
										/>
									</div>
									<div className={`absolute inset-0 transition-all duration-300 ${isRoadmapJourActive ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
										<RoadmapJourPanel
											isDarkMode={isDarkMode}
											workspaceId={workspaceId}
											selectedPhaseId={selectedRoadmapPhaseId}
											onSelectPhase={handleSelectRoadmapPhase}
											reloadToken={roadmapReloadToken}
											isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
											isCollapsed={isSourcesCollapsed}
											onToggleCollapse={handleToggleSourcesCollapse}
										/>
									</div>
								</div>
							</div>

							{/* Resize handle trÃ¡i */}
							<div
								className={`shrink-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isSourcesCollapsed ? "w-2" : "w-4"}`}
							>
								{!isSourcesCollapsed && (
									<div className={`w-0.5 h-8 rounded-full opacity-40 ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />
								)}
							</div>

							{/* Panel khu vá»±c há»c táº­p (giá»¯a) */}
							<div className="flex-1 min-w-0 h-full">
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
									onCreatePhaseKnowledge={handleCreatePhaseKnowledge}
									onCreatePhasePreLearning={handleCreatePhasePreLearning}
									isStudyNewRoadmap={isStudyNewRoadmap}
									isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
									generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
									generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
									generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
									roadmapReloadToken={roadmapReloadToken}
									onCreateMockTest={handleCreateMockTest}
									onBack={handleBackFromForm}
									workspaceId={workspaceId}
									selectedQuiz={selectedQuiz}
									onViewQuiz={handleViewQuiz}
									onEditQuiz={handleEditQuiz}
									onSaveQuiz={handleSaveQuiz}
									selectedFlashcard={selectedFlashcard}
									onViewFlashcard={handleViewFlashcard}
									onDeleteFlashcard={handleDeleteFlashcard}
									selectedMockTest={selectedMockTest}
									onViewMockTest={handleViewMockTest}
									onEditMockTest={handleEditMockTest}
									onSaveMockTest={handleSaveMockTest}
									shouldDisableQuiz={shouldDisableQuiz}
									shouldDisableFlashcard={shouldDisableFlashcard}
									shouldDisableRoadmap={shouldDisableRoadmap}
									shouldDisableCreateQuiz={shouldDisableCreateQuiz}
									shouldDisableCreateFlashcard={shouldDisableCreateFlashcard}
									progressTracking={progressTracking}
								/>
							</div>

							{/* Resize handle pháº£i */}
							<div
								className={`shrink-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isStudioCollapsed ? "w-2" : "w-4"}`}
							>
								{!isStudioCollapsed && (
									<div className={`w-0.5 h-8 rounded-full opacity-40 ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />
								)}
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
									isCollapsed={isStudioCollapsed}
									onToggleCollapse={handleToggleStudioCollapse}
									activeView={activeView}
									shouldDisableQuiz={shouldDisableQuiz}
									shouldDisableFlashcard={shouldDisableFlashcard}
									shouldDisableRoadmap={shouldDisableRoadmap}
								/>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Dialog táº£i tÃ i liá»‡u */}
			<UploadSourceDialog
				open={uploadDialogOpen}
				onOpenChange={setUploadDialogOpen}
				isDarkMode={isDarkMode}
				onUploadFiles={handleUploadFiles}
			/>

			<RoadmapPhaseGenerateDialog
				open={phaseGenerateDialogOpen}
				onOpenChange={setPhaseGenerateDialogOpen}
				isDarkMode={isDarkMode}
				materials={sources}
				defaultSelectedMaterialIds={phaseGenerateDialogDefaultIds}
				submitting={isSubmittingRoadmapPhaseRequest}
				onSubmit={handleSubmitRoadmapPhaseDialog}
			/>

			<IndividualWorkspaceProfileConfigDialog
				initialData={workspaceProfile}
				open={profileConfigOpen}
				onOpenChange={handleProfileConfigChange}
				onSave={handleSaveProfileConfig}
				onConfirm={handleConfirmProfileConfig}
				onUploadFiles={handleUploadFiles}
				isDarkMode={isDarkMode}
				uploadedMaterials={sources}
				workspaceId={workspaceId}
				forceStartAtStepOne={openProfileConfig && !isProfileConfigured}
				mockTestGenerationState={mockTestGenerationState}
				mockTestGenerationMessage={mockTestGenerationDisplayMessage}
				mockTestGenerationProgress={mockTestGenerationProgress}
			/>

			<IndividualWorkspaceProfileOverviewDialog
				open={profileOverviewOpen}
				onOpenChange={handleProfileOverviewChange}
				isDarkMode={isDarkMode}
				profile={workspaceProfile}
				materials={sources}
			/>


		</div>
	);
}

export default WorkspacePage;

