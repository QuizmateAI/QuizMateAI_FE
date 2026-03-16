import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/Components/ui/button";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";
import UploadSourceDialog from "@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog";
import IndividualWorkspaceProfileConfigDialog from "@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog";
import IndividualWorkspaceProfileOverviewDialog from "@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog";
import { Globe, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
	getIndividualWorkspaceProfile,
	normalizeIndividualWorkspaceProfile,
	saveIndividualWorkspaceBasicStep,
	saveIndividualWorkspacePersonalInfoStep,
	saveIndividualWorkspaceRoadmapConfigStep,
	startIndividualWorkspaceMockTestPersonalInfoStep,
} from "@/api/WorkspaceAPI";
import { useWebSocket } from "@/hooks/useWebSocket";
import { createRoadmapForWorkspace, createPhase, createKnowledge } from "@/api/RoadmapAPI";
import { getMaterialsByWorkspace, deleteMaterial, uploadMaterial, getModerationReportDetail } from "@/api/MaterialAPI";
import { useToast } from "@/context/ToastContext";

function isProfileOnboardingDone(profileData) {
	return profileData?.profileStatus === "DONE" || profileData?.workspaceSetupStatus === "PROFILE_DONE";
}

function extractProfileData(response) {
	return response?.data?.data || response?.data || response || null;
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
	const isMountedRef = useRef(true);
	const mockTestPollingActiveRef = useRef(false);
	const mockTestPollingRunRef = useRef(0);
	const mockTestProgressTimerRef = useRef(null);
	const mockTestElapsedTimerRef = useRef(null);
	const mockTestAutoFinalizePayloadRef = useRef(null);
	const mockTestShouldCloseAfterStartRef = useRef(false);
	const mockTestGenerationStorageKey = workspaceId ? `workspace_${workspaceId}_mockTestGeneration` : null;

	// State quáº£n lÃ½ tÃ i liá»‡u (sources) â€” mock data, sáº½ káº¿t ná»‘i API sau
	const [sources, setSources] = useState([]);
	const [selectedSourceIds, setSelectedSourceIds] = useState([]); // Selected sources from SourcesPanel
	const [createdItems, setCreatedItems] = useState([]);
	const [accessHistory, setAccessHistory] = useState([]);
	const [isLeftResizing, setIsLeftResizing] = useState(false);
	const [isRightResizing, setIsRightResizing] = useState(false);

	// State quáº£n lÃ½ dialog upload â€” chá»‰ má»Ÿ khi workspace chÆ°a cÃ³ tÃ i liá»‡u sau láº§n fetch Ä‘áº§u tiÃªn
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
	const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);

	// State quáº£n lÃ½ kÃ­ch thÆ°á»›c panel (px) â€” kÃ©o tháº£ Ä‘á»ƒ thay Ä‘á»•i
	const [leftWidth, setLeftWidth] = useState(320);
	const [rightWidth, setRightWidth] = useState(320);

	// Tráº¡ng thÃ¡i hiá»ƒn thá»‹ ná»™i dung chÃ­nh â€” khÃ´i phá»¥c tá»« sessionStorage khi reload
	const [activeView, setActiveView] = useState(() => {
		if (!workspaceId) return null;
		return sessionStorage.getItem(`workspace_${workspaceId}_activeView`) || null;
	});
	// State lÆ°u quiz Ä‘ang Ä‘Æ°á»£c xem chi tiáº¿t hoáº·c chá»‰nh sá»­a
	const [selectedQuiz, setSelectedQuiz] = useState(null);
	// State lÆ°u flashcard Ä‘ang Ä‘Æ°á»£c xem chi tiáº¿t
	const [selectedFlashcard, setSelectedFlashcard] = useState(null);
	// State lÆ°u mock test Ä‘ang Ä‘Æ°á»£c xem chi tiáº¿t hoáº·c chá»‰nh sá»­a
	const [selectedMockTest, setSelectedMockTest] = useState(null);

	// Háº±ng sá»‘ kÃ­ch thÆ°á»›c panel
	const COLLAPSED_WIDTH = 56;
	const MIN_WIDTH = 240;
	const MAX_WIDTH = 500;

	const effectiveLeftWidth = isSourcesCollapsed ? COLLAPSED_WIDTH : leftWidth;
	const effectiveRightWidth = isStudioCollapsed ? COLLAPSED_WIDTH : rightWidth;

	// LÆ°u activeView vÃ o sessionStorage má»—i khi thay Ä‘á»•i
	useEffect(() => {
		if (!workspaceId) return;
		if (activeView) {
			sessionStorage.setItem(`workspace_${workspaceId}_activeView`, activeView);
		} else {
			sessionStorage.removeItem(`workspace_${workspaceId}_activeView`);
		}
	}, [activeView, workspaceId]);

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
			"Template đã được tạo xong. Bạn có thể tiếp tục sang bước tiếp theo."
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

		const finalizedProfile = extractProfileData(
			await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, mockTestAutoFinalizePayloadRef.current)
		);

		if (finalizedProfile) {
			setWorkspaceProfile(finalizedProfile);
			setIsProfileConfigured(isProfileOnboardingDone(finalizedProfile));
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
		return finalizedProfile;
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

					if (profileData?.profileStatus === "PERSONAL_INFO_DONE" || profileData?.profileStatus === "DONE") {
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

			if (profileData?.profileStatus === "PERSONAL_INFO_DONE" || profileData?.profileStatus === "DONE") {
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

	// WebSocket Ä‘á»ƒ nháº­n realtime updates cho tÃ i liá»‡u
	const { isConnected: wsConnected } = useWebSocket({
		workspaceId: workspaceId,
		enabled: !!workspaceId,
		onMaterialUploaded: (data) => {
			console.log("ðŸ“¤ [WorkspacePage] Material uploaded via WebSocket:", data);
			console.log("   Status:", data.status);
			console.log("   Material ID:", data.materialId);
			fetchSources(); // Reload danh sÃ¡ch tÃ i liá»‡u
		},
		onMaterialDeleted: (data) => {
			console.log("ðŸ—‘ï¸ [WorkspacePage] Material deleted via WebSocket:", data);
			fetchSources(); // Reload danh sÃ¡ch tÃ i liá»‡u
		},
		onMaterialUpdated: (data) => {
			console.log("ðŸ”„ [WorkspacePage] Material updated via WebSocket:", data);
			console.log("   Status:", data.status);
			console.log("   Material ID:", data.materialId);
			fetchSources(); // Reload danh sÃ¡ch tÃ i liá»‡u
		},
	});

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
				} else if ((profileData?.profileStatus === "PERSONAL_INFO_DONE" || profileData?.profileStatus === "DONE") && storedMockTestGeneration) {
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
					} else if ((profileData?.profileStatus === "PERSONAL_INFO_DONE" || profileData?.profileStatus === "DONE") && storedMockTestGeneration) {
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
			setProfileConfigOpen(false);
			setProfileOverviewOpen(false);
			setIsProfileConfigured(isProfileOnboardingDone(savedProfile));
			fetchWorkspaceDetail(workspaceId);

			if (sources.length === 0) {
				setUploadDialogOpen(true);
			}

			showSuccess(
				translateOrFallback(
					t,
					"workspace.profileConfig.messages.finishSuccess",
					"Hoan thanh thiet lap workspace thanh cong."
				)
			);
			navigate(`/workspace/${workspaceId}`, { replace: true });
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
		fetchWorkspaceDetail,
		sources,
		showSuccess,
		t,
		navigate,
		showError,
	]);

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
	const handleViewQuiz = useCallback((quiz) => {
		setSelectedQuiz(quiz);
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
		const formToList = { createRoadmap: "roadmap", createQuiz: "quiz", createFlashcard: "flashcard", quizDetail: "quiz", editQuiz: "quizDetail", flashcardDetail: "flashcard", createMockTest: "mockTest", mockTestDetail: "mockTest", editMockTest: "mockTestDetail" };
		const nextView = formToList[activeView] || null;
		if (nextView !== "quizDetail" && nextView !== "editQuiz") {
			setSelectedQuiz(null);
		}
		if (nextView !== "flashcardDetail") {
			setSelectedFlashcard(null);
		}
		if (nextView !== "mockTestDetail" && nextView !== "editMockTest") {
			setSelectedMockTest(null);
		}
		setActiveView(nextView);
	}, [activeView]);

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

	// KÃ©o tháº£ thay Ä‘á»•i kÃ­ch thÆ°á»›c panel trÃ¡i (Sources)
	const handleLeftResize = useCallback((e) => {
		if (isSourcesCollapsed) return;
		e.preventDefault();
		setIsLeftResizing(true);
		const startX = e.clientX;
		const startW = leftWidth;
		const onMove = (ev) => {
			setLeftWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + ev.clientX - startX)));
		};
		const onUp = () => {
			setIsLeftResizing(false);
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
	}, [leftWidth, isSourcesCollapsed]);

	// KÃ©o tháº£ thay Ä‘á»•i kÃ­ch thÆ°á»›c panel pháº£i (Studio)
	const handleRightResize = useCallback((e) => {
		if (isStudioCollapsed) return;
		e.preventDefault();
		setIsRightResizing(true);
		const startX = e.clientX;
		const startW = rightWidth;
		const onMove = (ev) => {
			setRightWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW - (ev.clientX - startX))));
		};
		const onUp = () => {
			setIsRightResizing(false);
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
	}, [rightWidth, isStudioCollapsed]);

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
				<div className="max-w-[1740px] mx-auto px-4 py-4 h-full">
					{/* Layout flex vá»›i resize handles â€” kÃ©o tháº£ Ä‘á»ƒ thay Ä‘á»•i kÃ­ch thÆ°á»›c */}
					<div className="flex h-full">
						{/* Panel nguá»“n tÃ i liá»‡u (trÃ¡i) */}
						<div
							style={{ width: effectiveLeftWidth, minWidth: effectiveLeftWidth }}
							className={`shrink-0 h-full ${isLeftResizing ? "" : "transition-[width,min-width] duration-300 ease-in-out"}`}
						>
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
								}}								isCollapsed={isSourcesCollapsed}
								onToggleCollapse={() => setIsSourcesCollapsed((prev) => !prev)}

							/>
						</div>

						{/* Resize handle trÃ¡i */}
						<div
							className={`shrink-0 flex items-center justify-center ${isLeftResizing ? "" : "transition-all duration-300 ease-in-out"} ${isSourcesCollapsed ? "w-2" : "w-4 cursor-col-resize group"}`}
							onMouseDown={isSourcesCollapsed ? undefined : handleLeftResize}
						>
							{!isSourcesCollapsed && (
								<div className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />
							)}
						</div>

						{/* Panel khu vá»±c há»c táº­p (giá»¯a) */}
						<div className="flex-1 min-w-0 h-full">
							<ChatPanel
								isDarkMode={isDarkMode}
								sources={sources}
                                selectedSourceIds={selectedSourceIds}
								activeView={activeView}
								createdItems={createdItems}
								onUploadClick={handleUploadClickSafe}
								onChangeView={handleStudioAction}
								onCreateQuiz={handleCreateQuiz}
								onCreateFlashcard={handleCreateFlashcard}
								onCreateRoadmap={handleCreateRoadmap}
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
							/>
						</div>

						{/* Resize handle pháº£i */}
						<div
							className={`shrink-0 flex items-center justify-center ${isRightResizing ? "" : "transition-all duration-300 ease-in-out"} ${isStudioCollapsed ? "w-2" : "w-4 cursor-col-resize group"}`}
							onMouseDown={isStudioCollapsed ? undefined : handleRightResize}
						>
							{!isStudioCollapsed && (
								<div className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />
							)}
						</div>

						{/* Panel Studio (pháº£i) */}
						<div
							style={{ width: effectiveRightWidth, minWidth: effectiveRightWidth }}
							className={`shrink-0 h-full ${isRightResizing ? "" : "transition-[width,min-width] duration-300 ease-in-out"}`}
						>
							<StudioPanel
								isDarkMode={isDarkMode}
								onAction={handleStudioAction}
								accessHistory={accessHistory}
								isCollapsed={isStudioCollapsed}
								onToggleCollapse={() => setIsStudioCollapsed((prev) => !prev)}
								activeView={activeView}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Dialog táº£i tÃ i liá»‡u */}
			<UploadSourceDialog
				open={uploadDialogOpen}
				onOpenChange={setUploadDialogOpen}
				isDarkMode={isDarkMode}
				onUploadFiles={handleUploadFiles}
			/>

			<IndividualWorkspaceProfileConfigDialog
				initialData={workspaceProfile}
				open={profileConfigOpen}
				onOpenChange={handleProfileConfigChange}
				onSave={handleSaveProfileConfig}
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

