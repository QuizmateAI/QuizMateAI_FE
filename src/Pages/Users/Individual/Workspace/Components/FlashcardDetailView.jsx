import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit3,
  Loader2,
  Plus,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import DirectFeedbackButton from "@/Components/feedback/DirectFeedbackButton";
import {
  addFlashcardItem,
  deleteFlashcardItem,
  getFlashcardDetail,
  updateFlashcardItem,
  updateFlashcardSetName,
  updateFlashcardSetStatus,
} from "@/api/FlashcardAPI";

function FlashcardDetailView({ flashcard, onBack, hideEditButton, contextType }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [slideDir, setSlideDir] = useState("");

  const fetchDetail = useCallback(async () => {
    if (!flashcard?.flashcardSetId) return;
    setLoading(true);
    try {
      const res = await getFlashcardDetail(flashcard.flashcardSetId);
      const data = res?.data || {};
      setDetail(data);
      setItems(data.items || []);
      setActiveIndex(0);
      setFlipped(false);
    } finally {
      setLoading(false);
    }
  }, [flashcard?.flashcardSetId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const activeItem = useMemo(() => items[activeIndex] || null, [activeIndex, items]);
  const inputCls = "w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-400 dark:focus:border-emerald-500";

  const handleRename = async () => {
    if (!detail || !newName.trim()) return;
    setRenameSaving(true);
    try {
      const response = await updateFlashcardSetName(detail.flashcardSetId, newName.trim());
      const updatedName = response?.data?.flashcardSetName || newName.trim();
      setDetail((prev) => ({ ...prev, flashcardSetName: updatedName }));
      setIsRenaming(false);
    } finally {
      setRenameSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!detail) return;
    setStatusSaving(true);
    const nextStatus = detail.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    try {
      const response = await updateFlashcardSetStatus(detail.flashcardSetId, nextStatus);
      setDetail((prev) => ({ ...prev, status: response?.data?.status || nextStatus }));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!detail || !newFront.trim() || !newBack.trim()) return;
    setAddingSaving(true);
    try {
      const response = await addFlashcardItem(detail.flashcardSetId, {
        frontContent: newFront.trim(),
        backContent: newBack.trim(),
      });
      const item = response?.data || {};
      setItems((prev) => [...prev, item]);
      setActiveIndex(items.length);
      setFlipped(false);
      setNewFront("");
      setNewBack("");
      setShowAddForm(false);
    } finally {
      setAddingSaving(false);
    }
  };

  const handleUpdateItem = async (itemId) => {
    if (!editFront.trim() || !editBack.trim()) return;
    setEditSaving(true);
    try {
      const response = await updateFlashcardItem(itemId, {
        frontContent: editFront.trim(),
        backContent: editBack.trim(),
      });
      const updated = response?.data || {};
      setItems((prev) =>
        prev.map((item) =>
          item.flashcardItemId === itemId
            ? {
                ...item,
                frontContent: updated.frontContent || editFront.trim(),
                backContent: updated.backContent || editBack.trim(),
              }
            : item,
        ),
      );
      setEditingItemId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    setDeletingItemId(itemId);
    try {
      await deleteFlashcardItem(itemId);
      setItems((prev) => prev.filter((item) => item.flashcardItemId !== itemId));
      setActiveIndex((prev) => Math.max(0, Math.min(prev, items.length - 2)));
    } finally {
      setDeletingItemId(null);
    }
  };

  if (loading) return <ListSpinner variant="section" />;

  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">{t("workspace.flashcard.error")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-5 sm:px-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <CreditCard className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
              {isRenaming ? (
                <div className="flex min-w-0 items-center gap-2">
                  <input value={newName} onChange={(event) => setNewName(event.target.value)} className={`${inputCls} !py-2`} autoFocus />
                  <button type="button" onClick={handleRename} className="text-emerald-600 dark:text-emerald-500">
                    {renameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setIsRenaming(false)} className="text-slate-400 dark:text-slate-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <p className={`truncate text-lg font-semibold text-slate-950 dark:text-white ${fontClass}`}>{detail.flashcardSetName}</p>
                  {!hideEditButton ? (
                    <button type="button" onClick={() => { setIsRenaming(true); setNewName(detail.flashcardSetName || ""); }} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300">
                      <Edit3 className="h-4 w-4" />
                    </button>
                  ) : null}
                </>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{items.length} {t("workspace.flashcard.items")}</span>
              <span>{t("workspace.flashcard.createVia")}: {detail.createVia}</span>
              <span>{t(`workspace.flashcard.status${detail.status}`)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DirectFeedbackButton
            targetType="FLASHCARD"
            targetId={detail.flashcardSetId}
            label={t("workspace.flashcard.feedback")}
            isDarkMode={false}
            className="h-9 text-xs"
          />
          {!hideEditButton ? (
            <>
              <Button variant="outline" size="sm" onClick={handleToggleStatus} disabled={statusSaving} className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                {statusSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : detail.status === "ACTIVE" ? (
                  <ToggleRight className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                ) : (
                  <ToggleLeft className="mr-2 h-4 w-4" />
                )}
                {detail.status === "ACTIVE" ? t("workspace.flashcard.deactivate") : t("workspace.flashcard.activate")}
              </Button>
              <Button size="sm" onClick={() => setShowAddForm(true)} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                {t("workspace.flashcard.addItem")}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex w-full max-w-3xl shrink-0 flex-col items-center self-center">
        <div className="mb-6 flex min-h-[360px] w-full items-center justify-center [perspective:1000px]">
          {activeItem ? (
            <div
              key={activeItem.flashcardItemId}
              className={`relative h-full w-full ${
                slideDir === "next" 
                  ? "animate-in fade-in slide-in-from-right-8 duration-200" 
                  : slideDir === "prev" 
                  ? "animate-in fade-in slide-in-from-left-8 duration-200" 
                  : "animate-in fade-in zoom-in-95 duration-200"
              }`}
            >
              <div
                className={`relative h-full w-full cursor-pointer transition-transform duration-300 [transform-style:preserve-3d] ${flipped ? '[transform:rotateX(180deg)]' : ''}`}
                onClick={() => setFlipped((prev) => !prev)}
              >
                <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm [backface-visibility:hidden]">
                  <p className="absolute left-6 top-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    {t("workspace.flashcard.frontContent")}
                  </p>
                  <p className={`text-center text-2xl font-semibold leading-relaxed text-slate-950 dark:text-white ${fontClass}`}>
                    {activeItem.frontContent}
                  </p>
                  <p className="absolute bottom-6 text-sm text-slate-400 dark:text-slate-500">
                    {t("workspace.flashcard.tapToFlip", "Click to flip this card")}
                  </p>
                </div>

                <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-[28px] border border-emerald-300 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-8 shadow-sm [backface-visibility:hidden] [transform:rotateX(180deg)]">
                  <p className="absolute left-6 top-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600/70 dark:text-emerald-500/70">
                    {t("workspace.flashcard.backContent")}
                  </p>
                  <p className={`text-center text-2xl font-semibold leading-relaxed text-emerald-950 dark:text-emerald-400 ${fontClass}`}>
                    {activeItem.backContent}
                  </p>
                  <p className="absolute bottom-6 text-sm text-emerald-600/70 dark:text-emerald-500/70">
                    {t("workspace.flashcard.tapToFlip", "Click to flip this card")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-[28px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("workspace.flashcard.noItems")}</p>
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="mb-10 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => {
                setSlideDir("prev");
                setActiveIndex((prev) => Math.max(0, prev - 1));
                setFlipped(false);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-900 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              disabled={activeIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className={`text-base font-medium text-slate-600 dark:text-slate-300 ${fontClass}`}>
              {activeIndex + 1} / {items.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setSlideDir("next");
                setActiveIndex((prev) => Math.min(items.length - 1, prev + 1));
                setFlipped(false);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-900 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              disabled={activeIndex >= items.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        {contextType === "GROUP" ? (
          <p className="mb-6 w-full text-center text-xs text-slate-400 dark:text-slate-500">
            {t("workspace.flashcard.assignComingSoon")}
          </p>
        ) : null}

        <div className="w-full border-t border-slate-200 dark:border-slate-800 pb-4 pt-8">
          <p className={`mb-6 text-lg font-semibold text-slate-950 dark:text-white ${fontClass}`}>
            {t("workspace.flashcard.itemsList", "Flashcards in this set")}
          </p>
          {showAddForm ? (
            <div className="mb-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <textarea value={newFront} onChange={(event) => setNewFront(event.target.value)} className={`${inputCls} min-h-[92px] resize-none`} placeholder={t("workspace.flashcard.frontContentPlaceholder")} />
                <textarea value={newBack} onChange={(event) => setNewBack(event.target.value)} className={`${inputCls} min-h-[92px] resize-none`} placeholder={t("workspace.flashcard.backContentPlaceholder")} />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  {t("workspace.flashcard.cancel")}
                </Button>
                <Button size="sm" onClick={handleAddItem} disabled={addingSaving || !newFront.trim() || !newBack.trim()} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                  {addingSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {t("workspace.flashcard.addItem")}
                </Button>
              </div>
            </div>
          ) : null}

          {!items.length ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <CreditCard className="mb-4 h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("workspace.flashcard.noItems")}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.map((item, index) => {
                const isEditing = editingItemId === item.flashcardItemId;
                return (
                  <div key={item.flashcardItemId} className="py-4" style={{ contentVisibility: "auto" }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        {t("workspace.flashcard.itemNumber", { number: index + 1 })}
                      </span>
                      {!hideEditButton && !isEditing ? (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { setEditingItemId(item.flashcardItemId); setEditFront(item.frontContent || ""); setEditBack(item.backContent || ""); }} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleDeleteItem(item.flashcardItemId)} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-500">
                            {deletingItemId === item.flashcardItemId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-3">
                        <textarea value={editFront} onChange={(event) => setEditFront(event.target.value)} className={`${inputCls} min-h-[84px] resize-none`} />
                        <textarea value={editBack} onChange={(event) => setEditBack(event.target.value)} className={`${inputCls} min-h-[84px] resize-none`} />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingItemId(null)} className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                            {t("workspace.flashcard.cancel")}
                          </Button>
                          <Button size="sm" onClick={() => handleUpdateItem(item.flashcardItemId)} disabled={editSaving} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                            {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {t("workspace.flashcard.save")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            {t("workspace.flashcard.frontContent")}
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{item.frontContent || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            {t("workspace.flashcard.backContent")}
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{item.backContent || "—"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlashcardDetailView;
