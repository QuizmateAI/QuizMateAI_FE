import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, CreditCard, Plus, Trash2, Edit3, Save, X, Loader2,
  CheckCircle2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import {
  getFlashcardDetail, updateFlashcardSetName, updateFlashcardSetStatus,
  addFlashcardItem, updateFlashcardItem, deleteFlashcardItem
} from "@/api/FlashcardAPI";

// Cấu hình màu badge trạng thái
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
};

// Component hiển thị chi tiết flashcard set — quản lý items, đổi tên, đổi trạng thái
function FlashcardDetailView({ isDarkMode, flashcard, onBack }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [items, setItems] = useState([]);

  // State đổi tên
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // State thêm item mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);

  // State chỉnh sửa item
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // State xác nhận xóa
  const [deletingItemId, setDeletingItemId] = useState(null);

  // State đổi trạng thái
  const [statusSaving, setStatusSaving] = useState(false);

  // State lật thẻ (flip card preview)
  const [flippedCards, setFlippedCards] = useState({});

  // Lấy chi tiết flashcard set từ API
  const fetchDetail = useCallback(async () => {
    if (!flashcard?.flashcardSetId) return;
    setLoading(true);
    try {
      const res = await getFlashcardDetail(flashcard.flashcardSetId);
      const data = res.data || {};
      setDetail(data);
      setItems(data.items || []);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết flashcard:", err);
    } finally {
      setLoading(false);
    }
  }, [flashcard?.flashcardSetId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Đổi tên flashcard set
  const handleRename = async () => {
    if (!newName.trim() || !detail) return;
    setRenameSaving(true);
    try {
      const res = await updateFlashcardSetName(detail.flashcardSetId, newName.trim());
      const updated = res.data || {};
      setDetail((prev) => ({ ...prev, flashcardSetName: updated.flashcardSetName || newName.trim() }));
      setIsRenaming(false);
    } catch (err) {
      console.error("Lỗi đổi tên flashcard:", err);
    } finally {
      setRenameSaving(false);
    }
  };

  // Đổi trạng thái flashcard set
  const handleToggleStatus = async () => {
    if (!detail) return;
    const newStatus = detail.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    setStatusSaving(true);
    try {
      const res = await updateFlashcardSetStatus(detail.flashcardSetId, newStatus);
      const updated = res.data || {};
      setDetail((prev) => ({ ...prev, status: updated.status || newStatus }));
      if (updated.items) setItems(updated.items);
    } catch (err) {
      console.error("Lỗi đổi trạng thái flashcard:", err);
    } finally {
      setStatusSaving(false);
    }
  };

  // Thêm flashcard item
  const handleAddItem = async () => {
    if (!newFront.trim() || !newBack.trim() || !detail) return;
    setAddingSaving(true);
    try {
      const res = await addFlashcardItem(detail.flashcardSetId, {
        frontContent: newFront.trim(),
        backContent: newBack.trim(),
      });
      const newItem = res.data || {};
      setItems((prev) => [...prev, newItem]);
      setNewFront("");
      setNewBack("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Lỗi thêm flashcard item:", err);
    } finally {
      setAddingSaving(false);
    }
  };

  // Cập nhật flashcard item
  const handleUpdateItem = async (itemId) => {
    if (!editFront.trim() || !editBack.trim()) return;
    setEditSaving(true);
    try {
      const res = await updateFlashcardItem(itemId, {
        frontContent: editFront.trim(),
        backContent: editBack.trim(),
      });
      const updated = res.data || {};
      setItems((prev) =>
        prev.map((item) =>
          item.flashcardItemId === itemId
            ? { ...item, frontContent: updated.frontContent || editFront.trim(), backContent: updated.backContent || editBack.trim() }
            : item
        )
      );
      setEditingItemId(null);
    } catch (err) {
      console.error("Lỗi cập nhật flashcard item:", err);
    } finally {
      setEditSaving(false);
    }
  };

  // Xóa flashcard item
  const handleDeleteItem = async (itemId) => {
    setDeletingItemId(itemId);
    try {
      await deleteFlashcardItem(itemId);
      setItems((prev) => prev.filter((item) => item.flashcardItemId !== itemId));
    } catch (err) {
      console.error("Lỗi xóa flashcard item:", err);
    } finally {
      setDeletingItemId(null);
    }
  };

  // Bắt đầu chỉnh sửa item
  const startEdit = (item) => {
    setEditingItemId(item.flashcardItemId);
    setEditFront(item.frontContent || "");
    setEditBack(item.backContent || "");
  };

  // Lật thẻ
  const toggleFlip = (itemId) => {
    setFlippedCards((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.flashcard.error")}</p>
      </div>
    );
  }

  const ss = STATUS_STYLES[detail.status] || STATUS_STYLES.DRAFT;

  return (
    <div className={`flex flex-col h-full ${fontClass}`}>
      {/* Header */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CreditCard className="w-5 h-5 text-amber-500 shrink-0" />
          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className={`${inputCls} !py-1 flex-1`}
                placeholder={t("workspace.flashcard.renamePlaceholder")} autoFocus onKeyDown={(e) => e.key === "Enter" && handleRename()} />
              <button onClick={handleRename} disabled={renameSaving} className="p-1 text-emerald-500 hover:text-emerald-600">
                {renameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsRenaming(false)} className={`p-1 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className={`text-base font-medium truncate ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
                {detail.flashcardSetName}
              </p>
              <button onClick={() => { setIsRenaming(true); setNewName(detail.flashcardSetName || ""); }}
                className={`p-1 rounded transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-400"}`}>
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thông tin meta + nút hành động */}
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? ss.dark : ss.light}`}>
            {t(`workspace.flashcard.status${detail.status}`)}
          </span>
          <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
            {items.length} {t("workspace.flashcard.items")} · {t("workspace.flashcard.createVia")}: {detail.createVia}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Đổi trạng thái */}
          <Button variant="outline" size="sm" onClick={handleToggleStatus} disabled={statusSaving}
            className={`text-xs h-8 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
            {statusSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> :
              detail.status === "ACTIVE" ? <ToggleRight className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5 mr-1" />}
            {detail.status === "ACTIVE" ? t("workspace.flashcard.deactivate") : t("workspace.flashcard.activate")}
          </Button>
          {/* Thêm item */}
          <Button size="sm" onClick={() => setShowAddForm(true)}
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs h-8">
            <Plus className="w-3.5 h-3.5 mr-1" /> {t("workspace.flashcard.addItem")}
          </Button>
        </div>
      </div>

      {/* Form thêm item mới */}
      {showAddForm && (
        <div className={`px-4 py-3 border-b space-y-2 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                {t("workspace.flashcard.frontContent")}
              </label>
              <textarea value={newFront} onChange={(e) => setNewFront(e.target.value)} className={`${inputCls} min-h-[60px] resize-none`}
                placeholder={t("workspace.flashcard.frontContentPlaceholder")} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                {t("workspace.flashcard.backContent")}
              </label>
              <textarea value={newBack} onChange={(e) => setNewBack(e.target.value)} className={`${inputCls} min-h-[60px] resize-none`}
                placeholder={t("workspace.flashcard.backContentPlaceholder")} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setNewFront(""); setNewBack(""); }}
              className={`text-xs h-8 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
              {t("workspace.flashcard.cancel")}
            </Button>
            <Button size="sm" onClick={handleAddItem} disabled={addingSaving || !newFront.trim() || !newBack.trim()}
              className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs h-8">
              {addingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              {t("workspace.flashcard.addItem")}
            </Button>
          </div>
        </div>
      )}

      {/* Danh sách items */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CreditCard className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.flashcard.noItems")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const isEditing = editingItemId === item.flashcardItemId;
              const isFlipped = flippedCards[item.flashcardItemId];
              const isDeleting = deletingItemId === item.flashcardItemId;

              return (
                <div key={item.flashcardItemId}
                  className={`rounded-xl border overflow-hidden transition-all ${isDarkMode ? "border-slate-800 bg-slate-800/50" : "border-gray-200 bg-gray-50"}`}>
                  {/* Header item */}
                  <div className={`px-4 py-2 flex items-center justify-between ${isDarkMode ? "bg-slate-800/80" : "bg-gray-100"}`}>
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {t("workspace.flashcard.itemNumber", { number: idx + 1 })}
                    </span>
                    <div className="flex items-center gap-1">
                      {!isEditing && (
                        <>
                          <button onClick={() => startEdit(item)}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-400"}`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteItem(item.flashcardItemId)} disabled={isDeleting}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-red-950/30 text-red-400" : "hover:bg-red-100 text-red-500"}`}>
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    // Form chỉnh sửa inline
                    <div className="px-4 py-3 space-y-2">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                          {t("workspace.flashcard.frontContent")}
                        </label>
                        <textarea value={editFront} onChange={(e) => setEditFront(e.target.value)} className={`${inputCls} min-h-[50px] resize-none`} />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                          {t("workspace.flashcard.backContent")}
                        </label>
                        <textarea value={editBack} onChange={(e) => setEditBack(e.target.value)} className={`${inputCls} min-h-[50px] resize-none`} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingItemId(null)}
                          className={`text-xs h-7 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
                          {t("workspace.flashcard.cancel")}
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateItem(item.flashcardItemId)} disabled={editSaving}
                          className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs h-7">
                          {editSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                          {t("workspace.flashcard.save")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Hiển thị thẻ — nhấn để lật
                    <div className="px-4 py-3 cursor-pointer" onClick={() => toggleFlip(item.flashcardItemId)}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                            {t("workspace.flashcard.frontContent")}
                          </p>
                          <p className={`text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {item.frontContent || "—"}
                          </p>
                        </div>
                        <div className={`transition-all ${isFlipped ? "opacity-100" : "opacity-30 blur-sm"}`}>
                          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                            {t("workspace.flashcard.backContent")}
                          </p>
                          <p className={`text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {item.backContent || "—"}
                          </p>
                        </div>
                      </div>
                      {!isFlipped && (
                        <p className={`text-[10px] text-center mt-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                          {t("workspace.flashcard.flipCard")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardDetailView;
