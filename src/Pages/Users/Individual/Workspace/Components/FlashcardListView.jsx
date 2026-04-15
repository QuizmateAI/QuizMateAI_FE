import React, { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import HomeButton from "@/Components/ui/HomeButton";
import { getFlashcardsByScope, getFlashcardsByUser } from "@/api/FlashcardAPI";

const ITEMS_PER_PAGE = 6;

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function FlashcardListView({
  isDarkMode = false,
  onCreateFlashcard,
  onNavigateHome,
  onViewFlashcard,
  onDeleteFlashcard,
  contextType = "WORKSPACE",
  contextId,
  disableCreate = false,
  hideCreateButton = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

  const {
    data: flashcards = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["workspace-flashcards", contextType, Number(contextId) || 0],
    queryFn: async () => {
      const hasScope = !!contextType && Number(contextId) > 0;
      const response = hasScope
        ? await getFlashcardsByScope(contextType, Number(contextId))
        : await getFlashcardsByUser();
      return response?.data || [];
    },
  });

  const filtered = useMemo(
    () =>
      (flashcards || []).filter((item) =>
        deferredSearch
          ? String(item?.flashcardSetName || "").toLowerCase().includes(deferredSearch)
          : true,
      ),
    [deferredSearch, flashcards],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const effectivePage = Math.min(page, totalPages);

  const paginatedFlashcards = useMemo(() => {
    const start = (effectivePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [effectivePage, filtered]);

  const showPagination = filtered.length > ITEMS_PER_PAGE;
  const cardShellClass = isDarkMode
    ? "border-slate-700/70 bg-slate-900/55"
    : "border-slate-200 bg-white";
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const titleTextClass = isDarkMode ? "text-slate-100" : "text-slate-900";

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 sm:px-5 lg:px-6">
      <div
        className={`flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:gap-3 ${
          isDarkMode ? "border-slate-700" : "border-slate-200"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {typeof onNavigateHome === "function" ? (
            <HomeButton onClick={onNavigateHome} />
          ) : null}
          <div className="relative min-w-[220px] flex-1 sm:max-w-[420px] md:max-w-[460px] lg:max-w-[520px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                const { value } = event.target;
                startTransition(() => {
                  setSearchQuery(value);
                  setPage(1);
                });
              }}
              placeholder={t("workspace.listView.searchPlaceholder")}
              className={`h-11 w-full rounded-full border py-3 pl-10 pr-10 text-sm outline-none transition-colors ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-400"
              }`}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:ml-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-11 rounded-full border-slate-200 px-4"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {!hideCreateButton ? (
            <Button
              disabled={disableCreate}
              onClick={onCreateFlashcard}
              className="h-11 rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("workspace.listView.create")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !flashcards.length ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <CreditCard className={`mb-3 h-12 w-12 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`text-sm ${mutedTextClass}`}>{t("workspace.flashcard.noFlashcards")}</p>
            {!hideCreateButton ? (
              <Button
                disabled={disableCreate}
                onClick={onCreateFlashcard}
                className="mt-4 h-10 rounded-full bg-emerald-600 px-4 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="text-sm">{t("workspace.flashcard.createFirstFlashcard")}</span>
              </Button>
            ) : null}
          </div>
        ) : !filtered.length ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <FolderOpen className={`mb-3 h-10 w-10 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`text-sm ${mutedTextClass}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedFlashcards.map((flashcard) => (
                <article
                  key={flashcard.flashcardSetId}
                  onClick={() => onViewFlashcard?.(flashcard)}
                  className={`group flex cursor-pointer flex-col gap-4 rounded-[24px] border p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 ${cardShellClass}`}
                  style={{ contentVisibility: "auto" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                          isDarkMode
                            ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
                            : "border-amber-200 bg-amber-50 text-amber-600"
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className={`line-clamp-2 text-sm font-semibold ${fontClass} ${titleTextClass}`}>
                          {flashcard.flashcardSetName}
                        </p>
                        <p className={`mt-1 text-xs ${mutedTextClass}`}>
                          {t("workspace.flashcard.createVia")}: {flashcard.createVia || "AI"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isDarkMode
                          ? "bg-slate-800 text-slate-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {flashcard.itemCount ?? flashcard.items?.length ?? 0} {t("workspace.flashcard.cards")}
                    </span>
                  </div>

                  <div
                    className={`flex items-center justify-between gap-3 border-t pt-3 text-xs ${
                      isDarkMode ? "border-slate-700" : "border-slate-100"
                    }`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${mutedTextClass}`}>
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{formatShortDate(flashcard.updatedAt || flashcard.createdAt)}</span>
                    </div>

                    {onDeleteFlashcard ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteFlashcard(flashcard);
                        }}
                        className={`rounded-xl p-2 transition-all sm:opacity-0 sm:group-hover:opacity-100 ${
                          isDarkMode
                            ? "text-slate-400 hover:bg-rose-400/15 hover:text-rose-300"
                            : "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        }`}
                        title={t("workspace.flashcard.deleteSet")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {showPagination ? (
              <div
                className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${
                  isDarkMode ? "border-slate-700" : "border-slate-200"
                }`}
              >
                <p className={`text-xs ${mutedTextClass}`}>
                  {t("workspace.listView.pagination.pageInfo", {
                    page: effectivePage,
                    totalPages,
                    count: filtered.length,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full px-3"
                    disabled={effectivePage <= 1}
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    aria-label={t("workspace.listView.pagination.prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className={`text-xs font-medium ${mutedTextClass}`}>
                    {t("workspace.quiz.pagination.page")} {effectivePage}/{totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full px-3"
                    disabled={effectivePage >= totalPages}
                    onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                    aria-label={t("workspace.listView.pagination.next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default FlashcardListView;
