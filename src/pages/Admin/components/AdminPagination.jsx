import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const pages = new Set([0, totalPages - 1, currentPage]);
  if (currentPage > 0) pages.add(currentPage - 1);
  if (currentPage < totalPages - 1) pages.add(currentPage + 1);
  if (currentPage <= 2) {
    pages.add(1);
    pages.add(2);
  }
  if (currentPage >= totalPages - 3) {
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  return Array.from(pages)
    .filter((page) => page >= 0 && page < totalPages)
    .sort((a, b) => a - b)
    .reduce((items, page, index, sortedPages) => {
      if (index > 0 && page - sortedPages[index - 1] > 1) {
        items.push(`ellipsis-${sortedPages[index - 1]}-${page}`);
      }
      items.push(page);
      return items;
    }, []);
};

function AdminPagination({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isDarkMode,
  hidePageSize = false,
  isLoading = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  if (totalElements === 0) return null;

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);
  const canGoPrevious = currentPage > 0 && !isLoading;
  const canGoNext = currentPage < totalPages - 1 && !isLoading;
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const numberFormatter = new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "vi-VN");

  return (
    <div className={`flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${fontClass} ${
      isDarkMode ? 'border-slate-800' : 'border-slate-200'
    }`}>
      <div className={`text-sm tabular-nums ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        {t("common.paginationSummary", {
          start: numberFormatter.format(startItem),
          end: numberFormatter.format(endItem),
          total: numberFormatter.format(totalElements),
          defaultValue: "Showing {{start}} - {{end}} of {{total}}",
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label={t("common.previousPage", "Previous page")}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
            !canGoPrevious
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

        <div className="flex items-center gap-1">
          {visiblePages.map((page) => {
            if (typeof page === "string") {
              return (
                <span
                  key={page}
                  className={`inline-flex h-9 min-w-9 items-center justify-center px-2 text-sm ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                disabled={isLoading || page === currentPage}
                aria-current={page === currentPage ? "page" : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium tabular-nums transition-colors ${
                  page === currentPage
                    ? isDarkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-600 text-white"
                    : isDarkMode
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {numberFormatter.format(page + 1)}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label={t("common.nextPage", "Next page")}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
            !canGoNext
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

        {!hidePageSize && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={isLoading}
            aria-label={t("common.pageSize", "Page size")}
            className={`h-9 rounded-lg border px-3 text-sm transition-colors sm:ml-2 ${
              isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-300"
                : "bg-white border-gray-300 text-gray-700"
            }`}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {t("common.pageSizeOption", {
                  count: size,
                  defaultValue: "{{count}} / page",
                })}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export default AdminPagination;
