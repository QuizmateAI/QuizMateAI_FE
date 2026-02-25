import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";
import UploadSourceDialog from "@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog";
import { Globe, Moon, Settings, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWorkspace } from "@/hooks/useWorkspace";

function WorkspacePage() {
	const { workspaceId } = useParams();
	const { t, i18n } = useTranslation();
	const { isDarkMode, toggleDarkMode } = useDarkMode();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const settingsRef = useRef(null);

	const { currentWorkspace, fetchWorkspaceDetail } = useWorkspace();

	// State quản lý tài liệu (sources) — mock data, sẽ kết nối API sau
	const [sources, setSources] = useState([]);
	const [outputs, setOutputs] = useState([]);
	const [isLeftResizing, setIsLeftResizing] = useState(false);
	const [isRightResizing, setIsRightResizing] = useState(false);

	// State quản lý dialog upload — hiện upload dialog mặc định khi vào workspace lần đầu
	const [uploadDialogOpen, setUploadDialogOpen] = useState(true);
	const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
	const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);

	// State quản lý kích thước panel (px) — kéo thả để thay đổi
	const [leftWidth, setLeftWidth] = useState(320);
	const [rightWidth, setRightWidth] = useState(320);

	// Trạng thái hiển thị nội dung chính (null = chưa chọn hoạt động)
	const [activeView, setActiveView] = useState(null);

	// Hằng số kích thước panel
	const COLLAPSED_WIDTH = 56;
	const MIN_WIDTH = 240;
	const MAX_WIDTH = 500;

	const effectiveLeftWidth = isSourcesCollapsed ? COLLAPSED_WIDTH : leftWidth;
	const effectiveRightWidth = isStudioCollapsed ? COLLAPSED_WIDTH : rightWidth;

	const currentLang = i18n.language;
	const fontClass = currentLang === "en" ? "font-poppins" : "font-sans";

	const toggleLanguage = () => {
		const newLang = currentLang === "vi" ? "en" : "vi";
		i18n.changeLanguage(newLang);
	};

	// Lấy thông tin workspace từ API
	useEffect(() => {
		if (workspaceId) {
			fetchWorkspaceDetail(workspaceId).catch(() => {});
		}
	}, [workspaceId, fetchWorkspaceDetail]);

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
		// TODO: Gọi API upload thật — tạm thêm vào state mock
		const newSources = files.map((f, i) => ({
			id: `src-${Date.now()}-${i}`,
			name: f.name,
			type: f.type?.includes("pdf") ? "pdf" : f.type?.includes("image") ? "image" : f.type?.includes("video") ? "video" : "file",
			size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
		}));
		setSources((prev) => [...prev, ...newSources]);
	}, []);

	// Xử lý thêm URL
	const handleAddUrl = useCallback(async (url) => {
		// TODO: Gọi API thêm URL — tạm thêm vào state mock
		setSources((prev) => [...prev, {
			id: `src-${Date.now()}`,
			name: url,
			type: "url",
			size: "",
		}]);
	}, []);

	// Xóa tài liệu
	const handleRemoveSource = useCallback((sourceId) => {
		setSources((prev) => prev.filter((s) => s.id !== sourceId));
	}, []);

	// Xử lý action từ Studio Panel — hiển thị form inline trong ChatPanel
	const handleStudioAction = useCallback((actionKey) => {
		setActiveView(actionKey);
	}, []);

	// Xử lý tạo quiz — gọi từ form inline trong ChatPanel
	const handleCreateQuiz = useCallback(async (data) => {
		// TODO: Gọi API tạo quiz
		setOutputs((prev) => [...prev, { name: data.name || "Quiz", type: "Quiz" }]);
		setActiveView(null);
	}, []);

	// Xử lý tạo flashcard — gọi từ form inline trong ChatPanel
	const handleCreateFlashcard = useCallback(async (data) => {
		// TODO: Gọi API tạo flashcard
		setOutputs((prev) => [...prev, { name: data.deckName || "Flashcard", type: "Flashcard" }]);
		setActiveView(null);
	}, []);

	// Xử lý tạo roadmap — gọi từ form inline trong ChatPanel
	const handleCreateRoadmap = useCallback(async (data) => {
		// TODO: Gọi API tạo roadmap
		setOutputs((prev) => [...prev, { name: data.name || "Roadmap", type: "Roadmap" }]);
		setActiveView(null);
	}, []);

	// Quay về trạng thái mặc định khi bấm nút Back trong form
	const handleBackFromForm = useCallback(() => {
		setActiveView(null);
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
				workspaceTitle={currentWorkspace?.title}
				workspaceSubtitle={currentWorkspace?.topic?.title || currentWorkspace?.subject?.title}
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
								onUploadClick={() => setUploadDialogOpen(true)}
								onCreateQuiz={handleCreateQuiz}
								onCreateFlashcard={handleCreateFlashcard}
								onCreateRoadmap={handleCreateRoadmap}
								onBack={handleBackFromForm}
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
								outputs={outputs}
								isCollapsed={isStudioCollapsed}
								onToggleCollapse={() => setIsStudioCollapsed((prev) => !prev)}
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
				onAddUrl={handleAddUrl}
			/>


		</div>
	);
}

export default WorkspacePage;
