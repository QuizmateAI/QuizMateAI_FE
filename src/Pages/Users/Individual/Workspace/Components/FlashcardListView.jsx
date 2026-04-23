import React, { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FolderOpen,
  Loader2,
  MoreVertical,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import HomeButton from "@/Components/ui/HomeButton";
import { getFlashcardsByScope, getFlashcardsByUser } from "@/api/FlashcardAPI";

const DEFAULT_ITEMS_PER_PAGE = 8;
const PAGE_SIZE_OPTIONS = [8, 12, 16];
const CREATING_STATUSES = new Set(["PENDING", "PROCESSING", "GENERATING", "IN_PROGRESS", "QUEUED"]);
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
  PROCESSING: { light: "bg-sky-100 text-sky-700", dark: "bg-sky-950/50 text-sky-300" },
  ERROR: { light: "bg-rose-100 text-rose-700", dark: "bg-rose-950/50 text-rose-300" },
};

function isFlashcardCreating(item) {
  if (!item) return false;

  const status = String(item?.status || "").toUpperCase();
  const generationStatus = String(item?.generationStatus || item?.processingStatus || "").toUpperCase();
  const createVia = String(item?.createVia || "").toUpperCase();
  const hasNumericItemCount = Number.isFinite(Number(item?.itemCount));
  const itemCount = hasNumericItemCount ? Number(item?.itemCount) : null;

  if (CREATING_STATUSES.has(generationStatus) || CREATING_STATUSES.has(status)) {
    return true;
  }

  // Fallback for optimistic AI-created DRAFT records while generation is still in progress.
  if (status === "DRAFT" && createVia === "AI" && hasNumericItemCount) {
    return itemCount <= 0;
  }

  return false;
}

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
  onCreateManualFlashcard,
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
  const [pageSize, setPageSize] = useState(DEFAULT_ITEMS_PER_PAGE);
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
    refetchInterval: ({ state }) => {
      const currentData = state?.data;
      if (!Array.isArray(currentData) || currentData.length === 0) return false;
      return currentData.some((item) => isFlashcardCreating(item)) ? 5000 : false;
    },
    refetchIntervalInBackground: false,
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(page, totalPages);

  const paginatedFlashcards = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [effectivePage, filtered, pageSize]);

  const showPaginationFooter = filtered.length > 0;
  const showPageNavigation = filtered.length > pageSize;
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const renderCreateFlashcardAction = ({
    label = t("workspace.listView.create"),
    className = "h-11 rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700 disabled:opacity-50",
  } = {}) => {
    if (typeof onCreateManualFlashcard === "function") {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={disableCreate} className={className}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="text-sm">{label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={`w-56 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}`}
          >
            <DropdownMenuItem
              onSelect={() => onCreateFlashcard?.()}
              className="cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  {t("workspace.flashcard.createMenu.ai", "Create by AI")}
                </span>
                <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t("workspace.flashcard.createMenu.aiDesc", "Generate flashcards from materials")}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onCreateManualFlashcard?.()}
              className="cursor-pointer"
            >
              <PenLine className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  {t("workspace.flashcard.createMenu.manual", "Create manually")}
                </span>
                <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t("workspace.flashcard.createMenu.manualDesc", "Enter each card yourself")}
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button disabled={disableCreate} onClick={onCreateFlashcard} className={className}>
        <Plus className="mr-2 h-4 w-4" />
        <span className="text-sm">{label}</span>
      </Button>
    );
  };

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
            typeof onCreateManualFlashcard === "function" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={disableCreate}
                    className="h-11 rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("workspace.listView.create")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={`w-56 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}`}
                >
                  <DropdownMenuItem
                    onSelect={() => onCreateFlashcard?.()}
                    className="cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {t("workspace.flashcard.createMenu.ai", "Tạo bằng AI")}
                      </span>
                      <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {t("workspace.flashcard.createMenu.aiDesc", "Sinh flashcard từ tài liệu")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onCreateManualFlashcard?.()}
                    className="cursor-pointer"
                  >
                    <PenLine className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {t("workspace.flashcard.createMenu.manual", "Tạo thủ công")}
                      </span>
                      <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {t("workspace.flashcard.createMenu.manualDesc", "Nhập từng thẻ theo ý bạn")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                disabled={disableCreate}
                onClick={onCreateFlashcard}
                className="h-11 rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("workspace.listView.create")}
              </Button>
            )
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
              renderCreateFlashcardAction({
                label: t("workspace.flashcard.createFirstFlashcard"),
                className: "mt-4 h-10 rounded-full bg-emerald-600 px-4 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50",
              })
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
                (() => {
                  const resolvedFlashcardId = flashcard.flashcardSetId || flashcard.id || flashcard.flashcardId;
                  const normalizedStatus = isFlashcardCreating(flashcard)
                    ? "PROCESSING"
                    : String(flashcard?.status || "DRAFT").toUpperCase();
                  const statusStyles = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.DRAFT;
                  const statusLabel = t(`quizListView.status.${normalizedStatus}`, normalizedStatus);
                  const cardCount = Number(flashcard?.itemCount ?? flashcard?.items?.length ?? flashcard?.cardCount ?? 0) || 0;
                  const updatedAtLabel = formatShortDate(flashcard.updatedAt || flashcard.createdAt);

                  return (
                    <article
                      key={resolvedFlashcardId || flashcard.flashcardSetName}
                      role="button"
                      tabIndex={0}
                      onClick={() => onViewFlashcard?.(flashcard)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onViewFlashcard?.(flashcard);
                        }
                      }}
                      className={`group flex h-[204px] cursor-pointer flex-col rounded-[24px] border px-5 py-4 transition-all duration-200 ${
                        isDarkMode
                          ? "border-slate-800 bg-slate-900/80 shadow-[0_28px_72px_-34px_rgba(2,6,23,0.7)] hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_34px_86px_-34px_rgba(59,130,246,0.28)]"
                          : "border-slate-300/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_28px_72px_-34px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_36px_90px_-36px_rgba(37,99,235,0.28)]"
                      }`}
                      style={{ contentVisibility: "auto" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className={`line-clamp-2 min-h-[3.5rem] text-[21px] font-semibold leading-snug tracking-[-0.02em] ${fontClass} ${isDarkMode ? "text-slate-100" : "text-slate-950"}`}>
                            {(flashcard.flashcardSetName && flashcard.flashcardSetName.trim())
                              || t("workspace.flashcard.untitled", "Flashcard không có tiêu đề")}
                          </h3>
                        </div>

                        {onDeleteFlashcard ? (
                          <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(event) => event.stopPropagation()}
                                  className={`h-8 w-8 rounded-full ${
                                    isDarkMode
                                      ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                                      : "text-slate-500 hover:bg-white hover:text-slate-900"
                                  }`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className={`w-48 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}`}
                              >
                                <DropdownMenuItem
                                  onSelect={() => onDeleteFlashcard(flashcard)}
                                  className={`cursor-pointer ${isDarkMode ? "text-red-300 focus:text-red-200" : "text-red-600 focus:text-red-600"}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>{t("workspace.flashcard.deleteSet")}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : null}
                      </div>

                      <div className={`mt-4 flex items-center justify-between gap-3 text-[13px] ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {t("workspace.flashcard.cards")}
                          </span>
                          <span className="font-semibold">{cardCount > 0 ? cardCount : "-"}</span>
                        </div>
                        <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? statusStyles.dark : statusStyles.light}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className={`mt-auto flex items-start justify-between gap-3 border-t pt-3 ${isDarkMode ? "mt-4 border-slate-800" : "mt-4 border-slate-200/80"}`}>
                        <div className="flex min-w-0 flex-wrap items-center gap-3">
                          <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                            <BadgeCheck className="h-3.5 w-3.5" />
                            <span>{t("workspace.flashcard.quickReview", "Quick review")}</span>
                          </div>
                        </div>

                        <div className={`flex flex-wrap items-center justify-end gap-2 text-[11px] font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>{t("workspace.roadmap.canvas.flashcard", "Flashcard")}</span>
                          </span>
                          {updatedAtLabel ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Clock3 className="h-3.5 w-3.5" />
                              <span>{updatedAtLabel}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })()
              ))}
            </div>

            {showPaginationFooter ? (
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
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`text-xs font-medium ${mutedTextClass}`}>
                    {t("workspace.listView.pagination.pageSize", "Mỗi trang")}
                  </label>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    aria-label={t("workspace.listView.pagination.pageSize", "Mỗi trang")}
                    className={`h-9 rounded-full border px-3 text-xs font-medium outline-none transition-colors ${
                      isDarkMode
                        ? "border-slate-700 bg-slate-900 text-slate-200"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  {showPageNavigation ? (
                    <>
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
                    </>
                  ) : null}
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
