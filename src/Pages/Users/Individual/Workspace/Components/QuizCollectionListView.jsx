import React, { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderOpen,
  Layers3,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HomeButton from "@/components/ui/HomeButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createQuizCollection, deleteQuizCollection, getQuizCollectionsByWorkspace } from "@/api/QuizCollectionAPI";
import { unwrapApiData, unwrapApiList } from "@/utils/apiResponse";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 12;

const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
};

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function normalizeCollectionList(response) {
  return unwrapApiList(response);
}

function resolveCollectionQuestionCount(collection) {
  const candidates = [
    collection?.totalQuestion,
    collection?.totalQuestions,
    collection?.totalQuestionCount,
    collection?.questionCount,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) return value;
  }

  return 0;
}

function QuizCollectionListView({
  isDarkMode = false,
  workspaceId,
  onNavigateHome,
  onViewCollection,
  onCollectionCreated,
  onCollectionDeleted,
  disableCreate = false,
  hideCreateButton = false,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const normalizedWorkspaceId = Number(workspaceId) || 0;
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const {
    data: collections = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["workspace-quiz-collections", normalizedWorkspaceId],
    enabled: normalizedWorkspaceId > 0,
    queryFn: async () => normalizeCollectionList(await getQuizCollectionsByWorkspace(normalizedWorkspaceId)),
  });

  const filteredCollections = useMemo(
    () =>
      collections.filter((collection) => {
        if (!deferredSearchQuery) return true;
        return [collection?.title, collection?.description].some((value) =>
          String(value || "").toLowerCase().includes(deferredSearchQuery),
        );
      }),
    [collections, deferredSearchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filteredCollections.length / ITEMS_PER_PAGE));
  const effectivePage = Math.min(page, totalPages);
  const pagedCollections = useMemo(() => {
    const start = (effectivePage - 1) * ITEMS_PER_PAGE;
    return filteredCollections.slice(start, start + ITEMS_PER_PAGE);
  }, [effectivePage, filteredCollections]);

  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";

  const handleCreate = async () => {
    const title = createTitle.trim();
    if (!title || creating || !normalizedWorkspaceId) return;
    setCreating(true);
    try {
      const response = await createQuizCollection({
        workspaceId: normalizedWorkspaceId,
        title,
        description: createDescription.trim(),
      });
      const created = unwrapApiData(response);
      showSuccess(t("workspace.quizCollection.createSuccess", "Đã tạo bộ sưu tập."));
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      await refetch();
      if (created?.collectionId) {
        onCollectionCreated?.(created);
        onViewCollection?.(created);
      }
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    const collectionId = Number(deleteTarget?.collectionId);
    if (!Number.isInteger(collectionId) || collectionId <= 0 || deletingId) return;
    setDeletingId(collectionId);
    try {
      await deleteQuizCollection(collectionId);
      showSuccess(t("workspace.quizCollection.deleteSuccess", "Đã xóa bộ sưu tập."));
      setDeleteTarget(null);
      await refetch();
      onCollectionDeleted?.(deleteTarget);
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col px-4 py-5 sm:px-5 lg:px-6", fontClass)}>
      <div className={cn(
        "flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:gap-3",
        isDarkMode ? "border-slate-700" : "border-slate-200",
      )}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {typeof onNavigateHome === "function" ? <HomeButton onClick={onNavigateHome} /> : null}
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
              placeholder={t("workspace.listView.searchPlaceholder", "Tìm kiếm...")}
              className={cn(
                "h-11 w-full rounded-full border py-3 pl-10 pr-10 text-sm outline-none transition-colors",
                isDarkMode
                  ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-blue-400"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400",
              )}
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
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          {!hideCreateButton ? (
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={disableCreate}
              className="h-11 rounded-full bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("workspace.quizCollection.create", "Tạo bộ sưu tập")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : collections.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <Archive className={cn("mb-3 h-12 w-12", isDarkMode ? "text-slate-600" : "text-slate-300")} />
            <p className={cn("text-sm", mutedTextClass)}>
              {t("workspace.quizCollection.empty", "Chưa có bộ sưu tập nào. Tạo một bộ để gom quiz và câu hỏi cần ôn.")}
            </p>
            {!hideCreateButton ? (
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                disabled={disableCreate}
                className="mt-4 h-10 rounded-full bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="text-sm">{t("workspace.quizCollection.create", "Tạo bộ sưu tập")}</span>
              </Button>
            ) : null}
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <FolderOpen className={cn("mb-3 h-10 w-10", isDarkMode ? "text-slate-600" : "text-slate-300")} />
            <p className={cn("text-sm", mutedTextClass)}>{t("workspace.listView.noResults", "Không có kết quả phù hợp.")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedCollections.map((collection) => {
                const collectionId = Number(collection?.collectionId);
                const normalizedStatus = String(collection?.status || "ACTIVE").toUpperCase();
                const statusStyles = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.ACTIVE;
                const statusLabel = t(`quizListView.status.${normalizedStatus}`, normalizedStatus || "ACTIVE");
                const questionCount = resolveCollectionQuestionCount(collection);
                const sourceQuizCount = Number(collection?.sourceQuizCount ?? 0) || 0;
                const createdAtLabel = formatShortDate(collection?.createdAt || collection?.updatedAt);

                return (
                  <article
                    key={collectionId || collection?.title}
                    role="button"
                    tabIndex={0}
                    onClick={() => onViewCollection?.(collection)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onViewCollection?.(collection);
                      }
                    }}
                    className={cn(
                      "group flex h-[204px] cursor-pointer flex-col rounded-[24px] border px-5 py-4 transition-all duration-200",
                      isDarkMode
                        ? "border-slate-800 bg-slate-900/80 shadow-[0_28px_72px_-34px_rgba(2,6,23,0.7)] hover:-translate-y-0.5 hover:border-slate-700"
                        : "border-slate-300/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_28px_72px_-34px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className={cn("line-clamp-2 min-h-[3.5rem] text-[21px] font-semibold leading-snug", isDarkMode ? "text-slate-100" : "text-slate-950")}>
                          {collection?.title || t("quizListView.cards.noTitle", "-")}
                        </h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn("h-8 w-8 rounded-full", isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100" : "text-slate-500 hover:bg-white hover:text-slate-900")}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={cn("w-48", isDarkMode && "border-slate-700 bg-slate-900 text-slate-100")}>
                            <DropdownMenuItem
                              disabled={deletingId === collectionId}
                              onSelect={() => {
                                if (deletingId) return;
                                setDeleteTarget(collection);
                              }}
                              className={cn("cursor-pointer", isDarkMode ? "text-red-300 focus:text-red-200" : "text-red-600 focus:text-red-600")}
                            >
                              {deletingId === collectionId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              <span>{t("workspace.quizCollection.delete", "Xóa bộ sưu tập")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className={cn("mt-4 flex items-center justify-between gap-3 text-[13px]", isDarkMode ? "text-slate-300" : "text-slate-800")}>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                          {t("quizListView.cards.questions", "Questions")}
                        </span>
                        <span className="font-semibold">{questionCount > 0 ? questionCount : "-"}</span>
                      </div>
                      <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", isDarkMode ? statusStyles.dark : statusStyles.light)}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className={cn("mt-auto flex items-end justify-between gap-3 border-t pt-3", isDarkMode ? "mt-4 border-slate-800" : "mt-4 border-slate-200/80")}>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", isDarkMode ? "text-blue-300" : "text-blue-700")}>
                          <Layers3 className="h-3.5 w-3.5" />
                          <span>{sourceQuizCount} {t("workspace.quizCollection.sourceShort", "quiz nguồn")}</span>
                        </div>
                      </div>
                      <div className={cn("flex flex-wrap items-center justify-end gap-2 text-xs font-semibold", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                        {createdAtLabel ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{createdAtLabel}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredCollections.length > ITEMS_PER_PAGE ? (
              <div className={cn("mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4", isDarkMode ? "border-slate-700" : "border-slate-200")}>
                <p className={cn("text-xs", mutedTextClass)}>
                  {t("workspace.listView.pagination.pageInfo", {
                    page: effectivePage,
                    totalPages,
                    count: filteredCollections.length,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-full px-3" disabled={effectivePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className={cn("text-xs font-medium", mutedTextClass)}>
                    {t("workspace.quiz.pagination.page", "Page")} {effectivePage}/{totalPages}
                  </span>
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-full px-3" disabled={effectivePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quizCollection.create", "Tạo bộ sưu tập")}</DialogTitle>
            <DialogDescription>
              {t("workspace.quizCollection.createDescription", "Gom quiz và câu hỏi thành một bộ luyện tập riêng.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">{t("workspace.quizCollection.title", "Tên bộ sưu tập")}</span>
              <input
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
                placeholder={t("workspace.quizCollection.titlePlaceholder", "Ví dụ: Ôn tập chương OOP")}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">{t("workspace.quizCollection.description", "Mô tả")}</span>
              <textarea
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                className="min-h-[92px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder={t("workspace.quizCollection.descriptionPlaceholder", "Ghi chú ngắn về mục tiêu ôn tập...")}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="button" onClick={handleCreate} disabled={creating || !createTitle.trim()} className="bg-blue-600 text-white hover:bg-blue-700">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("workspace.quizCollection.create", "Tạo bộ sưu tập")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quizCollection.delete", "Xóa bộ sưu tập")}</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block text-base font-semibold text-slate-900 dark:text-slate-100">
                {deleteTarget?.title}
              </span>
              <span className="block">
                {t("workspace.quizCollection.deleteConfirm", "Bộ sưu tập và quiz luyện tập phía sau sẽ được xóa khỏi danh sách.")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)}>
              {t("workspace.quiz.close", "Close")}
            </Button>
            <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={handleConfirmDelete} disabled={Boolean(deletingId)}>
              {deletingId ? t("workspace.quiz.actionButtons.deleting", "Deleting...") : t("workspace.quiz.actionButtons.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuizCollectionListView;
