import React from "react";
import { UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";

function ChatPanel({ isDarkMode = false }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  return (
    <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
    }`}>
      <div className={`px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.chat.title")}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isDarkMode ? "bg-blue-950/50" : "bg-blue-100"
        }`}>
          <UploadCloud className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
        </div>
        <p className={`text-lg font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
          {t("workspace.chat.emptyTitle")}
        </p>
        <button className={`rounded-full border px-5 py-2 text-sm transition-colors duration-300 ${
          isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-gray-200 text-gray-700"
        }`}>
          <span className={fontClass}>{t("workspace.chat.upload")}</span>
        </button>
      </div>

      <div className={`p-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className={`flex items-center gap-3 border rounded-2xl px-4 py-2 ${
          isDarkMode ? "border-slate-700 bg-slate-950" : "border-gray-200"
        }`}>
          <input
            className={`flex-1 bg-transparent outline-none text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}
            placeholder={t("workspace.chat.placeholder")}
          />
          <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>{t("workspace.chat.sources")}</span>
        </div>
      </div>
    </section>
  );
}

export default ChatPanel;
