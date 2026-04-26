import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ListSpinner from "@/components/ui/ListSpinner";
import DirectFeedbackButton from "@/components/feedback/DirectFeedbackButton";
import {
  addFlashcardItem,
  deleteFlashcardItem,
  getFlashcardDetail,
  setGroupFlashcardAudience,
  updateFlashcardItem,
  updateFlashcardSetName,
  updateFlashcardSetStatus,
} from "@/api/FlashcardAPI";
import { getGroupMembers } from "@/api/GroupAPI";
import { unwrapApiData } from "@/utils/apiResponse";

function FlashcardFace({
  accentClassName,
  content,
  fontClass,
  hint,
  hintClassName,
  label,
  labelClassName,
  textClassName,
}) {
  return (
    <div className={accentClassName}>
      <div className="grid h-full grid-rows-[auto_1fr_auto] gap-6">
        <p className={labelClassName}>{label}</p>
        <div className="flex min-h-0 items-center justify-center px-2 sm:px-6">
          <p className={`max-h-full overflow-y-auto whitespace-pre-wrap break-words text-center text-xl font-semibold leading-relaxed sm:text-2xl ${textClassName} ${fontClass}`}>
            {content}
          </p>
        </div>
        <p className={hintClassName}>{hint}</p>
      </div>
    </div>
  );
}

function FlashcardDetailView({
  isDarkMode = false,
  flashcard,
  onBack,
  hideEditButton,
  contextType,
  contextId = null,
  isGroupLeader = false,
  groupAudiencePickerExcludeUserId = null,
}) {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const normalizedContextType = String(contextType || "").toUpperCase();
  const isGroupContext = normalizedContextType === "GROUP";
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
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [audienceSaving, setAudienceSaving] = useState(false);
  const [audienceMode, setAudienceMode] = useState("ALL_MEMBERS");
  const [selectedAudienceUserIds, setSelectedAudienceUserIds] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const invalidateFlashcardList = useCallback(async () => {
    const normalizedContextId = Number(contextId) || 0;
    if (!normalizedContextType || normalizedContextId <= 0) return;
    await queryClient.invalidateQueries({
      queryKey: ["workspace-flashcards", normalizedContextType, normalizedContextId],
    });
  }, [contextId, normalizedContextType, queryClient]);

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
  const detailStatus = String(detail?.status || flashcard?.status || "").toUpperCase();
  const canMutateContent = !hideEditButton && detailStatus === "ACTIVE";
  const canManageGroupPublishing = isGroupContext && isGroupLeader && detailStatus === "DRAFT";
  const canManageGroupAudience = isGroupContext && isGroupLeader && detailStatus === "ACTIVE";
  const resolvedAudienceLabel = detail?.groupAudienceMode === "SELECTED_MEMBERS"
    ? t("workspace.flashcard.audience.selectedMembers", "Chỉ thành viên được chọn")
    : t("workspace.flashcard.audience.allMembers", "Cả nhóm");

  const handleRename = async () => {
    if (!detail || !newName.trim()) return;
    setRenameSaving(true);
    try {
      const response = await updateFlashcardSetName(detail.flashcardSetId, newName.trim());
      const updatedName = response?.data?.flashcardSetName || newName.trim();
      setDetail((prev) => ({ ...prev, flashcardSetName: updatedName }));
      setIsRenaming(false);
      await invalidateFlashcardList();
    } finally {
      setRenameSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!detail) return;
    const nextStatus = detail.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    const confirmed = window.confirm(
      isGroupContext
        ? (
          nextStatus === "ACTIVE"
            ? t("workspace.flashcard.publishConfirm", "Xuất bản bộ flashcard này cho nhóm?")
            : t("workspace.flashcard.setDraftConfirm", "Đưa bộ flashcard này về bản nháp?")
        )
        : (
          nextStatus === "ACTIVE"
            ? t("workspace.flashcard.activateConfirm", "Kích hoạt bộ flashcard này?")
            : t("workspace.flashcard.deactivateConfirm", "Đưa bộ flashcard này về bản nháp?")
        ),
    );
    if (!confirmed) return;

    setStatusSaving(true);
    try {
      const response = await updateFlashcardSetStatus(detail.flashcardSetId, nextStatus);
      const nextDetail = response?.data || {};
      setDetail((prev) => ({ ...prev, ...nextDetail, status: nextDetail?.status || nextStatus }));
      await invalidateFlashcardList();
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
      await invalidateFlashcardList();
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
      await invalidateFlashcardList();
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
      await invalidateFlashcardList();
    } finally {
      setDeletingItemId(null);
    }
  };

  const openAudienceDialog = useCallback(() => {
    const excludeUid = Number(groupAudiencePickerExcludeUserId);
    const rawIds = Array.isArray(detail?.assignedUserIds)
      ? detail.assignedUserIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    setAudienceMode(detail?.groupAudienceMode === "SELECTED_MEMBERS" ? "SELECTED_MEMBERS" : "ALL_MEMBERS");
    setSelectedAudienceUserIds(
      Number.isInteger(excludeUid) && excludeUid > 0
        ? rawIds.filter((id) => id !== excludeUid)
        : rawIds,
    );
    setAudienceOpen(true);
  }, [detail?.assignedUserIds, detail?.groupAudienceMode, groupAudiencePickerExcludeUserId]);

  useEffect(() => {
    if (!audienceOpen || !isGroupContext || !contextId) return undefined;
    let cancelled = false;

    (async () => {
      setMembersLoading(true);
      try {
        const response = await getGroupMembers(contextId, 0, 200);
        const raw = unwrapApiData(response);
        const list = raw?.content || raw?.data || (Array.isArray(raw) ? raw : []);
        const excludeUid = Number(groupAudiencePickerExcludeUserId);
        const filtered = Array.isArray(list)
          ? list.filter((member) => {
              if (!Number.isInteger(excludeUid) || excludeUid <= 0) return true;
              const memberId = Number(member.userId ?? member.id ?? member.groupMemberId);
              return !Number.isInteger(memberId) || memberId !== excludeUid;
            })
          : [];
        if (!cancelled) setGroupMembers(filtered);
      } catch (error) {
        console.error(error);
        if (!cancelled) setGroupMembers([]);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audienceOpen, contextId, groupAudiencePickerExcludeUserId, isGroupContext]);

  const toggleAudienceMember = useCallback((userId) => {
    setSelectedAudienceUserIds((prev) => (
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    ));
  }, []);

  const handleSaveAudience = useCallback(async () => {
    if (!detail?.flashcardSetId) return;
    if (audienceMode === "SELECTED_MEMBERS" && selectedAudienceUserIds.length === 0) {
      window.alert(t("workspace.flashcard.audience.selectMemberRequired", "Chọn ít nhất một thành viên."));
      return;
    }

    setAudienceSaving(true);
    try {
      const body = audienceMode === "ALL_MEMBERS"
        ? { mode: "ALL_MEMBERS" }
        : { mode: "SELECTED_MEMBERS", assigneeUserIds: selectedAudienceUserIds };
      const response = await setGroupFlashcardAudience(detail.flashcardSetId, body);
      const nextDetail = response?.data || {};
      setDetail((prev) => ({ ...prev, ...nextDetail }));
      await invalidateFlashcardList();
      setAudienceOpen(false);
    } catch (error) {
      console.error(error);
      window.alert(
        error?.response?.data?.message
        || error?.message
        || t("workspace.flashcard.audience.saveFailed", "Không thể lưu phân phối flashcard."),
      );
    } finally {
      setAudienceSaving(false);
    }
  }, [audienceMode, detail?.flashcardSetId, invalidateFlashcardList, selectedAudienceUserIds, t]);

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
                  <p className={`truncate text-lg font-semibold text-slate-950 dark:text-white ${fontClass}`}>{(detail.flashcardSetName && detail.flashcardSetName.trim()) || t("workspace.flashcard.untitled", "Flashcard không có tiêu đề")}</p>
                  {canMutateContent ? (
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
              {isGroupContext ? <span>{resolvedAudienceLabel}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DirectFeedbackButton
            targetType="FLASHCARD"
            targetId={detail.flashcardSetId}
            label={t("workspace.flashcard.feedback")}
            isDarkMode={isDarkMode}
            className="h-9 text-xs"
          />
          {canMutateContent || canManageGroupPublishing || canManageGroupAudience ? (
            <>
              {isGroupContext ? (
                canManageGroupPublishing ? (
                  <>
                    {/* Chỉ hiện nút Publish khi đang DRAFT. Đã ACTIVE thì chuyển sang flip view. */}
                    {detailStatus !== "ACTIVE" ? (
                      <Button
                        size="sm"
                        onClick={handleToggleStatus}
                        disabled={statusSaving}
                        className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {statusSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ToggleLeft className="mr-2 h-4 w-4" />
                        )}
                        {t("workspace.flashcard.publish", "Publish")}
                      </Button>
                    ) : null}
                  </>
                ) : null
              ) : detailStatus === "DRAFT" ? (
                /* Individual: chỉ hiện nút Kích hoạt khi đang DRAFT. Đã ACTIVE thì ẩn — không cho về DRAFT. */
                detailStatus !== "ACTIVE" ? (
                  <Button
                    size="sm"
                    onClick={handleToggleStatus}
                    disabled={statusSaving}
                    className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {statusSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ToggleLeft className="mr-2 h-4 w-4" />
                    )}
                    {t("workspace.flashcard.activate")}
                  </Button>
                ) : null
              ) : null}
              {canManageGroupAudience ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAudienceDialog}
                  className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {t("workspace.flashcard.distribution", "Distribution")}
                </Button>
              ) : null}
              {canMutateContent ? (
                <Button size="sm" onClick={() => setShowAddForm(true)} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("workspace.flashcard.addItem")}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex w-full max-w-3xl shrink-0 flex-col items-center self-center">
        <div className="mb-6 flex h-[320px] w-full items-center justify-center sm:h-[360px] lg:h-[400px] [perspective:1000px]">
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
                <FlashcardFace
                  accentClassName="absolute inset-0 h-full w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm [backface-visibility:hidden] dark:border-slate-800 dark:bg-slate-900 sm:p-8"
                  content={activeItem.frontContent}
                  fontClass={fontClass}
                  hint={t("workspace.flashcard.tapToFlip", "Click to flip this card")}
                  hintClassName="text-center text-sm text-slate-400 dark:text-slate-500"
                  label={t("workspace.flashcard.frontContent")}
                  labelClassName="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500"
                  textClassName="text-slate-950 dark:text-white"
                />

                <FlashcardFace
                  accentClassName="absolute inset-0 h-full w-full overflow-hidden rounded-[28px] border border-emerald-300 bg-emerald-50 p-6 shadow-sm [backface-visibility:hidden] [transform:rotateX(180deg)] dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-8"
                  content={activeItem.backContent}
                  fontClass={fontClass}
                  hint={t("workspace.flashcard.tapToFlip", "Click to flip this card")}
                  hintClassName="text-center text-sm text-emerald-600/70 dark:text-emerald-500/70"
                  label={t("workspace.flashcard.backContent")}
                  labelClassName="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600/70 dark:text-emerald-500/70"
                  textClassName="text-emerald-950 dark:text-emerald-400"
                />
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
                      {canMutateContent && !isEditing ? (
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

      <Dialog open={audienceOpen} onOpenChange={setAudienceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("workspace.flashcard.distribution", "Distribution")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAudienceMode("ALL_MEMBERS")}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                  audienceMode === "ALL_MEMBERS"
                    ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {t("workspace.flashcard.audience.allMembers", "Cả nhóm")}
              </button>
              <button
                type="button"
                onClick={() => setAudienceMode("SELECTED_MEMBERS")}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                  audienceMode === "SELECTED_MEMBERS"
                    ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-950/30 dark:text-violet-200"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {t("workspace.flashcard.audience.selectedMembers", "Chỉ thành viên được chọn")}
              </button>
            </div>

            {audienceMode === "SELECTED_MEMBERS" ? (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-950/40">
                {membersLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : groupMembers.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {t("workspace.flashcard.audience.noMembers", "Không có thành viên khả dụng.")}
                  </p>
                ) : (
                  groupMembers.map((member) => {
                    const memberId = Number(member.userId ?? member.id);
                    if (!Number.isInteger(memberId) || memberId <= 0) return null;

                    return (
                      <label
                        key={memberId}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white dark:hover:bg-slate-800"
                      >
                        <Checkbox
                          checked={selectedAudienceUserIds.includes(memberId)}
                          onCheckedChange={() => toggleAudienceMember(memberId)}
                        />
                        <span className="text-slate-700 dark:text-slate-200">
                          {member.fullName || member.username || `User ${memberId}`}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAudienceOpen(false)}>
              {t("workspace.flashcard.cancel", "Hủy")}
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              disabled={audienceSaving}
              onClick={handleSaveAudience}
            >
              {audienceSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("workspace.flashcard.save", "Lưu")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FlashcardDetailView;
