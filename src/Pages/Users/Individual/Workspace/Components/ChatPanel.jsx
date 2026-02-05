import React from "react";
import { UploadCloud } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

function ChatPanel() {
  const { language, fontClass } = useLanguage();

  const text = {
    title: { vi: "Cuộc trò chuyện", en: "Conversation" },
    emptyTitle: { vi: "Thêm một nguồn để bắt đầu", en: "Add a source to begin" },
    upload: { vi: "Tải nguồn lên", en: "Upload source" },
    placeholder: { vi: "Tải một nguồn lên để bắt đầu", en: "Upload a source to get started" },
    sources: { vi: "0 nguồn", en: "0 sources" },
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 h-full overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className={`text-base text-gray-800 ${fontClass}`}>{text.title[language]}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <UploadCloud className="w-6 h-6 text-blue-600" />
        </div>
        <p className={`text-lg text-gray-700 font-medium ${fontClass}`}>
          {text.emptyTitle[language]}
        </p>
        <button className="rounded-full border border-gray-200 px-5 py-2 text-sm text-gray-700">
          <span className={fontClass}>{text.upload[language]}</span>
        </button>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-2">
          <input
            className={`flex-1 bg-transparent outline-none text-sm text-gray-600 ${fontClass}`}
            placeholder={text.placeholder[language]}
          />
          <span className={`text-xs text-gray-400 ${fontClass}`}>{text.sources[language]}</span>
        </div>
      </div>
    </section>
  );
}

export default ChatPanel;
