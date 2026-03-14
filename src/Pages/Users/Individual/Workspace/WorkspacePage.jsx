import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/Components/ui/button";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";
import UploadSourceDialog from "@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog";
import IndividualWorkspaceProfileConfigDialog from "@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog";
import { Globe, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWorkspace } from "@/hooks/useWorkspace";
import { configureIndividualWorkspaceProfile, getIndividualWorkspaceProfile } from "@/api/WorkspaceAPI";
import { useWebSocket } from "@/hooks/useWebSocket";
import { createRoadmapForWorkspace, createPhase, createKnowledge } from "@/api/RoadmapAPI";
import { getMaterialsByWorkspace, deleteMaterial, uploadMaterial } from "@/api/MaterialAPI";

function WorkspacePage() {
	const { workspaceId } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const { isDarkMode, toggleDarkMode } = useDarkMode();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const settingsRef = useRef(null);

	const openProfileConfig = location.state?.openProfileConfig || false;
	const [profileConfigOpen, setProfileConfigOpen] = useState(openProfileConfig);
	const [isProfileConfigured, setIsProfileConfigured] = useState(false);
	const [workspaceProfile, setWorkspaceProfile] = useState(null);

	const { currentWorkspace, fetchWorkspaceDetail, editWorkspace } = useWorkspace();

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
				const isConfigured = !!(profileData?.learningGoal && String(profileData.learningGoal).trim());

				setIsProfileConfigured(isConfigured);
				setWorkspaceProfile(profileData);

				// Náº¿u chÆ°a cáº¥u hÃ¬nh profile, ta khÃ´ng má»Ÿ upload dialog
				// Náº¿u Ä‘Ã£ cáº¥u hÃ¬nh rá»“i vÃ  tÃ i nguyÃªn rá»—ng, thÃ¬ má»Ÿ
				if (isConfigured && initialSources.length === 0 && !profileConfigOpen) {
					setUploadDialogOpen(true);
				}
			} catch (error) {
				console.error("Failed to load initial workspace data", error);
			}
		};

		loadInitialData();

		return () => {
			isMounted = false;
		};
	}, [workspaceId, fetchSources, profileConfigOpen, fetchWorkspaceDetail]);

	// Xá»­ lÃ½ Ä‘Ã³ng/má»Ÿ profile config dialog
	const handleProfileConfigChange = useCallback((open) => {
		setProfileConfigOpen(open);
		if (open) {
			// Refetch profile khi má»Ÿ Ä‘á»ƒ luÃ´n cÃ³ dá»¯ liá»‡u má»›i nháº¥t (bao gá»“m targetLevelId)
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

	// Xá»­ lÃ½ lÆ°u cáº¥u hÃ¬nh IndividualWorkspaceProfile
	const handleSaveProfileConfig = useCallback(async (data) => {
		try {
			const res = await configureIndividualWorkspaceProfile(workspaceId, data);
			const savedProfile = res?.data?.data || res?.data || res;
			if (savedProfile) setWorkspaceProfile(savedProfile);
			setProfileConfigOpen(false);
			setIsProfileConfigured(true); // ÄÃ¡nh dáº¥u lÃ  Ä‘Ã£ cáº¥u hÃ¬nh
			fetchWorkspaceDetail(workspaceId);

			if (sources.length === 0) {
				setUploadDialogOpen(true);
			}

			// XÃ³a state Ä‘á»ƒ khÃ´ng má»Ÿ láº¡i khi reload (dÃ¹ng navigate Ä‘á»ƒ trÃ¡nh loading vÃ´ háº¡n khi cÃ¹ng URL)
			navigate(`/workspace/${workspaceId}`, { replace: true });
		} catch (error) {
			console.error("Failed to config profile:", error);
		}
	}, [workspaceId, fetchWorkspaceDetail, navigate, sources]);

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
            // Upload táº¥t cáº£ files song song thay vÃ¬ tuáº§n tá»±
            const uploadPromises = files.map(file => uploadMaterial(file, workspaceId));
            await Promise.all(uploadPromises);
            // Refresh list after all uploads complete
            fetchSources();
        } catch (error) {
            console.error("Failed to upload files:", error);
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
			const roadmapRes = await createRoadmapForWorkspace({
				workspaceId,
				name: data.name || "Roadmap",
				description: data.goal || data.description || "",
			});

			const createdRoadmap = roadmapRes.data?.data || roadmapRes.data || {};
			const roadmapId = createdRoadmap.roadmapId || createdRoadmap.id;
			if (!roadmapId) {
				throw new Error("KhÃ´ng láº¥y Ä‘Æ°á»£c roadmapId sau khi táº¡o roadmap.");
			}

			const serverPhases = [];
			const formPhases = Array.isArray(data.phases) ? data.phases : [];

			for (let pIdx = 0; pIdx < formPhases.length; pIdx += 1) {
				const phase = formPhases[pIdx];
				const phaseRes = await createPhase(roadmapId, {
					name: phase?.name || `Phase ${pIdx + 1}`,
					description: phase?.description || "",
					studyDurationInDay: phase?.studyDurationInDay || 0,
				});

				const createdPhase = phaseRes.data?.data || phaseRes.data || {};
				const phaseId = createdPhase.phaseId || createdPhase.id;
				const phaseKnowledges = [];

				const knowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
				for (let kIdx = 0; kIdx < knowledges.length; kIdx += 1) {
					const knowledge = knowledges[kIdx];
					if (!phaseId) continue;

					const knowledgeRes = await createKnowledge(phaseId, {
						name: knowledge?.name || `Knowledge ${kIdx + 1}`,
						description: knowledge?.description || "",
					});

					const createdKnowledge = knowledgeRes.data?.data || knowledgeRes.data || {};
					phaseKnowledges.push({
						id: createdKnowledge.knowledgeId || createdKnowledge.id || `created-kn-${Date.now()}-${kIdx}`,
						name: createdKnowledge.title || knowledge?.name || `Knowledge ${kIdx + 1}`,
						quizCount: 0,
						flashcardCount: 0,
						createdAt: createdKnowledge.createdAt || new Date().toISOString(),
						updatedAt: createdKnowledge.updatedAt || new Date().toISOString(),
					});
				}

				serverPhases.push({
					id: phaseId || `created-ph-${Date.now()}-${pIdx}`,
					name: createdPhase.title || phase?.name || `Phase ${pIdx + 1}`,
					createdAt: createdPhase.createdAt || new Date().toISOString(),
					updatedAt: createdPhase.updatedAt || new Date().toISOString(),
					knowledges: phaseKnowledges,
				});
			}

			setCreatedItems((prev) => [...prev, {
				id: roadmapId,
				name: createdRoadmap.title || data.name || "Roadmap",
				type: "Roadmap",
				status: createdRoadmap.status || "INACTIVE",
				createVia: createdRoadmap.createVia || (data.mode === "ai" ? "AI" : "MANUAL"),
				roadmapType: createdRoadmap.roadmapType || "GENERAL",
				phasesCount: serverPhases.length,
				phases: serverPhases,
				createdAt: createdRoadmap.createdAt || new Date().toISOString(),
				updatedAt: createdRoadmap.updatedAt || new Date().toISOString(),
			}]);
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
							setProfileConfigOpen(true);
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
				isDarkMode={isDarkMode}
			/>


		</div>
	);
}

export default WorkspacePage;

