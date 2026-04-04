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

import { usePlanEntitlements } from "@/hooks/usePlanEntitlements";

import PlanUpgradeModal from "@/Components/plan/PlanUpgradeModal";

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

import {

	createRoadmapForWorkspace,

	deleteRoadmapKnowledgeById,

	deleteRoadmapPhaseById,

	getRoadmapStructureById,

} from "@/api/RoadmapAPI";

import { getMaterialsByWorkspace, deleteMaterial, uploadMaterial } from "@/api/MaterialAPI";

import { deleteQuiz, getQuizzesByScope, shareQuizToCommunity } from "@/api/QuizAPI";

import { deleteFlashcardSet, getFlashcardsByScope } from "@/api/FlashcardAPI";

import { useToast } from "@/context/ToastContext";

import { getErrorMessage } from "@/Utils/getErrorMessage";

import { buildWorkspacePathForView, resolveWorkspaceViewFromSubPath } from "@/Pages/Users/Individual/Workspace/utils/viewRouting";

import { useWorkspaceMockTestGeneration } from "@/Pages/Users/Individual/Workspace/hooks/useWorkspaceMockTestGeneration";

import { useWorkspaceRoadmapManager } from "@/Pages/Users/Individual/Workspace/hooks/useWorkspaceRoadmapManager";

import ListSpinner from "@/Components/ui/ListSpinner";



const LazyRoadmapJourPanel = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/RoadmapJourPanel"));

const LazyUploadSourceDialog = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog"));

const LazyRoadmapPhaseGenerateDialog = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/RoadmapPhaseGenerateDialog"));

const LazyIndividualWorkspaceProfileConfigDialog = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog"));

const LazyIndividualWorkspaceProfileOverviewDialog = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog"));

const LazyWorkspaceOnboardingUpdateGuardDialog = React.lazy(() => import("@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog"));



function isProfileOnboardingDone(profileData) {

	return profileData?.onboardingCompleted === true || profileData?.workspaceSetupStatus === "DONE";

}



function extractProfileData(response) {

	return normalizeIndividualWorkspaceProfile(response?.data?.data || response?.data || response || null);

}



function extractRoadmapIdFromProfile(profileData) {

	const rawRoadmapId = profileData?.roadmap_id ?? profileData?.roadmapId ?? null;

	const roadmapId = Number(rawRoadmapId);

	return Number.isInteger(roadmapId) && roadmapId > 0 ? roadmapId : null;

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



function translateOrFallback(t, key, fallback) {

	const translated = t(key);

	return translated === key ? fallback : translated;

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

	const planEntitlements = usePlanEntitlements();

	const [planUpgradeModalOpen, setPlanUpgradeModalOpen] = useState(false);

	const [planUpgradeFeatureName, setPlanUpgradeFeatureName] = useState(undefined);

	const openProfileConfig = location.state?.openProfileConfig || false;

	const [profileConfigOpen, setProfileConfigOpen] = useState(false);

	const [profileOverviewOpen, setProfileOverviewOpen] = useState(false);

	const [profileUpdateGuardOpen, setProfileUpdateGuardOpen] = useState(false);

	const [isProfileUpdateMode, setIsProfileUpdateMode] = useState(false);

	const [isResettingWorkspaceForProfileUpdate, setIsResettingWorkspaceForProfileUpdate] = useState(false);

	const [isProfileConfigured, setIsProfileConfigured] = useState(false);

	const [workspaceProfile, setWorkspaceProfile] = useState(null);

	const [workspacePersonalization, setWorkspacePersonalization] = useState(null);



	const { currentWorkspace, fetchWorkspaceDetail, editWorkspace } = useWorkspace({ enabled: false });

	const progressTracking = useProgressTracking({

		scopeKey: workspaceId ? `workspace:${workspaceId}` : null,

	});

	const reconcileMaterialProgress = progressTracking.reconcileMaterialProgress;



	// Source state. Still mock-data-friendly, but wired to API fetches.

	const [sources, setSources] = useState([]);

	const [selectedSourceIds, setSelectedSourceIds] = useState([]); // Selected sources from SourcesPanel

	const [accessHistory, setAccessHistory] = useState([]);



	// Upload dialog state. Auto-open only when the first fetch returns no materials.

	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

	const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);

	const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);

	const [hasStudioManualPreference, setHasStudioManualPreference] = useState(false);

	const [isMaterialDetailOpen, setIsMaterialDetailOpen] = useState(false);

	const workspaceLayoutRef = useRef(null);

	const [workspaceLayoutWidth, setWorkspaceLayoutWidth] = useState(0);



	// Main content state. Prefer the current route instead of sessionStorage.

	const [activeView, setActiveView] = useState(() => {

		if (!workspaceId) return null;



		const prefix = `/workspace/${workspaceId}`;

		if (location.pathname.startsWith(prefix)) {

			const subPath = location.pathname.slice(prefix.length).replace(/^\/+/, "");

			const { view: routeView } = resolveWorkspaceViewFromSubPath(subPath);

			if (routeView) {

				return routeView;

			}

		}



		return null;

	});

	// Selected quiz state for detail and edit flows

	const [selectedQuiz, setSelectedQuiz] = useState(null);

	const [quizBackTarget, setQuizBackTarget] = useState(null);

	// Selected flashcard state for detail flow

	const [selectedFlashcard, setSelectedFlashcard] = useState(null);

	// Selected mock-test state for detail and edit flows

	const [selectedMockTest, setSelectedMockTest] = useState(null);

	const [selectedRoadmapPhaseId, setSelectedRoadmapPhaseId] = useState(null);

	const [roadmapAiRoadmapId, setRoadmapAiRoadmapId] = useState(null);

	const [roadmapHasPhases, setRoadmapHasPhases] = useState(false);

	const [isRoadmapStructureMissing, setIsRoadmapStructureMissing] = useState(false);

	const [hasExistingWorkspaceQuiz, setHasExistingWorkspaceQuiz] = useState(false);

	const [hasExistingWorkspaceFlashcard, setHasExistingWorkspaceFlashcard] = useState(false);



	// Side-panel sizing constants

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

	// Compute which Studio Panel actions are plan-locked (show crown icon)

	const studioPlanLockedActions = [

		...(!planEntitlements.hasWorkspaceAnalytics ? ["questionStats"] : []),

	];

	const isStudyNewRoadmap = getProfilePurpose(workspaceProfile) === "STUDY_NEW";

	const hasWorkspaceLearningDataAtRisk = hasExistingWorkspaceQuiz

		|| hasExistingWorkspaceFlashcard

		|| hasRoadmapPhases

		|| Boolean(extractRoadmapIdFromProfile(workspaceProfile));

	const workspaceAdaptationMode = String(workspaceProfile?.adaptationMode || workspaceProfile?.data?.adaptationMode || "").toUpperCase();



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



		const { view: mappedView, quizId, backTarget, phaseId: mappedPhaseId, roadmapId: mappedRoadmapId } = resolveWorkspaceViewFromSubPath(subPath);

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



		let mappedPath = buildWorkspacePathForView(activeView, selectedQuiz, quizBackTarget);

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

			const { view: routeView, quizId: routeQuizId } = resolveWorkspaceViewFromSubPath(currentSubPath);

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



	const applyResolvedWorkspaceProfile = useCallback((profileData) => {

		if (!profileData) return null;

		setWorkspaceProfile(profileData);

		setIsProfileConfigured(isProfileOnboardingDone(profileData));

		return profileData;

	}, []);



	const loadWorkspaceProfileData = useCallback(async () => {

		if (!workspaceId) return null;

		const profileData = extractProfileData(await getIndividualWorkspaceProfile(workspaceId));

		return applyResolvedWorkspaceProfile(profileData);

	}, [applyResolvedWorkspaceProfile, workspaceId]);



	const confirmWorkspaceProfileData = useCallback(async () => {

		if (!workspaceId) return null;

		const confirmedProfile = extractProfileData(await confirmIndividualWorkspaceProfile(workspaceId));

		return applyResolvedWorkspaceProfile(confirmedProfile);

	}, [applyResolvedWorkspaceProfile, workspaceId]);



	const persistWorkspaceRoadmapConfig = useCallback(async (data) => {

		if (!workspaceId) return null;

		return extractProfileData(await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, data));

	}, [workspaceId]);



	const closeProfileDialogs = useCallback(() => {

		setProfileConfigOpen(false);

		setProfileOverviewOpen(false);

	}, []);



	const navigateToWorkspaceRoot = useCallback(() => {

		if (!workspaceId) return;

		navigate(`/workspace/${workspaceId}`, { replace: true });

	}, [navigate, workspaceId]);



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

			console.error("[fetchSources] Failed to fetch materials:", err);

			return [];

		}

	}, [workspaceId, reconcileMaterialProgress]);



	const openRoadmapProfileSetup = useCallback(() => {

		setProfileOverviewOpen(false);

		setProfileConfigOpen(true);

	}, []);



	const openRoadmapWorkspaceView = useCallback(() => {

		setActiveView("roadmap");

	}, []);



	const clearRoadmapPhaseSelection = useCallback(() => {

		setSelectedRoadmapPhaseId(null);

	}, []);



	const {

		wsConnected,

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

					getIndividualWorkspaceProfile(workspaceId).catch(() => null)

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

					storedMockTestGeneration

				);



				if (!isMounted) return;



				if (mockTestSyncState === "finalized") {

					return;

				}



				if (mockTestSyncState === "pending" && Boolean(storedMockTestGeneration?.shouldCloseAfterStart)) {

					closeProfileDialogs();

					setUploadDialogOpen(false);

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

		applyResolvedWorkspaceProfile,

		closeProfileDialogs,

		fetchWorkspaceDetail,

		openProfileConfig,

		readStoredMockTestGeneration,

		syncMockTestGenerationFromProfile,

	]);



	// Handle profile config dialog open/close

	const handleProfileConfigChange = useCallback((open) => {

		setProfileConfigOpen(open);

		if (open) {

			// Refetch the profile on open so the dialog uses the latest data.

			loadWorkspaceProfileData()

				.then(async (profileData) => {

					if (!profileData) return;

					await syncMockTestGenerationFromProfile(

						profileData,

						readStoredMockTestGeneration()

					);

				})

				.catch(() => {});

		} else {

			setIsProfileUpdateMode(false);

			if (location.state?.openProfileConfig) {

				navigateToWorkspaceRoot();

			}

		}

	}, [

		location.state,

		loadWorkspaceProfileData,

		navigateToWorkspaceRoot,

		readStoredMockTestGeneration,

		syncMockTestGenerationFromProfile,

	]);



	const handleProfileOverviewChange = useCallback((open) => {

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

	}, [location.state, loadWorkspaceProfileData, navigateToWorkspaceRoot, refreshWorkspacePersonalization]);



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

			resetRoadmapRuntimeState({ clearPresence: true });

			bumpRoadmapReloadToken();

			await fetchWorkspaceDetail(workspaceId).catch(() => {});



			await loadWorkspaceProfileData();



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

		loadWorkspaceProfileData,

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

				savedProfile = applyResolvedWorkspaceProfile(

					extractProfileData(await saveIndividualWorkspaceBasicStep(workspaceId, data))

				);

				return savedProfile;

			}



			if (currentStep === 2) {

				if (data.workspacePurpose === "MOCK_TEST") {

					await startIndividualWorkspaceMockTestPersonalInfoStep(workspaceId, data);

					const shouldCloseAfterStart = !data.enableRoadmap;

					beginMockTestGeneration({

						shouldCloseAfterStart,

						autoFinalizePayload: shouldCloseAfterStart ? data : null,

						initialProgress: 12,

					});

					return { deferred: true, advanceToStep: shouldCloseAfterStart ? null : 3 };

				} else {

					resetMockTestGenerationStatus();

					savedProfile = applyResolvedWorkspaceProfile(

						extractProfileData(await saveIndividualWorkspacePersonalInfoStep(workspaceId, data))

					);

				}



				return savedProfile;

			}



			resetMockTestGenerationStatus();

			savedProfile = applyResolvedWorkspaceProfile(

				extractProfileData(await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, data))

			);

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

		applyResolvedWorkspaceProfile,

		beginMockTestGeneration,

		workspaceId,

		resetMockTestGenerationStatus,

		showSuccess,

		t,

		showError,

	]);



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

					"Hoàn thành thiết lập workspace thành công."

				)

			);

			navigateToWorkspaceRoot();

		} catch (error) {

			console.error("Failed to confirm profile:", error);

			showError(error?.message || "Không thể xác nhận onboarding. Vui lòng thử lại.");

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



	// Upload materials in parallel for better throughput

	const handleUploadFiles = useCallback(async (files) => {

        try {

            const uploadPromises = files.map((file) => uploadMaterial(file, workspaceId));

            await Promise.all(uploadPromises);

            return await fetchSources();

        } catch (error) {

            const msg = getErrorMessage(t, error);

            showError(msg);

            throw error;

        }

	}, [workspaceId, fetchSources, t, showError]);



	// Delete a single material

	const handleRemoveSource = useCallback(async (sourceId) => {

        try {

            await deleteMaterial(sourceId);

            fetchSources();

        } catch (error) {

            console.error("Failed to delete material:", error);

        }

	}, [fetchSources]);



	// Delete multiple materials in parallel

	const handleRemoveMultipleSources = useCallback(async (sourceIds) => {

        try {

            // Delete all selected files in parallel instead of sequentially

            const deletePromises = sourceIds.map(id => deleteMaterial(id));

            await Promise.all(deletePromises);

            fetchSources();

        } catch (error) {

            console.error("Failed to delete materials:", error);

        }

	}, [fetchSources]);



	// Track recent list-view access history

	const addAccessHistory = useCallback((name, type, actionKey) => {

		setAccessHistory((prev) => {

			// Remove duplicates when the same actionKey already exists

			const filtered = prev.filter((item) => item.actionKey !== actionKey);

			return [{ name, type, actionKey, accessedAt: new Date().toISOString() }, ...filtered].slice(0, 20);

		});

	}, []);



	// Handle Studio Panel actions and render inline forms in ChatPanel

	const handleStudioAction = useCallback((actionKey) => {

		if (actionKey === "roadmap" && shouldDisableRoadmapForStudio) {

			return;

		}



		// Plan-gated actions: show upgrade modal instead of navigating

		if (actionKey === "questionStats" && !planEntitlements.hasWorkspaceAnalytics) {

			setPlanUpgradeFeatureName("Thống kê workspace");

			setPlanUpgradeModalOpen(true);

			return;

		}



		// Track access history when the user opens a list view

		const viewTypeMap = { roadmap: "roadmap", quiz: "quiz", flashcard: "flashcard", mockTest: "mockTest", postLearning: "postLearning", questionStats: "questionStats" };

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

	}, [addAccessHistory, shouldDisableRoadmapForStudio, planEntitlements.hasWorkspaceAnalytics]);



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



	// Handle quiz creation callback after the multi-step API completes

	const handleCreateQuiz = useCallback(async (data) => {

		trackQuizGenerationStart(data);

		// Quiz was created successfully. Return to the list view.

		setActiveView("quiz");

	}, [trackQuizGenerationStart]);



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



	// Open quiz detail when the user selects a quiz from the list

	const handleViewQuiz = useCallback((quiz, options = null) => {

		const backTarget = options?.backTarget || null;

		setSelectedQuiz(quiz);

		setQuizBackTarget(backTarget);

		if (backTarget?.view === "roadmap" && Number.isInteger(Number(backTarget?.phaseId)) && Number(backTarget.phaseId) > 0) {

			setSelectedRoadmapPhaseId(Number(backTarget.phaseId));

		}

		setActiveView("quizDetail");

	}, []);



	const handleViewPostLearning = useCallback((quiz) => {

		handleViewQuiz(quiz, { backTarget: { view: "postLearning" } });

	}, [handleViewQuiz]);



	// Move from quiz detail to edit mode

	const handleEditQuiz = useCallback((quiz) => {

		setSelectedQuiz(quiz);

		setActiveView("editQuiz");

	}, []);



	// Save quiz edits and return to detail view

	const handleSaveQuiz = useCallback((updatedQuiz) => {

		setSelectedQuiz((prev) => ({ ...prev, ...updatedQuiz }));

		setActiveView("quizDetail");

	}, []);



	// Handle flashcard creation callback after the API flow finishes

	const handleCreateFlashcard = useCallback(async () => {

		// Return to the list view so it can refresh

		setActiveView("flashcard");

	}, []);



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

	const handleCreateRoadmap = useCallback(async (data) => {

		if (!planEntitlements.canCreateRoadmap) {

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

	}, [workspaceId, planEntitlements.canCreateRoadmap]);



	// Go back to the matching list view when the user presses Back in a form

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



		if (activeView === "quizDetail" && quizBackTarget?.view === "postLearning") {

			setSelectedQuiz(null);

			setQuizBackTarget(null);

			setActiveView("postLearning");

			if (workspaceId) {

				navigate(`/workspace/${workspaceId}/post-learning`, { replace: true });

			}

			return;

		}



		const formToList = { createRoadmap: "roadmap", createQuiz: "quiz", createFlashcard: "flashcard", quizDetail: "quiz", editQuiz: "quizDetail", flashcardDetail: "flashcard", createMockTest: "mockTest", createPostLearning: "postLearning", mockTestDetail: "mockTest", editMockTest: "mockTestDetail" };

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

	}, [activeView, navigate, quizBackTarget, roadmapAiRoadmapId, workspaceId]);



	// Return to the mock-test list after creation succeeds

	const handleCreateMockTest = useCallback(async () => {

		setActiveView("mockTest");

	}, []);



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

		setSources((prev) => prev.map((item) => (

			item.id === updatedSource.id ? { ...item, ...updatedSource } : item

		)));

	}, []);



	const chatPanelProps = {

		isDarkMode,

		sources,

		selectedSourceIds,

		selectedRoadmapPhaseId,

		activeView,

		onUploadClick: handleUploadClickSafe,

		onChangeView: handleStudioAction,

		onCreateQuiz: handleCreateQuiz,

		onCreateFlashcard: handleCreateFlashcard,

		onCreateRoadmap: handleCreateRoadmap,

		onCreateRoadmapPhases: handleOpenRoadmapPhaseDialog,

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

		onShareQuiz: handleShareQuiz,

		selectedFlashcard,

		onViewFlashcard: handleViewFlashcard,

		onDeleteFlashcard: handleDeleteFlashcard,

		selectedMockTest,

		onViewMockTest: handleViewMockTest,

		onEditMockTest: handleEditMockTest,

		onSaveMockTest: handleSaveMockTest,

		shouldDisableQuiz,

		shouldDisableFlashcard,

		shouldDisableRoadmap: shouldDisableRoadmapForStudio,

		showRoadmapAction: shouldShowRoadmapAction,

		shouldDisableCreateQuiz,

		shouldDisableCreateFlashcard,

		progressTracking,

		quizGenerationTaskByQuizId,

		quizGenerationProgressByQuizId,

		planEntitlements,

	};



	const renderSourceWorkspacePanel = (isCollapsed) => (

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

					onSourceUpdated={handleSourceUpdated}

					onDetailViewChange={setIsMaterialDetailOpen}

					forceCloseDetail={isRoadmapJourActive}

					isCollapsed={isCollapsed}

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

							isCollapsed={isCollapsed}

							onToggleCollapse={handleToggleSourcesCollapse}

						/>

					</DeferredWorkspacePanel>

				</div>

			) : null}

		</div>

	);



	const renderStudioWorkspacePanel = (isCollapsed) => (

		<StudioPanel

			isDarkMode={isDarkMode}

			onAction={handleStudioAction}

			accessHistory={accessHistory}

			isCollapsed={isCollapsed}

			onToggleCollapse={handleToggleStudioCollapse}

			activeView={activeView}

			shouldDisableQuiz={shouldDisableQuiz}

			shouldDisableFlashcard={shouldDisableFlashcard}

			shouldDisableRoadmap={shouldDisableRoadmapForStudio}

			showRoadmapAction={shouldShowRoadmapAction}

			planLockedActions={studioPlanLockedActions}

		/>

	);



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

								<ChatPanel {...chatPanelProps} />

							</div>



							<div className="grid min-h-0 grid-cols-2 gap-4">

								<div className="min-w-0 min-h-0">

									{renderSourceWorkspacePanel(false)}

								</div>



								<div className="min-w-0 min-h-0">

									{renderStudioWorkspacePanel(false)}

								</div>

							</div>

						</div>

					) : (

						<div className="flex h-full gap-4">

							{/* Source panel (left) */}

							<div

								style={{ width: effectiveLeftWidth, minWidth: effectiveLeftWidth }}

								className="shrink-0 h-full transition-[width,min-width] duration-300 ease-in-out"

							>

								{renderSourceWorkspacePanel(effectiveSourcesCollapsed)}

							</div>



							{/* Left panel separator */}

							<div

								aria-hidden="true"

								className={`shrink-0 flex items-center justify-center transition-all duration-300 ease-in-out ${effectiveSourcesCollapsed ? "w-2" : "w-4"}`}

							>

								{!effectiveSourcesCollapsed && (

									<div className={`w-0.5 h-8 rounded-full opacity-40 ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />

								)}

							</div>



							{/* Learning area panel (center) */}

							<div style={{ minWidth: CHAT_PANEL_MIN_WIDTH }} className="flex-1 min-w-0 h-full">

								<ChatPanel {...chatPanelProps} />

							</div>



							{/* Right panel separator */}

							<div

								aria-hidden="true"

								className={`shrink-0 flex items-center justify-center transition-all duration-300 ease-in-out ${effectiveStudioCollapsed ? "w-2" : "w-4"}`}

							>

								{!effectiveStudioCollapsed && (

									<div className={`w-0.5 h-8 rounded-full opacity-40 ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />

								)}

							</div>



							{/* Studio panel (right) */}

							<div

								style={{ width: effectiveRightWidth, minWidth: effectiveRightWidth }}

								className="shrink-0 h-full transition-[width,min-width] duration-300 ease-in-out"

							>

								{renderStudioWorkspacePanel(effectiveStudioCollapsed)}

							</div>

						</div>

					)}

				</div>

			</div>



			{/* Upload dialog */}

			{uploadDialogOpen ? (

				<DeferredWorkspaceDialog>

					<LazyUploadSourceDialog

						open={uploadDialogOpen}

						onOpenChange={setUploadDialogOpen}

						isDarkMode={isDarkMode}

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

			<PlanUpgradeModal

				open={planUpgradeModalOpen}

				onOpenChange={setPlanUpgradeModalOpen}

				featureName={planUpgradeFeatureName}

				isDarkMode={isDarkMode}

			/>



		</div>

	);

}



export default WorkspacePage;













