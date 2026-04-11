import React, { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
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

function FlashcardListView({
  onCreateFlashcard,
  onNavigateHome,
  onViewFlashcard,
  onDeleteFlashcard,
  contextType = "WORKSPACE",
  contextId,
  disableCreate = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
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

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 sm:px-5 lg:px-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {typeof onNavigateHome === "function" ? (
            <HomeButton onClick={onNavigateHome} />
          ) : null}
          <div className="relative min-w-[220px] flex-1 sm:max-w-[420px] md:max-w-[460px] lg:max-w-[520px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                startTransition(() => setSearchQuery(event.target.value))
              }
              placeholder={t("workspace.listView.searchPlaceholder")}
              className="h-11 w-full rounded-full border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
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
          <Button
            disabled={disableCreate}
            onClick={onCreateFlashcard}
            className="h-11 rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("workspace.listView.create")}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !flashcards.length ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <CreditCard className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">{t("workspace.flashcard.noFlashcards")}</p>
            <Button
              disabled={disableCreate}
              onClick={onCreateFlashcard}
              className="mt-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("workspace.flashcard.createFirstFlashcard")}
            </Button>
          </div>
        ) : !filtered.length ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <FolderOpen className="mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filtered.map((flashcard) => (
              <article
                key={flashcard.flashcardSetId}
                onClick={() => onViewFlashcard?.(flashcard)}
                className="group flex cursor-pointer items-start gap-4 px-1 py-4 transition-colors hover:bg-slate-50/70"
                style={{ contentVisibility: "auto" }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`min-w-0 truncate text-sm font-semibold text-slate-900 ${fontClass}`}>
                      {flashcard.flashcardSetName}
                    </p>
                    <span className="text-xs font-medium text-slate-400">·</span>
                    <span className="text-xs text-slate-500">
                      {flashcard.itemCount ?? flashcard.items?.length ?? 0} {t("workspace.flashcard.cards")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("workspace.flashcard.createVia")}: {flashcard.createVia}
                  </p>
                </div>
                {onDeleteFlashcard ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteFlashcard(flashcard);
                    }}
                    className="rounded-xl p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                    title={t("workspace.flashcard.deleteSet")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardListView;
