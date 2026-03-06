import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/Components/ui/button";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";
import UploadSourceDialog from "@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog";
import CreateWorkspaceInfoDialog from "@/Pages/Users/Individual/Workspace/Components/CreateWorkspaceInfoDialog";
import { Globe, Moon, Settings, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWorkspace } from "@/hooks/useWorkspace";
import { createRoadmapForWorkspace, createPhase, createKnowledge } from "@/api/RoadmapAPI";
import { getMaterialsByWorkspace, deleteMaterial, uploadMaterial } from "@/api/MaterialAPI";

function WorkspacePage() {
	const { workspaceId } = useParams();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const { isDarkMode, toggleDarkMode } = useDarkMode();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const settingsRef = useRef(null);

	// Chế độ tạo mới: workspaceId === 'new'
	const isCreating = workspaceId === 'new';
	const [createDialogOpen, setCreateDialogOpen] = useState(isCreating);

	const { currentWorkspace, fetchWorkspaceDetail, editWorkspace, createWorkspace } = useWorkspace();

	// State quản lý tài liệu (sources) — mock data, sẽ kết nối API sau
	const [sources, setSources] = useState([]);
	const [createdItems, setCreatedItems] = useState([]);
	const [accessHistory, setAccessHistory] = useState([]);
	const [isLeftResizing, setIsLeftResizing] = useState(false);
	const [isRightResizing, setIsRightResizing] = useState(false);

	// State quản lý dialog upload — không mở khi đang tạo mới
	const [uploadDialogOpen, setUploadDialogOpen] = useState(!isCreating);
	const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
	const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);

	// State quản lý kích thước panel (px) — kéo thả để thay đổi
	const [leftWidth, setLeftWidth] = useState(320);
	const [rightWidth, setRightWidth] = useState(320);

	// Trạng thái hiển thị nội dung chính — khôi phục từ sessionStorage khi reload
	const [activeView, setActiveView] = useState(() => {
		if (!workspaceId) return null;
		return sessionStorage.getItem(`workspace_${workspaceId}_activeView`) || null;
	});
	// State lưu quiz đang được xem chi tiết hoặc chỉnh sửa
	const [selectedQuiz, setSelectedQuiz] = useState(null);
	// State lưu flashcard đang được xem chi tiết
	const [selectedFlashcard, setSelectedFlashcard] = useState(null);
	// State lưu mock test đang được xem chi tiết hoặc chỉnh sửa
	const [selectedMockTest, setSelectedMockTest] = useState(null);

	// Hằng số kích thước panel
	const COLLAPSED_WIDTH = 56;
	const MIN_WIDTH = 240;
	const MAX_WIDTH = 500;

	const effectiveLeftWidth = isSourcesCollapsed ? COLLAPSED_WIDTH : leftWidth;
	const effectiveRightWidth = isStudioCollapsed ? COLLAPSED_WIDTH : rightWidth;

	// Lưu activeView vào sessionStorage mỗi khi thay đổi
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

	// Fetch materials list
    const fetchSources = useCallback(async () => {
        if (!workspaceId) return;
        try {
            const data = await getMaterialsByWorkspace(workspaceId);
            if (Array.isArray(data)) {
                setSources(data.map(item => ({
                    id: item.materialId,
                    name: item.title,
                    type: item.materialType,
                    status: item.status,
                    uploadedAt: item.uploadedAt,
                    // map other fields
                    ...item
                })));
            }
        } catch (err) {
            console.error("Failed to fetch materials:", err);
        }
    }, [workspaceId]);

	// Lấy thông tin workspace từ API (bỏ qua khi đang tạo mới)
	useEffect(() => {
		if (workspaceId && !isCreating) {
			fetchWorkspaceDetail(workspaceId).catch(() => {});
            fetchSources();
		}
	}, [workspaceId, isCreating, fetchWorkspaceDetail, fetchSources]);

	// Xử lý tạo workspace mới từ dialog
	const handleCreateWorkspace = useCallback(async (data) => {
		const newWorkspace = await createWorkspace(data);
		if (newWorkspace?.workspaceId) {
			setCreateDialogOpen(false);
			navigate(`/workspace/${newWorkspace.workspaceId}`, { replace: true });
		}
	}, [createWorkspace, navigate]);

	// Khi đóng dialog tạo mà chưa submit → quay về trang chủ
	const handleCreateDialogChange = useCallback((open) => {
		setCreateDialogOpen(open);
		if (!open && isCreating) {
			navigate('/home');
		}
	}, [isCreating, navigate]);

	// Đóng settings khi click ra ngoài
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

	// Xử lý upload file tài liệu
	const handleUploadFiles = useCallback(async (files) => {
        try {
            for (const file of files) {
                await uploadMaterial(file, workspaceId, "WORKSPACE");
            }
            // Refresh list after upload
            fetchSources();
        } catch (error) {
            console.error("Failed to upload files:", error);
        }
	}, [workspaceId, fetchSources]);

	// Xóa tài liệu
	const handleRemoveSource = useCallback(async (sourceId) => {
        try {
            await deleteMaterial(sourceId, "WORKSPACE");
            fetchSources();
        } catch (error) {
            console.error("Failed to delete material:", error);
        }
	}, [fetchSources]);

	// Xử lý action từ Studio Panel — hiển thị form inline trong ChatPanel
	const handleStudioAction = useCallback((actionKey) => {
		// Ghi lịch sử truy cập khi người dùng mở list view
		const viewTypeMap = { roadmap: "Roadmap", quiz: "Quiz", flashcard: "Flashcard", mockTest: "MockTest" };
		if (viewTypeMap[actionKey]) {
			addAccessHistory(viewTypeMap[actionKey], viewTypeMap[actionKey], actionKey);
		}
		setActiveView(actionKey);
	}, []);

	// Hàm thêm vào lịch sử truy cập — ghi nhận mỗi lần truy cập list view
	const addAccessHistory = useCallback((name, type, actionKey) => {
		setAccessHistory((prev) => {
			// Xóa trùng nếu đã có item cùng actionKey
			const filtered = prev.filter((item) => item.actionKey !== actionKey);
			return [{ name, type, actionKey, accessedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
		});
	}, []);

	// Xử lý tạo quiz — callback khi CreateQuizForm hoàn tất API multi-step
	const handleCreateQuiz = useCallback(async (data) => {
		// Quiz đã được tạo xong từ CreateQuizForm → chuyển về list view
		setActiveView("quiz");
	}, []);

	// Xử lý xem chi tiết quiz — khi click vào quiz trong danh sách
	const handleViewQuiz = useCallback((quiz) => {
		setSelectedQuiz(quiz);
		setActiveView("quizDetail");
	}, []);

	// Xử lý chuyển sang chỉnh sửa quiz — từ detail view
	const handleEditQuiz = useCallback((quiz) => {
		setSelectedQuiz(quiz);
		setActiveView("editQuiz");
	}, []);

	// Xử lý lưu quiz sau khi chỉnh sửa — quay về detail view
	const handleSaveQuiz = useCallback((updatedQuiz) => {
		setSelectedQuiz((prev) => ({ ...prev, ...updatedQuiz }));
		setActiveView("quizDetail");
	}, []);

	// Xử lý tạo flashcard — callback từ CreateFlashcardForm (API đã gọi xong)
	const handleCreateFlashcard = useCallback(async () => {
		// Chuyển về list view để reload danh sách
		setActiveView("flashcard");
	}, []);

	// Xử lý xem chi tiết flashcard — khi click vào flashcard trong danh sách
	const handleViewFlashcard = useCallback((flashcard) => {
		setSelectedFlashcard(flashcard);
		setActiveView("flashcardDetail");
	}, []);

	// Xử lý xóa flashcard — gọi API xóa flashcard set
	const handleDeleteFlashcard = useCallback(async (flashcard) => {
		if (!window.confirm("Bạn có chắc muốn xóa bộ flashcard này?")) return;
		try {
			const { deleteFlashcardSet } = await import("@/api/FlashcardAPI");
			await deleteFlashcardSet(flashcard.flashcardSetId);
			// Quay về list view để reload danh sách
			setActiveView("flashcard");
		} catch (err) {
			console.error("Xóa flashcard thất bại:", err);
		}
	}, []);

	// Xử lý tạo roadmap — gọi API tạo roadmap cho workspace cá nhân
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
				throw new Error("Không lấy được roadmapId sau khi tạo roadmap.");
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
			// Lỗi tạo roadmap — log để debug
			console.error("Tạo roadmap thất bại:", err);
			throw err;
		}
	}, [workspaceId]);

	// Quay về list view tương ứng khi bấm nút Back trong form tạo
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

	// Xử lý tạo mock test — quay về list sau khi tạo thành công
	const handleCreateMockTest = useCallback(async () => {
		setActiveView("mockTest");
	}, []);

	// Xử lý xem chi tiết mock test
	const handleViewMockTest = useCallback((mt) => {
		setSelectedMockTest(mt);
		setActiveView("mockTestDetail");
	}, []);

	// Xử lý chỉnh sửa mock test
	const handleEditMockTest = useCallback((mt) => {
		setSelectedMockTest(mt);
		setActiveView("editMockTest");
	}, []);

	// Xử lý lưu mock test sau khi chỉnh sửa
	const handleSaveMockTest = useCallback((updatedMt) => {
		setSelectedMockTest((prev) => ({ ...prev, ...updatedMt }));
		setActiveView("mockTestDetail");
	}, []);

	// Kéo thả thay đổi kích thước panel trái (Sources)
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

	// Kéo thả thay đổi kích thước panel phải (Studio)
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

	return (
		<div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${isDarkMode ? "bg-slate-950" : "bg-[#F7FBFF]"}`}>
			<WorkspaceHeader
				settingsMenu={settingsMenu}
				isDarkMode={isDarkMode}
				workspaceTitle={currentWorkspace?.displayTitle || currentWorkspace?.title}
				workspaceSubtitle={currentWorkspace?.topic?.title || currentWorkspace?.subject?.title}
				workspaceDescription={currentWorkspace?.description}
				onEditWorkspace={async (data) => {
					await editWorkspace(Number(workspaceId), data);
				}}
			/>
			<div className="flex-1 min-h-0">
				<div className="max-w-[1740px] mx-auto px-4 py-4 h-full">
					{/* Layout flex với resize handles — kéo thả để thay đổi kích thước */}
					<div className="flex h-full">
						{/* Panel nguồn tài liệu (trái) */}
						<div
							style={{ width: effectiveLeftWidth, minWidth: effectiveLeftWidth }}
							className={`shrink-0 h-full ${isLeftResizing ? "" : "transition-[width,min-width] duration-300 ease-in-out"}`}
						>
							<SourcesPanel
								isDarkMode={isDarkMode}
								sources={sources}
								onAddSource={() => setUploadDialogOpen(true)}
								onRemoveSource={handleRemoveSource}
								isCollapsed={isSourcesCollapsed}
								onToggleCollapse={() => setIsSourcesCollapsed((prev) => !prev)}

							/>
						</div>

						{/* Resize handle trái */}
						<div
							className={`shrink-0 flex items-center justify-center ${isLeftResizing ? "" : "transition-all duration-300 ease-in-out"} ${isSourcesCollapsed ? "w-2" : "w-4 cursor-col-resize group"}`}
							onMouseDown={isSourcesCollapsed ? undefined : handleLeftResize}
						>
							{!isSourcesCollapsed && (
								<div className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />
							)}
						</div>

						{/* Panel khu vực học tập (giữa) */}
						<div className="flex-1 min-w-0 h-full">
							<ChatPanel
								isDarkMode={isDarkMode}
								sources={sources}
								activeView={activeView}
								createdItems={createdItems}
								onUploadClick={() => setUploadDialogOpen(true)}
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

						{/* Resize handle phải */}
						<div
							className={`shrink-0 flex items-center justify-center ${isRightResizing ? "" : "transition-all duration-300 ease-in-out"} ${isStudioCollapsed ? "w-2" : "w-4 cursor-col-resize group"}`}
							onMouseDown={isStudioCollapsed ? undefined : handleRightResize}
						>
							{!isStudioCollapsed && (
								<div className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />
							)}
						</div>

						{/* Panel Studio (phải) */}
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

			{/* Dialog tải tài liệu */}
			<UploadSourceDialog
				open={uploadDialogOpen}
				onOpenChange={setUploadDialogOpen}
				isDarkMode={isDarkMode}
				onUploadFiles={handleUploadFiles}
			/>

			{/* Dialog tạo workspace mới */}
			{isCreating && (
				<CreateWorkspaceInfoDialog
					open={createDialogOpen}
					onOpenChange={handleCreateDialogChange}
					onCreate={handleCreateWorkspace}
					isDarkMode={isDarkMode}
				/>
			)}


		</div>
	);
}

export default WorkspacePage;
