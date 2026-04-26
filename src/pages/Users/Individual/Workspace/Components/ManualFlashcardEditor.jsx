import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft, BadgeCheck, Check, Cloud, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/context/ToastContext";
import {
  createManualFlashcardBulk,
  getFlashcardDetail,
  updateManualFlashcardBulk,
} from "@/api/FlashcardAPI";
import { unwrapApiData } from "@/utils/apiResponse";

const MAX_ITEMS = 200;
const MAX_FRONT_LENGTH = 4000;
const MAX_BACK_LENGTH = 4000;
const MAX_SET_NAME_LENGTH = 255;
const AUTOSAVE_DEBOUNCE_MS = 1500;

function makeLocalId() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyItem() {
  return {
    localId: makeLocalId(),
    flashcardItemId: null,
    frontContent: "",
    backContent: "",
  };
}

function normalizeLoadedItem(item) {
  return {
    localId: `existing-${item.flashcardItemId}`,
    flashcardItemId: item.flashcardItemId ?? null,
    frontContent: item.frontContent || "",
    backContent: item.backContent || "",
  };
}

/**
 * Bulk editor cho draft flashcard — Quizlet-style auto-save.
 *
 * UX:
 *  - User gõ → debounce 1.5s → auto-save bản nháp (silent).
 *  - Indicator "Đang lưu..." / "Đã lưu" ngay cạnh các nút hành động.
 *  - Nút "Lưu bản nháp": flush ngay (không chờ debounce).
 *  - Nút "Tạo flashcard": flush + kích hoạt ACTIVE atomically (BE accept activate=true).
 *  - Rời khỏi trang (Back / tab close): flush pending save trước khi navigate; cảnh báo nếu có thay đổi chưa lưu thành công.
 *
  * Chỉ áp dụng cho DRAFT (BE enforce trên updateBulk). Bản ACTIVE dùng detail view để học/lật thẻ.
 */
function ManualFlashcardEditor({
  isDarkMode = false,
  workspaceId,
  contextType = "INDIVIDUAL",
  contextId,
  editingSetId = null,
  canActivate = true,
  onCreated,
  onSaved,
  onActivated,
  onBack,
}) {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const isEditMode = Boolean(editingSetId);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | dirty | saving | saved | error
  const [setName, setSetName] = useState("");
  const [items, setItems] = useState([createEmptyItem()]);
  const scrollRef = useRef(null);
  const lastItemRef = useRef(null);

  // Refs cho auto-save không bám state stale.
  const currentSetIdRef = useRef(editingSetId ?? null);
  const setNameRef = useRef("");
  const itemsRef = useRef(items);
  const debounceTimerRef = useRef(null);
  const inflightSaveRef = useRef(null);

  useEffect(() => { setNameRef.current = setName; }, [setName]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { currentSetIdRef.current = editingSetId ?? null; }, [editingSetId]);

  const resolvedWorkspaceId = Number(workspaceId || contextId) || 0;

  // Load existing set (edit mode).
  useEffect(() => {
    if (!isEditMode) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const res = await getFlashcardDetail(editingSetId);
        const detail = unwrapApiData(res) || {};
        if (cancelled) return;
        setSetName(detail.flashcardSetName || "");
        const loadedItems = Array.isArray(detail.items) && detail.items.length > 0
          ? detail.items.map(normalizeLoadedItem)
          : [createEmptyItem()];
        setItems(loadedItems);
        setSaveState("idle");
      } catch (err) {
        if (cancelled) return;
        console.error("[ManualFlashcardEditor] load detail error", err);
        addToast?.({
          type: "error",
          message: t("workspace.flashcard.manualEditor.loadError", "Không thể tải bộ flashcard."),
        });
        onBack?.();
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [editingSetId, isEditMode, addToast, onBack, t]);

  const invalidateList = useCallback(async () => {
    const normalizedContextId = Number(contextId) || 0;
    if (!contextType || normalizedContextId <= 0) return;
    await queryClient.invalidateQueries({
      queryKey: ["workspace-flashcards", contextType, normalizedContextId],
    });
  }, [contextId, contextType, queryClient]);

  /** Có ít nhất 1 ký tự đã gõ ở bất kỳ field nào. */
  const hasAnyContent = useCallback(() => {
    if ((setNameRef.current || "").trim().length > 0) return true;
    return (itemsRef.current || []).some(
      (it) => (it.frontContent && it.frontContent.trim().length > 0)
        || (it.backContent && it.backContent.trim().length > 0),
    );
  }, []);

  /** Items gửi lên BE: chỉ items đã đủ front + back. */
  const buildPayloadItems = useCallback(() => {
    return (itemsRef.current || [])
      .filter((it) => it.frontContent?.trim() && it.backContent?.trim())
      .map((item) => ({
        flashcardItemId: item.flashcardItemId ?? undefined,
        frontContent: item.frontContent.trim(),
        backContent: item.backContent.trim(),
      }));
  }, []);

  /**
   * Core save. activate=true → tạo/cập nhật + kích hoạt nguyên tử (BE check leader + items).
   * silent=true → không bật saving spinner toàn-view; chỉ update saveState indicator.
   */
  const performSave = useCallback(async ({ silent = true, activate = false } = {}) => {
    // Chờ in-flight save trước đó.
    if (inflightSaveRef.current) {
      try { await inflightSaveRef.current; } catch { /* noop */ }
    }

    const payload = {
      flashcardSetName: (setNameRef.current || "").trim(),
      items: buildPayloadItems(),
      activate,
    };

    if (!activate && !silent === false) {
      // skip: silent save cho auto / explicit save
    }

    setSaveState("saving");
    const promise = (async () => {
      if (currentSetIdRef.current) {
        const res = await updateManualFlashcardBulk(currentSetIdRef.current, payload);
        return unwrapApiData(res) || {};
      }
      if (!resolvedWorkspaceId) {
        throw new Error("WORKSPACE_MISSING");
      }
      const res = await createManualFlashcardBulk({
        workspaceId: resolvedWorkspaceId,
        roadmapId: undefined,
        phaseId: undefined,
        knowledgeId: undefined,
        ...payload,
      });
      const created = unwrapApiData(res) || {};
      if (created?.flashcardSetId) {
        currentSetIdRef.current = created.flashcardSetId;
      }
      return created;
    })();
    inflightSaveRef.current = promise;

    try {
      const saved = await promise;
      setSaveState("saved");
      await invalidateList();
      return saved;
    } catch (err) {
      setSaveState("error");
      console.error("[ManualFlashcardEditor] save error", err);
      if (!silent) {
        const msg = err?.message === "WORKSPACE_MISSING"
          ? t("workspace.flashcard.manualEditor.validation.workspaceMissing", "Thiếu thông tin workspace.")
          : (err?.response?.data?.message
            || err?.data?.message
            || err?.message
            || t("workspace.flashcard.manualEditor.toasts.saveError", "Có lỗi khi lưu bộ flashcard."));
        addToast?.({ type: "error", message: msg });
      }
      throw err;
    } finally {
      inflightSaveRef.current = null;
    }
  }, [addToast, buildPayloadItems, invalidateList, resolvedWorkspaceId, t]);

  /** Hủy debounce timer đang chờ (nếu có). */
  const cancelPendingAutoSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /** Schedule auto-save sau X ms im lặng; reset timer nếu gõ tiếp. */
  const scheduleAutoSave = useCallback(() => {
    if (!hasAnyContent()) return;
    cancelPendingAutoSave();
    setSaveState("dirty");
    debounceTimerRef.current = setTimeout(async () => {
      debounceTimerRef.current = null;
      try {
        await performSave({ silent: true, activate: false });
      } catch { /* silent error đã set saveState=error */ }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [cancelPendingAutoSave, hasAnyContent, performSave]);

  // Cleanup debounce khi unmount — flush save cuối nếu còn dirty.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        if (hasAnyContent()) {
          // Fire-and-forget: không await vì React cleanup không async.
          performSave({ silent: true, activate: false }).catch(() => { /* noop */ });
        }
      }
    };
  }, [hasAnyContent, performSave]);

  // Cảnh báo native khi đóng tab với thay đổi chưa lưu.
  useEffect(() => {
    const handler = (event) => {
      if (saveState === "dirty" || saveState === "error" || debounceTimerRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  const handleSetNameChange = useCallback((value) => {
    setSetName(value);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleItemChange = useCallback((localId, field, value) => {
    setItems((prev) => prev.map((item) =>
      item.localId === localId ? { ...item, [field]: value } : item,
    ));
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleAddItem = useCallback(() => {
    setItems((prev) => {
      if (prev.length >= MAX_ITEMS) return prev;
      return [...prev, createEmptyItem()];
    });
    setTimeout(() => {
      lastItemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    // Chưa cần trigger auto-save vì chưa có content mới — scheduleAutoSave sẽ fire khi user gõ.
  }, []);

  const handleRemoveItem = useCallback((localId) => {
    setItems((prev) => {
      if (prev.length <= 1) return [createEmptyItem()];
      return prev.filter((item) => item.localId !== localId);
    });
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  /** Manual Save Draft: flush pending, save ngay (với toast). */
  const handleManualSaveDraft = useCallback(async () => {
    cancelPendingAutoSave();
    setSaving(true);
    try {
      const wasCreate = !currentSetIdRef.current;
      const saved = await performSave({ silent: false, activate: false });
      if (saved) {
        const displayName = (saved.flashcardSetName && saved.flashcardSetName.trim())
          || t("workspace.flashcard.untitled", "Flashcard không có tiêu đề");
        addToast?.({
          type: "success",
          message: wasCreate
            ? t("workspace.flashcard.manualEditor.toasts.saveCreateSuccess", {
                name: displayName,
                defaultValue: `Đã tạo bộ flashcard "${displayName}" ở trạng thái bản nháp.`,
              })
            : t("workspace.flashcard.manualEditor.toasts.saveUpdateSuccess", {
                name: displayName,
                defaultValue: `Đã lưu bộ flashcard "${displayName}".`,
              }),
        });
        if (wasCreate) onCreated?.(saved);
        else onSaved?.(saved);
      }
    } catch { /* saveState=error, toast đã hiển thị */ } finally {
      setSaving(false);
    }
  }, [addToast, cancelPendingAutoSave, onCreated, onSaved, performSave, t]);

  const activateValidationError = useMemo(() => {
    if ((setName || "").length > MAX_SET_NAME_LENGTH) {
      return t("workspace.flashcard.manualEditor.validation.nameTooLong", {
        max: MAX_SET_NAME_LENGTH,
        defaultValue: `Tên bộ flashcard tối đa ${MAX_SET_NAME_LENGTH} ký tự.`,
      });
    }
    const completeItems = items.filter((it) => it.frontContent.trim() && it.backContent.trim());
    if (completeItems.length === 0) {
      return t("workspace.flashcard.manualEditor.validation.itemsRequiredForActivate", "Bộ flashcard phải có ít nhất 1 thẻ đã điền đủ mặt trước và mặt sau.");
    }
    for (let idx = 0; idx < items.length; idx += 1) {
      const item = items[idx];
      if (item.frontContent.length > MAX_FRONT_LENGTH || item.backContent.length > MAX_BACK_LENGTH) {
        return t("workspace.flashcard.manualEditor.validation.itemTooLong", {
          number: idx + 1,
          defaultValue: `Thẻ ${idx + 1} vượt quá giới hạn ký tự.`,
        });
      }
    }
    return null;
  }, [items, setName, t]);

  /** Tạo flashcard (activate). Atomic: BE accept activate=true ở bulk endpoint. */
  const handleActivate = useCallback(async () => {
    if (activateValidationError) {
      addToast?.({ type: "error", message: activateValidationError });
      return;
    }
    cancelPendingAutoSave();
    setActivating(true);
    try {
      const saved = await performSave({ silent: false, activate: true });
      if (saved) {
        const activatedSet = {
          ...saved,
          status: "ACTIVE",
        };
        const displayName = (saved.flashcardSetName && saved.flashcardSetName.trim())
          || t("workspace.flashcard.untitled", "Flashcard không có tiêu đề");
        addToast?.({
          type: "success",
          message: t("workspace.flashcard.manualEditor.toasts.activateSuccess", {
              name: displayName,
              defaultValue: `Đã kích hoạt bộ flashcard "${displayName}".`,
            }),
          });
        onActivated?.(activatedSet);
      }
    } catch { /* toast đã hiển thị */ } finally {
      setActivating(false);
    }
  }, [activateValidationError, addToast, cancelPendingAutoSave, onActivated, performSave, t]);

  /** Back: flush pending trước khi navigate. */
  const handleBack = useCallback(async () => {
    if (saving || activating) return;
    if (debounceTimerRef.current) {
      // Flush pending auto-save.
      cancelPendingAutoSave();
      if (hasAnyContent()) {
        setSaving(true);
        try {
          await performSave({ silent: true, activate: false });
        } catch {
          const proceed = window.confirm(
            t("workspace.flashcard.manualEditor.backWithUnsavedConfirm", "Có lỗi khi lưu bản nháp. Rời khỏi trang vẫn?"),
          );
          if (!proceed) {
            setSaving(false);
            return;
          }
        } finally {
          setSaving(false);
        }
      }
    } else if (saveState === "error") {
      // Previous save error + user clicks back.
      const proceed = window.confirm(
        t("workspace.flashcard.manualEditor.backWithUnsavedConfirm", "Có lỗi khi lưu bản nháp. Rời khỏi trang vẫn?"),
      );
      if (!proceed) return;
    }
    onBack?.();
  }, [activating, cancelPendingAutoSave, hasAnyContent, onBack, performSave, saveState, saving, t]);

  if (initialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className={`h-7 w-7 animate-spin ${isDarkMode ? "text-emerald-300" : "text-emerald-500"}`} />
      </div>
    );
  }

  const title = isEditMode
    ? t("workspace.flashcard.manualEditor.editTitle", "Chỉnh sửa bộ flashcard")
    : t("workspace.flashcard.manualEditor.createTitle", "Tạo bộ flashcard");
  const description = isEditMode
    ? t("workspace.flashcard.manualEditor.editDescription", "Tự động lưu bản nháp khi bạn gõ. Nhấn Tạo flashcard để kích hoạt.")
    : t("workspace.flashcard.manualEditor.createDescription", "Tự động lưu bản nháp khi bạn gõ. Nhấn Tạo flashcard để kích hoạt.");

  const saveIndicator = (() => {
    switch (saveState) {
      case "saving":
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          label: t("workspace.flashcard.manualEditor.indicator.saving", "Đang lưu..."),
          colorCls: isDarkMode ? "text-slate-300" : "text-slate-500",
        };
      case "saved":
        return {
          icon: <Check className="h-3.5 w-3.5" />,
          label: t("workspace.flashcard.manualEditor.indicator.saved", "Đã lưu"),
          colorCls: isDarkMode ? "text-emerald-400" : "text-emerald-600",
        };
      case "dirty":
        return {
          icon: <Cloud className="h-3.5 w-3.5" />,
          label: t("workspace.flashcard.manualEditor.indicator.dirty", "Chưa lưu"),
          colorCls: isDarkMode ? "text-amber-300" : "text-amber-600",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          label: t("workspace.flashcard.manualEditor.indicator.error", "Lỗi khi lưu"),
          colorCls: isDarkMode ? "text-rose-400" : "text-rose-600",
        };
      default:
        return null;
    }
  })();

  const disableActions = saving || activating;

  return (
    <div className={`flex h-full flex-col ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
      {/* Header */}
      <div className={`shrink-0 flex h-12 items-center gap-3 border-b px-4 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
        <button
          type="button"
          onClick={handleBack}
          disabled={disableActions}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
          title={t("workspace.flashcard.manualEditor.back", "Quay lại")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className={`truncate text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{description}</p>
        </div>
        {saveIndicator ? (
          <div
            className={`hidden sm:flex items-center gap-1 text-[11px] font-medium ${saveIndicator.colorCls}`}
            aria-live="polite"
          >
            {saveIndicator.icon}
            <span>{saveIndicator.label}</span>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={handleManualSaveDraft}
          disabled={disableActions}
          className={`h-9 rounded-full px-4 ${isDarkMode ? "border-slate-600 text-slate-200 hover:bg-slate-800" : ""}`}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          <span className="text-sm font-semibold">
            {saving
              ? t("workspace.flashcard.manualEditor.saving", "Đang lưu...")
              : t("workspace.flashcard.manualEditor.save", "Lưu bản nháp")}
          </span>
        </Button>
        {canActivate ? (
          <Button
            type="button"
            onClick={handleActivate}
            disabled={disableActions}
            className={`h-9 rounded-full bg-emerald-600 px-4 text-white hover:bg-emerald-700 ${disableActions ? "opacity-60" : ""}`}
          >
            {activating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="mr-1.5 h-4 w-4" />
            )}
            <span className="text-sm font-semibold">
              {activating
                ? t("workspace.flashcard.manualEditor.activating", "Đang tạo...")
                : t("workspace.flashcard.manualEditor.activate", "Tạo flashcard")}
            </span>
          </Button>
        ) : null}
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {/* Set name */}
        <div className="mb-5">
          <label className={`mb-1.5 block text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {t("workspace.flashcard.manualEditor.setNameLabel", "Tên bộ flashcard")}
            <span className={`ml-1 text-[10px] font-normal ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              ({t("workspace.flashcard.manualEditor.setNameOptional", "không bắt buộc")})
            </span>
          </label>
          <input
            type="text"
            value={setName}
            onChange={(event) => handleSetNameChange(event.target.value)}
            maxLength={MAX_SET_NAME_LENGTH}
            placeholder={t("workspace.flashcard.manualEditor.setNamePlaceholder", "VD: Từ vựng chương 1")}
            className={`w-full rounded-2xl border px-4 py-2.5 text-sm outline-none transition-colors ${fontClass} ${
              isDarkMode
                ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400"
                : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-400"
            }`}
          />
        </div>

        {/* Items list */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.localId}
              ref={idx === items.length - 1 ? lastItemRef : null}
              className={`rounded-2xl border px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t("workspace.flashcard.manualEditor.itemNumber", { number: idx + 1, defaultValue: `Thẻ ${idx + 1}` })}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.localId)}
                  disabled={items.length <= 1}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
                    isDarkMode ? "text-rose-400 hover:bg-rose-950/40" : "text-rose-500 hover:bg-rose-50"
                  }`}
                  title={t("workspace.flashcard.manualEditor.removeItem", "Xóa thẻ")}
                  aria-label={t("workspace.flashcard.manualEditor.removeItem", "Xóa thẻ")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className={`mb-1 block text-[11px] font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {t("workspace.flashcard.manualEditor.frontLabel", "Mặt trước")}
                  </label>
                  <textarea
                    value={item.frontContent}
                    onChange={(event) => handleItemChange(item.localId, "frontContent", event.target.value)}
                    maxLength={MAX_FRONT_LENGTH}
                    rows={3}
                    placeholder={t("workspace.flashcard.manualEditor.frontPlaceholder", "Câu hỏi hoặc từ cần nhớ...")}
                    className={`w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
                      isDarkMode
                        ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400"
                        : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-400"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-1 block text-[11px] font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {t("workspace.flashcard.manualEditor.backLabel", "Mặt sau")}
                  </label>
                  <textarea
                    value={item.backContent}
                    onChange={(event) => handleItemChange(item.localId, "backContent", event.target.value)}
                    maxLength={MAX_BACK_LENGTH}
                    rows={3}
                    placeholder={t("workspace.flashcard.manualEditor.backPlaceholder", "Đáp án hoặc giải thích...")}
                    className={`w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
                      isDarkMode
                        ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400"
                        : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-400"
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleAddItem}
            disabled={items.length >= MAX_ITEMS}
            className={`flex items-center gap-2 rounded-xl border-2 border-dashed px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
              isDarkMode
                ? "border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-300"
                : "border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>{t("workspace.flashcard.manualEditor.addItem", "Thêm thẻ")}</span>
            {items.length >= MAX_ITEMS && (
              <span className="text-xs text-rose-400">
                {t("workspace.flashcard.manualEditor.maxReached", { max: MAX_ITEMS, defaultValue: `(đã đạt tối đa ${MAX_ITEMS})` })}
              </span>
            )}
          </button>
        </div>

        {canActivate && activateValidationError ? (
          <p className={`mt-3 text-center text-xs ${isDarkMode ? "text-amber-300" : "text-amber-600"}`}>
            {t("workspace.flashcard.manualEditor.activateHint", "Để Tạo flashcard: ")}{activateValidationError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default ManualFlashcardEditor;
