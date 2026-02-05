import React from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Mic2, Film, GitBranch, FileText, CreditCard, BadgeCheck } from "lucide-react";

function StudioPanel() {
  const { language, fontClass } = useLanguage();

  const text = {
    title: { vi: "Studio", en: "Studio" },
    emptyTitle: { vi: "Đầu ra của Studio sẽ được lưu ở đây.", en: "Studio outputs will be saved here." },
    emptyDesc: {
      vi: "Sau khi thêm nguồn, hãy chọn âm thanh, video, bản đồ tư duy hoặc báo cáo.",
      en: "After adding sources, choose audio, video, mind maps, or reports.",
    },
    addNote: { vi: "Thêm ghi chú", en: "Add note" },
  };

  const actions = [
    { icon: Mic2, vi: "Tổng quan bằng âm thanh", en: "Audio overview" },
    { icon: Film, vi: "Tổng quan bằng video", en: "Video overview" },
    { icon: GitBranch, vi: "Bản đồ tư duy", en: "Mind map" },
    { icon: FileText, vi: "Báo cáo", en: "Report" },
    { icon: CreditCard, vi: "Thẻ ghi nhớ", en: "Flashcards" },
    { icon: BadgeCheck, vi: "Bài kiểm tra", en: "Quiz" },
  ];

  return (
    <aside className="bg-white rounded-2xl border border-gray-200 h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className={`text-base text-gray-800 ${fontClass}`}>{text.title[language]}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.vi}
                className="rounded-xl bg-gray-100 px-3 py-3 text-left flex items-start gap-2"
              >
                <Icon className="w-4 h-4 text-gray-500 mt-0.5" />
                <span className={`text-xs text-gray-600 ${fontClass}`}>
                  {action[language]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-6 text-center space-y-2">
          <p className={`text-sm text-gray-700 font-medium ${fontClass}`}>
            {text.emptyTitle[language]}
          </p>
          <p className={`text-xs text-gray-500 ${fontClass}`}>
            {text.emptyDesc[language]}
          </p>
        </div>

        <button className="w-full rounded-full bg-black text-white text-sm font-medium py-2 flex items-center justify-center gap-2">
          <span className={fontClass}>{text.addNote[language]}</span>
        </button>
      </div>
    </aside>
  );
}

export default StudioPanel;
