import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";
import UploadSourceDialog from "@/Pages/Users/Individual/Workspace/Components/UploadSourceDialog";
import CreateQuizDialog from "@/Pages/Users/Individual/Workspace/Components/CreateQuizDialog";
import CreateFlashcardDialog from "@/Pages/Users/Individual/Workspace/Components/CreateFlashcardDialog";
import CreateRoadmapDialog from "@/Pages/Users/Individual/Workspace/Components/CreateRoadmapDialog";
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

	// State quản lý các dialog — hiện upload dialog mặc định khi vào workspace lần đầu
	const [uploadDialogOpen, setUploadDialogOpen] = useState(true);
	const [quizDialogOpen, setQuizDialogOpen] = useState(false);
	const [flashcardDialogOpen, setFlashcardDialogOpen] = useState(false);
	const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);

	// Trạng thái hiển thị nội dung chính (null = chưa chọn hoạt động)
	const [activeView, setActiveView] = useState(null);

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

	// Xử lý action từ Studio Panel
	const handleStudioAction = useCallback((actionKey) => {
		switch (actionKey) {
			case "createRoadmap":
				setRoadmapDialogOpen(true);
				break;
			case "createQuiz":
				setQuizDialogOpen(true);
				break;
			case "createFlashcard":
				setFlashcardDialogOpen(true);
				break;
			case "mockTest":
				setActiveView("mockTest");
				break;
			case "prelearning":
				setActiveView("prelearning");
				break;
			default:
				break;
		}
	}, []);

	// Xử lý tạo quiz
	const handleCreateQuiz = useCallback(async (data) => {
		// TODO: Gọi API tạo quiz
		setOutputs((prev) => [...prev, { name: data.name || "Quiz", type: "Quiz" }]);
		setActiveView("quiz");
	}, []);

	// Xử lý tạo flashcard
	const handleCreateFlashcard = useCallback(async (data) => {
		// TODO: Gọi API tạo flashcard
		setOutputs((prev) => [...prev, { name: data.deckName || "Flashcard", type: "Flashcard" }]);
		setActiveView("flashcard");
	}, []);

	// Xử lý tạo roadmap
	const handleCreateRoadmap = useCallback(async (data) => {
		// TODO: Gọi API tạo roadmap
		setOutputs((prev) => [...prev, { name: data.name || "Roadmap", type: "Roadmap" }]);
		setActiveView("roadmap");
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
		<div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-950" : "bg-[#F7FBFF]"}`}>
			<WorkspaceHeader
				settingsMenu={settingsMenu}
				isDarkMode={isDarkMode}
				workspaceTitle={currentWorkspace?.title}
				workspaceSubtitle={currentWorkspace?.topic?.title || currentWorkspace?.subject?.title}
			/>
			<div className="flex-1 min-h-[calc(100vh-64px)]">
				<div className="max-w-[1740px] mx-auto px-4 py-4 h-full">
					<div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-4 h-[calc(100vh-64px-32px)]">
						<SourcesPanel
							isDarkMode={isDarkMode}
							sources={sources}
							onAddSource={() => setUploadDialogOpen(true)}
							onRemoveSource={handleRemoveSource}
						/>
						<ChatPanel
							isDarkMode={isDarkMode}
							sources={sources}
							activeView={activeView}
							onUploadClick={() => setUploadDialogOpen(true)}
						/>
						<StudioPanel
							isDarkMode={isDarkMode}
							onAction={handleStudioAction}
							outputs={outputs}
						/>
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

			{/* Dialog tạo Quiz */}
			<CreateQuizDialog
				open={quizDialogOpen}
				onOpenChange={setQuizDialogOpen}
				isDarkMode={isDarkMode}
				onCreateQuiz={handleCreateQuiz}
			/>

			{/* Dialog tạo Flashcard */}
			<CreateFlashcardDialog
				open={flashcardDialogOpen}
				onOpenChange={setFlashcardDialogOpen}
				isDarkMode={isDarkMode}
				onCreateFlashcard={handleCreateFlashcard}
			/>

			{/* Dialog tạo Roadmap */}
			<CreateRoadmapDialog
				open={roadmapDialogOpen}
				onOpenChange={setRoadmapDialogOpen}
				isDarkMode={isDarkMode}
				onCreateRoadmap={handleCreateRoadmap}
			/>
		</div>
	);
}

export default WorkspacePage;
