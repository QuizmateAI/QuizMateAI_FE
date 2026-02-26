import React from "react";
import { ArrowLeft, FileText, Image, Film, Link2, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

// Helper lấy icon theo loại tài liệu
function getDetailIcon(type, className = "w-5 h-5") {
  const map = {
    pdf: <FileText className={`${className} text-red-500`} />,
    image: <Image className={`${className} text-green-500`} />,
    video: <Film className={`${className} text-purple-500`} />,
    url: <Link2 className={`${className} text-blue-500`} />,
  };
  return map[type] || <FileText className={`${className} text-gray-500`} />;
}

// Hiển thị chi tiết tài liệu inline trong khu vực học tập
function SourceDetailView({ isDarkMode = false, source, onBack }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  if (!source) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header với nút quay lại */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        {getDetailIcon(source.type)}
        <p className={`text-base font-medium truncate flex-1 ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
          {source.name}
        </p>
      </div>

      {/* Nội dung chi tiết */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Thông tin tài liệu */}
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${isDarkMode ? "border-slate-800 bg-slate-800/30" : "border-gray-200 bg-gray-50"}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? "bg-slate-800" : "bg-white border border-gray-200"}`}>
              {getDetailIcon(source.type, "w-6 h-6")}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className={`text-sm font-semibold truncate ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
                {source.name}
              </p>
              <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {source.type?.toUpperCase()} {source.size ? `• ${source.size}` : ""}
              </p>
            </div>
            <button className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}>
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Placeholder nội dung — TODO: Tích hợp API hiển thị nội dung thật */}
          <div className={`rounded-xl border p-10 text-center ${isDarkMode ? "border-slate-800 bg-slate-800/20" : "border-gray-200 bg-white"}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
              {getDetailIcon(source.type, "w-8 h-8")}
            </div>
            <p className={`text-sm font-medium mt-4 ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
              Xem trước tài liệu
            </p>
            <p className={`text-xs mt-1.5 max-w-sm mx-auto ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
              Nội dung chi tiết của tài liệu sẽ được hiển thị tại đây khi tích hợp API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SourceDetailView;