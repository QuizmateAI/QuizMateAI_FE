import React from "react";
import { Search, Plus, ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

function SourcesPanel() {
  const { language, fontClass } = useLanguage();

  const text = {
    title: { vi: "Nguồn", en: "Sources" },
    addSource: { vi: "Thêm nguồn", en: "Add source" },
    searchPlaceholder: { vi: "Tìm nguồn", en: "Search sources" },
    quickResearch: { vi: "Nghiên cứu nhanh", en: "Quick research" },
    emptyTitle: {
      vi: "Các nguồn đã lưu sẽ xuất hiện ở đây",
      en: "Saved sources will appear here",
    },
    emptyDesc: {
      vi: "Nhấp vào \"Thêm nguồn\" để thêm PDF, trang web, văn bản, video hoặc tệp âm thanh.",
      en: "Click \"Add source\" to add PDFs, webpages, text, video, or audio files.",
    },
  };

  return (
    <aside className="bg-white rounded-2xl border border-gray-200 h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className={`text-base text-gray-800 ${fontClass}`}>{text.title[language]}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            className={`bg-transparent outline-none text-sm text-gray-700 w-full ${fontClass}`}
            placeholder={text.searchPlaceholder[language]}
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium flex items-center gap-2 text-gray-700">
            <Plus className="w-3 h-3" />
            <span className={fontClass}>{text.addSource[language]}</span>
          </button>
          <button className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium flex items-center gap-2 text-gray-700">
            <span className={fontClass}>{text.quickResearch[language]}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="pt-12 text-center space-y-2">
          <p className={`text-sm text-gray-700 font-medium ${fontClass}`}>
            {text.emptyTitle[language]}
          </p>
          <p className={`text-xs text-gray-500 ${fontClass}`}>
            {text.emptyDesc[language]}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default SourcesPanel;
