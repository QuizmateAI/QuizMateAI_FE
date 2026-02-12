import React, { useEffect, useRef, useState } from "react";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";
import { Globe, Moon, Settings, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";

function WorkspacePage() {
	const { t, i18n } = useTranslation();
	const { isDarkMode, toggleDarkMode } = useDarkMode();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const settingsRef = useRef(null);

	const currentLang = i18n.language;
	const fontClass = currentLang === "en" ? "font-poppins" : "font-sans";

	const toggleLanguage = () => {
		const newLang = currentLang === "vi" ? "en" : "vi";
		i18n.changeLanguage(newLang);
	};

	useEffect(() => {
		if (!isSettingsOpen) {
			return;
		}

		const handleClickOutside = (event) => {
			if (settingsRef.current && !settingsRef.current.contains(event.target)) {
				setIsSettingsOpen(false);
			}
		};

		// Logic nghiep vu: dong menu khi click ra ngoai.
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isSettingsOpen]);

	const settingsMenu = (
		<div ref={settingsRef} className="relative">
			<button
				type="button"
				onClick={() => setIsSettingsOpen((prev) => !prev)}
				className={`flex items-center gap-2 rounded-full h-9 px-4 text-sm border transition-colors duration-300 ${
					isDarkMode
						? "border-slate-700 text-slate-200 hover:bg-slate-900"
						: "border-gray-200 text-gray-700 hover:bg-gray-50"
				}`}
				aria-expanded={isSettingsOpen}
				aria-haspopup="menu"
			>
				<Settings className="w-4 h-4" />
				<span className={fontClass}>{t("common.settings")}</span>
			</button>

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
			<WorkspaceHeader settingsMenu={settingsMenu} isDarkMode={isDarkMode} />
			<div className="flex-1 min-h-[calc(100vh-64px)]">
				<div className="max-w-[1740px] mx-auto px-4 py-4 h-full">
					<div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-4 h-[calc(100vh-64px-32px)]">
						<SourcesPanel isDarkMode={isDarkMode} />
						<ChatPanel isDarkMode={isDarkMode} />
						<StudioPanel isDarkMode={isDarkMode} />
					</div>
				</div>
			</div>
		</div>
	);
}

export default WorkspacePage;
