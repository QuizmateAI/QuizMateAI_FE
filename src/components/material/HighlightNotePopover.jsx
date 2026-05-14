import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

// Popover hiển thị ngay dưới đoạn highlight trong PDF.
//   - View mode: hiện nội dung note + nút Sửa / Xóa.
//   - Edit mode: textarea để chỉnh content, có Lưu / Hủy.
//   - Draft mode: tương tự edit, dùng cho HIGHLIGHT đang soạn (chưa lưu BE).
//
// Vị trí: anchor theo rect cuối cùng của vùng bôi đen (rect có bottom lớn nhất)
// + offset. Đặt trong page-div (relative) nên tự co giãn theo trang PDF.
//
// Props:
//   annotation       — annotation object (cần selectionRects/topRatio để định vị)
//   isDarkMode       — theme
//   isDraft          — true nếu là draft chưa save
//   onChangeContent  — (content) => void; gọi khi user gõ trong draft mode
//   onSaveDraft      — () => void; gọi khi nhấn Lưu trong draft mode
//   onCancelDraft    — () => void; gọi khi nhấn Hủy trong draft mode
//   onUpdate         — (id, content) => void; gọi khi save edit mode
//   onDelete         — (id) => void; gọi khi nhấn xóa
//   onClose          — () => void; đóng popover view mode

function getAnchorRatios(annotation) {
  const rects = Array.isArray(annotation?.selectionRects)
    ? annotation.selectionRects
    : [];
  if (rects.length > 0) {
    let bottomRatio = 0;
    let leftRatio = 1;
    for (const rect of rects) {
      const bottom =
        Number(rect.topRatio || 0) + Number(rect.heightRatio || 0);
      if (bottom > bottomRatio) bottomRatio = bottom;
      const left = Number(rect.leftRatio || 0);
      if (left < leftRatio) leftRatio = left;
    }
    return {
      topRatio: Math.min(0.96, bottomRatio + 0.005),
      leftRatio: Math.max(0.02, Math.min(0.5, leftRatio)),
    };
  }
  return {
    topRatio: Math.min(0.96, Number(annotation?.topRatio || 0.12) + 0.04),
    leftRatio: 0.06,
  };
}

export default function HighlightNotePopover({
  annotation,
  isDarkMode = false,
  isDraft = false,
  onChangeContent,
  onSaveDraft,
  onCancelDraft,
  onUpdate,
  onDelete,
  onClose,
}) {
  const [isEditing, setIsEditing] = useState(false);
  // draftContent: chỉ dùng khi đang edit mode (không phải draft). Khởi tạo khi
  // user bấm Sửa; view mode hiển thị annotation.content trực tiếp nên không
  // cần đồng bộ.
  const [draftContent, setDraftContent] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if ((isDraft || isEditing) && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isDraft, isEditing]);

  if (!annotation) return null;

  const { topRatio, leftRatio } = getAnchorRatios(annotation);
  const editing = isDraft || isEditing;
  const liveContent = isDraft ? annotation.content || "" : draftContent;

  return (
    <div
      data-annotation-interactive="true"
      className="absolute z-30 w-[min(380px,80%)]"
      style={{
        top: `${topRatio * 100}%`,
        left: `${leftRatio * 100}%`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={`overflow-hidden rounded-2xl border shadow-[0_20px_50px_-20px_rgba(15,23,42,0.45)] ${
          isDarkMode
            ? "border-slate-700 bg-slate-900 text-slate-100"
            : "border-amber-200 bg-white text-slate-900"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${
            isDarkMode
              ? "border-slate-800 bg-slate-950"
              : "border-amber-100 bg-amber-50"
          }`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${
              isDarkMode ? "text-amber-300" : "text-amber-700"
            }`}
          >
            {isDraft ? "Ghi chú mới" : "Ghi chú highlight"}
          </span>
          <div className="flex items-center gap-1">
            {!editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraftContent(annotation.content || "");
                    setIsEditing(true);
                  }}
                  title="Chỉnh sửa"
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                    isDarkMode
                      ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "text-slate-500 hover:bg-amber-100 hover:text-amber-700"
                  }`}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(annotation.id)}
                  title="Xóa"
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                    isDarkMode
                      ? "text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                      : "text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  }`}
                >
                  <X size={14} />
                </button>
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    title="Đóng"
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                      isDarkMode
                        ? "text-slate-500 hover:bg-slate-800 hover:text-white"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {annotation.highlightedText || annotation.excerpt ? (
          <div
            className={`border-b px-3 py-2 text-[11px] italic ${
              isDarkMode
                ? "border-slate-800 text-amber-200/80"
                : "border-amber-50 text-amber-700"
            }`}
          >
            “
            {(annotation.highlightedText || annotation.excerpt || "").slice(
              0,
              140,
            )}
            {(annotation.highlightedText || annotation.excerpt || "").length >
            140
              ? "…"
              : ""}
            ”
          </div>
        ) : null}

        <div className="px-3 py-3">
          {editing ? (
            <>
              <textarea
                ref={textareaRef}
                value={liveContent}
                onChange={(event) => {
                  const next = event.target.value;
                  if (isDraft) {
                    onChangeContent?.(next);
                  } else {
                    setDraftContent(next);
                  }
                }}
                placeholder="Viết ghi chú cho đoạn này..."
                className={`min-h-[88px] w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400"
                }`}
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isDraft) {
                      onCancelDraft?.();
                    } else {
                      setIsEditing(false);
                      setDraftContent(annotation.content || "");
                    }
                  }}
                  className={`text-xs font-semibold transition ${
                    isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!liveContent.trim()}
                  onClick={() => {
                    if (isDraft) {
                      onSaveDraft?.();
                    } else {
                      onUpdate?.(annotation.id, draftContent);
                      setIsEditing(false);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDarkMode
                      ? "bg-blue-500 text-white hover:bg-blue-400"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <Check size={13} />
                  Lưu
                </button>
              </div>
            </>
          ) : annotation.content ? (
            <p
              className={`whitespace-pre-wrap break-words text-sm leading-6 ${
                isDarkMode ? "text-slate-200" : "text-slate-700"
              }`}
            >
              {annotation.content}
            </p>
          ) : (
            <p
              className={`text-xs italic ${
                isDarkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              (Chưa có ghi chú — nhấn để thêm)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
