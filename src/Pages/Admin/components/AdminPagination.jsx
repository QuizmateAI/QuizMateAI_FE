import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

function AdminPagination({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isDarkMode,
  hidePageSize = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  // Không hiển thị nếu không có dữ liệu
  if (totalElements === 0) return null;

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  return (
    <div className={`flex items-center justify-between mt-6 px-4 py-4 border-t ${fontClass} ${
      isDarkMode ? 'border-slate-800' : 'border-slate-200'
    }`}>
      {/* Thông tin hiển thị */}
      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
        Hiển thị {startItem} - {endItem} trong tổng số {totalElements}
      </div>

      {/* Controls phân trang */}
      <div className="flex items-center gap-2">
        {/* Nút Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className={`p-2 rounded-lg border transition-all ${
            currentPage === 0
              ? isDarkMode
                ? "border-slate-800 text-slate-600 cursor-not-allowed"
                : "border-gray-200 text-gray-400 cursor-not-allowed"
              : isDarkMode
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Hiển thị số trang */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
            // Chỉ hiển thị trang đầu, cuối và các trang gần current page
            const shouldShow =
              page === 0 ||
              page === totalPages - 1 ||
              (page >= currentPage - 1 && page <= currentPage + 1);

            const shouldShowEllipsis =
              (page === 1 && currentPage > 2) ||
              (page === totalPages - 2 && currentPage < totalPages - 3);

            if (shouldShowEllipsis) {
              return (
                <span
                  key={page}
                  className={`px-3 py-1 text-sm ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}
                >
                  ...
                </span>
              );
            }

            if (!shouldShow) return null;

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  page === currentPage
                    ? isDarkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-600 text-white"
                    : isDarkMode
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {page + 1}
              </button>
            );
          })}
        </div>

        {/* Nút Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className={`p-2 rounded-lg border transition-all ${
            currentPage >= totalPages - 1
              ? isDarkMode
                ? "border-slate-800 text-slate-600 cursor-not-allowed"
                : "border-gray-200 text-gray-400 cursor-not-allowed"
              : isDarkMode
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Page size selector */}
        {!hidePageSize && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={`ml-4 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-300"
                : "bg-white border-gray-300 text-gray-700"
            }`}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>
        )}
      </div>
    </div>
  );
}

export default AdminPagination;
