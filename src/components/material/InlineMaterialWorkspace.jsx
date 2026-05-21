import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Highlighter,
  MessageSquareText,
  Network,
  Pencil,
  Sparkles,
  X,
  FileText,
} from "lucide-react";

import MaterialPdfViewer from "./MaterialPdfViewer";
import EmbeddedKnowledgeTree from "./EmbeddedKnowledgeTree";
import AskAIPanel from "./AskAIPanel";
import ListenPlayer from "./ListenPlayer";

const HIGHLIGHT_COLORS = [
  {
    id: "yellow",
    label: "Vàng",
    swatch: "linear-gradient(135deg, #FDE68A, #F59E0B)",
    ring: "#F59E0B",
    paint: "rgba(253, 224, 71, 0.55)",
  },
  {
    id: "blue",
    label: "Xanh dương",
    swatch: "linear-gradient(135deg, #BFDBFE, #3B82F6)",
    ring: "#3B82F6",
    paint: "rgba(147, 197, 253, 0.55)",
  },
  {
    id: "pink",
    label: "Hồng",
    swatch: "linear-gradient(135deg, #FBCFE8, #EC4899)",
    ring: "#EC4899",
    paint: "rgba(244, 114, 182, 0.5)",
  },
  {
    id: "green",
    label: "Xanh lá",
    swatch: "linear-gradient(135deg, #BBF7D0, #22C55E)",
    ring: "#22C55E",
    paint: "rgba(134, 239, 172, 0.55)",
  },
];
import {
  createMaterialNote,
  deleteMaterialNote,
  listMaterialNotes,
  updateMaterialNote,
} from "../../api/MaterialNoteAPI";
import {
  getExtractedText,
  getMaterialContent,
  getModerationReportDetail,
  reviewMaterial,
} from "../../api/MaterialAPI";
import { MaterialContentRenderer } from "../features/material/MaterialContentRenderer";

// ============================================================================
// InlineMaterialWorkspace - Variant C redesign:
//   - Top bar: book cover + title + tag + page navigator + actions
//   - Left (main): sub-toolbar (breadcrumb + actions) + PDF + floating CTAs
//   - Right (440px sidebar): progress card + cây kiến thức chapter cards
// ============================================================================

function pickPdfUrl(source) {
  if (!source) return null;
  const candidates = [
    source.storageURL,
    source.storageUrl,
    source.storage_url,
    source.fileURL,
    source.fileUrl,
    source.file_url,
    source.materialUrl,
    source.material_url,
    source.downloadURL,
    source.downloadUrl,
    source.download_url,
    source.r2Url,
    source.r2_url,
    source.url,
    source.link,
    source.contentURL,
    source.contentUrl,
    source.content_url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.toLowerCase().includes(".pdf")) return c;
  }
  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//.test(c)) return c;
  }
  return null;
}

function isPdfMaterial(source) {
  if (!source) return false;
  const type = String(
    source.type || source.materialType || source.contentType || "",
  ).toLowerCase();
  if (type.includes("pdf")) return true;
  const url = pickPdfUrl(source);
  return typeof url === "string" && url.toLowerCase().includes(".pdf");
}

function getCoverInitial(title) {
  if (!title) return "?";
  const t = title.trim();
  const match = t.match(/[A-Za-zÀ-ỹ]/);
  return (match ? match[0] : t[0] || "?").toUpperCase();
}

function createDraftAnnotationId() {
  return `draft-note:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
}

function createAnnotationId() {
  return `annotation:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeSelectionRects(rects) {
  if (!Array.isArray(rects)) return [];
  return rects
    .map((rect) => {
      if (!rect || typeof rect !== "object") return null;
      const leftRatio = Number(rect.leftRatio);
      const topRatio = Number(rect.topRatio);
      const widthRatio = Number(rect.widthRatio);
      const heightRatio = Number(rect.heightRatio);
      if (
        !Number.isFinite(leftRatio) ||
        !Number.isFinite(topRatio) ||
        !Number.isFinite(widthRatio) ||
        !Number.isFinite(heightRatio)
      ) {
        return null;
      }
      return { leftRatio, topRatio, widthRatio, heightRatio };
    })
    .filter(Boolean);
}

function mapMaterialNoteToAnnotation(note, fallbackPage = 1) {
  const isHighlight = note?.noteType === "HIGHLIGHT";
  const selectionRects = sanitizeSelectionRects(note?.selectionRects);
  const page = Math.max(1, Number(note?.pageNumber) || fallbackPage);
  const topRatio =
    typeof note?.topRatio === "number" && Number.isFinite(note.topRatio)
      ? note.topRatio
      : 0.12;
  return {
    id: note?.noteId ? `server-note:${note.noteId}` : createAnnotationId(),
    noteId: note?.noteId,
    kind: "note",
    page,
    excerpt: isHighlight
      ? note?.highlightedText || "Đoạn đã đánh dấu"
      : note?.title || "Ghi chú tự do",
    topRatio,
    source: isHighlight ? "server-highlight" : "floating",
    selectionRects,
    content: note?.content || "",
    title: note?.title || "",
    noteType: note?.noteType || "NORMAL",
    highlightedText: note?.highlightedText || "",
    startOffset: note?.startOffset,
    endOffset: note?.endOffset,
    createdAt: note?.createdAt || new Date().toISOString(),
    updatedAt: note?.updatedAt,
  };
}

function buildCreateNotePayload(materialId, annotation) {
  const isHighlight = annotation.source !== "floating";
  if (isHighlight) {
    return {
      materialId: Number(materialId),
      noteType: "HIGHLIGHT",
      content: annotation.content || "",
      highlightedText: annotation.excerpt || annotation.highlightedText || "",
      startOffset: annotation.startOffset ?? null,
      endOffset: annotation.endOffset ?? null,
      pageNumber: Number(annotation.page) || null,
      topRatio:
        typeof annotation.topRatio === "number" ? annotation.topRatio : null,
      selectionRects: sanitizeSelectionRects(annotation.selectionRects),
    };
  }

  return {
    materialId: Number(materialId),
    noteType: "NORMAL",
    title: annotation.title || "Ghi chú tự do",
    content: annotation.content || "",
    pageNumber: Number(annotation.page) || null,
    topRatio:
      typeof annotation.topRatio === "number" ? annotation.topRatio : null,
  };
}

function PageNavigator({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  isDarkMode,
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-xl p-1 ${
        isDarkMode ? "bg-slate-800" : "bg-slate-100"
      }`}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage <= 1}
        className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition ${
          isDarkMode
            ? "text-slate-300 hover:bg-slate-700"
            : "text-slate-600 hover:bg-slate-200"
        }`}
      >
        <ChevronLeft size={14} />
      </button>
      <div
        className={`px-3 py-1 rounded-md text-[13px] font-extrabold tabular-nums shadow-sm ${
          isDarkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
        }`}
      >
        <span className={isDarkMode ? "text-cyan-300" : "text-blue-700"}>
          {currentPage}
        </span>
        <span className="text-slate-400 mx-1">/</span>
        {totalPages || "?"}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= (totalPages || 1)}
        className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition ${
          isDarkMode
            ? "text-slate-300 hover:bg-slate-700"
            : "text-slate-600 hover:bg-slate-200"
        }`}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function IconBtn({ children, onClick, title, isDarkMode, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-9 h-9 inline-flex items-center justify-center rounded-[10px] transition ${
        active
          ? "bg-blue-600 text-white"
          : isDarkMode
            ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {children}
    </button>
  );
}

function ToolPill({ icon: Icon, label, active, onClick, isDarkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
        active
          ? "text-white shadow-[0_4px_10px_-4px_rgba(37,99,235,0.55)]"
          : isDarkMode
            ? "text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
            : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
      }`}
      style={
        active
          ? { background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #06B6D4 100%)" }
          : undefined
      }
    >
      {Icon && <Icon size={13} />}
      {label}
    </button>
  );
}

// eslint-disable-next-line unused-imports/no-unused-vars
function AITutorFab({
  highlightedText,
  currentChapter,
  onJumpChapter,
  onAsk,
  onClose,
}) {
  if (!highlightedText) return null;
  return (
    <div className="absolute left-6 bottom-6 w-[360px] bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-4 shadow-[0_20px_40px_-12px_rgba(37,99,235,0.5),0_4px_12px_-4px_rgba(37,99,235,0.3)]">
      <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase opacity-95">
        <Sparkles size={14} />
        AI Tutor
        <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
          ĐOẠN VỪA HIGHLIGHT
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto w-5.5 h-5.5 rounded-full bg-white/15 inline-flex items-center justify-center"
        >
          <X size={12} />
        </button>
      </div>
      <p className="text-sm font-semibold leading-relaxed my-3">
        Bạn vừa đánh dấu{" "}
        <b>
          "{highlightedText.slice(0, 30)}
          {highlightedText.length > 30 ? "..." : ""}"
        </b>
        {currentChapter && (
          <>
            {" "}
            - khái niệm này quay lại nhiều lần ở chương {currentChapter}. Bạn
            muốn xem lại nhanh không?
          </>
        )}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onJumpChapter}
          className="flex-1 px-3 py-2 rounded-lg bg-white text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 hover:bg-blue-50 transition"
        >
          Có, mở chương {currentChapter || ""}
        </button>
        <button
          type="button"
          onClick={onAsk}
          className="flex-1 px-3 py-2 rounded-lg bg-white/15 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-white/25 transition"
        >
          + Hỏi thêm
        </button>
      </div>
    </div>
  );
}

export default function InlineMaterialWorkspace({
  source,
  isDarkMode = false,
  onBack,
}) {
  const sidebarTabs = ["tree", "notes", "chat"];

  // sidebarView: "tree" | "chat" | "notes" | null
  const [sidebarView, setSidebarView] = useState("tree");
  const [highlightPageRange, setHighlightPageRange] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTool, setActiveTool] = useState("highlight");
  const [highlightColorId, setHighlightColorId] = useState("yellow");
  const [annotations, setAnnotations] = useState([]);
  const [draftAnnotation, setDraftAnnotation] = useState(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [notesError, setNotesError] = useState(null);
  // Review banner state: status starts từ source nhưng cho phép update local sau khi approve.
  const [materialStatus, setMaterialStatus] = useState(
    String(source?.status || "").toUpperCase(),
  );
  const [moderationReport, setModerationReport] = useState(null);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  // Non-PDF content (extracted text cho docx/text, hoặc {url, transcript} cho media).
  const [extractedContent, setExtractedContent] = useState(null); // { value, script } | null
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState(false);
  const pdfRef = useRef(null);

  const treeOpen = sidebarView !== null;

  const pdfUrl = useMemo(() => pickPdfUrl(source), [source]);
  const materialId = source?.id || source?.materialId;
  const workspaceId =
    source?.workspaceId || source?.workspaceID || source?.workspace_id;
  const sourceTitle = source?.name || source?.title || "Tài liệu";
  const sourceMeta =
    source?.author || source?.uploaderName || source?.originalFileName || "";
  const pdfTag = (source?.type || source?.materialType || "PDF")
    .split("/")
    .pop()
    .toUpperCase();
  const coverInitial = getCoverInitial(sourceTitle);

  useEffect(() => {
    if (!materialId) {
      return undefined;
    }

    let cancelled = false;
    listMaterialNotes(materialId)
      .then((notes) => {
        if (cancelled) return;
        const items = Array.isArray(notes) ? notes : notes?.data || [];
        setAnnotations(
          items.map((note) => mapMaterialNoteToAnnotation(note, 1)),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setNotesError(error?.message || "Không tải được ghi chú");
      });

    return () => {
      cancelled = true;
    };
  }, [materialId]);

  // Sync materialStatus khi source thay đổi (vd user navigate giữa các material).
  useEffect(() => {
    setMaterialStatus(String(source?.status || "").toUpperCase());
    setReviewError(null);
  }, [source?.id, source?.status]);

  const isWarned = materialStatus === "WARN" || materialStatus === "WARNED";

  // Fetch moderation report khi material WARNED — dùng để hiển thị reason/suggestion trong banner.
  useEffect(() => {
    if (!materialId || !isWarned) {
      setModerationReport(null);
      return undefined;
    }
    let cancelled = false;
    setModerationLoading(true);
    getModerationReportDetail(materialId)
      .then((report) => {
        if (cancelled) return;
        setModerationReport(report || null);
      })
      .catch(() => {
        if (cancelled) return;
        setModerationReport(null);
      })
      .finally(() => {
        if (cancelled) return;
        setModerationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [materialId, isWarned]);

  const handleReviewClick = useCallback(
    async (isApproved) => {
      if (!materialId || reviewLoading) return;
      setReviewLoading(true);
      setReviewError(null);
      try {
        await reviewMaterial(materialId, isApproved);
        // Banner sẽ tự ẩn vì materialStatus đổi sang ACTIVE/REJECTED → isWarned = false.
        setMaterialStatus(isApproved ? "ACTIVE" : "REJECTED");
      } catch (error) {
        setReviewError(
          error?.response?.data?.message
            || error?.message
            || "Không thể duyệt tài liệu lúc này.",
        );
      } finally {
        setReviewLoading(false);
      }
    },
    [materialId, reviewLoading],
  );

  const moderationReason = moderationReport?.reason || null;
  const moderationSuggestion = moderationReport?.suggestion || null;

  // Fetch nội dung cho non-PDF: media (image/audio/video) -> {url, transcript},
  // text/docx -> extracted markdown. Skip cho PDF (đã có viewer riêng).
  const sourceTypeLower = String(
    source?.type || source?.materialType || source?.contentType || "",
  ).toLowerCase();
  const looksLikeMedia =
    sourceTypeLower.includes("image") ||
    sourceTypeLower.includes("audio") ||
    sourceTypeLower.includes("video") ||
    sourceTypeLower.includes("youtube") ||
    sourceTypeLower.includes("vimeo");
  const needsContentFetch =
    Boolean(materialId) &&
    !isPdfMaterial(source) &&
    materialStatus !== "REJECT" &&
    materialStatus !== "REJECTED";

  useEffect(() => {
    if (!needsContentFetch) {
      setExtractedContent(null);
      setContentError(false);
      return undefined;
    }
    let cancelled = false;
    setContentLoading(true);
    setContentError(false);
    (async () => {
      try {
        if (looksLikeMedia) {
          // Media: thử /content endpoint trước (trả {url, transcript})
          try {
            const res = await getMaterialContent(materialId);
            const data = res?.data ?? res ?? null;
            if (!cancelled && data && (data.url || data.transcript)) {
              setExtractedContent({
                value: data.url || data.transcript || "",
                script: data.transcript || null,
              });
              return;
            }
          } catch {
            // fallthrough sang /extracted-text
          }
        }
        const res = await getExtractedText(materialId);
        if (cancelled) return;
        const text = typeof res === "string" ? res : res?.data ?? "";
        setExtractedContent({ value: text || "", script: null });
      } catch {
        if (!cancelled) setContentError(true);
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId, needsContentFetch, looksLikeMedia]);

  const handleLeafSelect = useCallback((selection) => {
    if (!selection) return;
    const { pageStart, pageEnd } = selection;
    if (pageStart) {
      setHighlightPageRange([pageStart, pageEnd || pageStart]);
      pdfRef.current?.jumpToPage(pageStart);
      setCurrentPage(pageStart);
    }
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleTotalPagesChange = useCallback((total) => {
    setTotalPages(total);
  }, []);

  const handleAnnotationCreate = useCallback(
    async (annotation) => {
      if (!materialId) return;
      setDraftAnnotation(null);
      setNotesError(null);
      try {
        const created = await createMaterialNote(
          buildCreateNotePayload(materialId, annotation),
        );
        const note = created?.data || created;
        const nextAnnotation = {
          ...annotation,
          noteId: note?.noteId,
          noteType: note?.noteType || "HIGHLIGHT",
          title: note?.title || annotation.title || "",
          content: note?.content || annotation.content || "",
          highlightedText: note?.highlightedText || annotation.excerpt || "",
          startOffset: note?.startOffset,
          endOffset: note?.endOffset,
          createdAt: note?.createdAt || annotation.createdAt,
          updatedAt: note?.updatedAt,
        };
        setAnnotations((previous) => [nextAnnotation, ...previous]);
        setSelectedAnnotationId(nextAnnotation.id);
        setSidebarView("notes");
      } catch (error) {
        setNotesError(error?.message || "Không tạo được ghi chú");
      }
    },
    [materialId],
  );

  const handleAnnotationSelect = useCallback((annotationId) => {
    setSelectedAnnotationId(annotationId);
    setSidebarView("notes");
  }, []);

  const handleWorkspacePointerDown = useCallback((event) => {
    if (event.target?.closest?.("[data-annotation-interactive='true']")) {
      return;
    }
    setSelectedAnnotationId(null);
  }, []);

  const handleAnnotationDraftChange = useCallback((draft) => {
    if (!draft) {
      setDraftAnnotation(null);
      setSelectedAnnotationId((previous) =>
        previous?.startsWith?.("draft-note:") ? null : previous,
      );
      return;
    }

    let nextDraftId = null;
    setDraftAnnotation((previous) => {
      const nextDraft = {
        id: previous?.id || createDraftAnnotationId(),
        kind: "note",
        page: draft.page,
        excerpt: draft.excerpt,
        topRatio: draft.topRatio,
        source: draft.source || "hover",
        selectionRects: draft.selectionRects || [],
        content: draft.content || "",
        createdAt: previous?.createdAt || new Date().toISOString(),
        status: "draft",
      };
      nextDraftId = nextDraft.id;
      return nextDraft;
    });
    setSelectedAnnotationId(nextDraftId);
  }, []);

  const handleAnnotationResolve = useCallback((annotationId, patch) => {
    setAnnotations((previous) =>
      previous.map((annotation) =>
        annotation.id === annotationId
          ? { ...annotation, ...patch }
          : annotation,
      ),
    );
  }, []);

  const handleCreateSidebarNote = useCallback(() => {
    setSidebarView("notes");
  }, []);

  const handleFloatingNoteSave = useCallback(
    async (payload) => {
      if (!materialId) return;
      const rawContent =
        typeof payload === "string" ? payload : payload?.content;
      const rawTitle = typeof payload === "string" ? "" : payload?.title;
      const trimmedTitle = String(rawTitle || "").trim();
      const title = trimmedTitle || "Không có tiêu đề";
      const annotation = {
        id: createAnnotationId(),
        kind: "note",
        page: currentPage,
        excerpt: title,
        topRatio: 0.12,
        source: "floating",
        selectionRects: [],
        content: String(rawContent || "").trim(),
        title,
        noteType: "NORMAL",
        createdAt: new Date().toISOString(),
      };
      setNotesError(null);
      try {
        const created = await createMaterialNote(
          buildCreateNotePayload(materialId, annotation),
        );
        const note = created?.data || created;
        const nextAnnotation = {
          ...annotation,
          noteId: note?.noteId,
          title: note?.title || annotation.title,
          content: note?.content || annotation.content,
          createdAt: note?.createdAt || annotation.createdAt,
          updatedAt: note?.updatedAt,
        };
        setAnnotations((previous) => [nextAnnotation, ...previous]);
        setSelectedAnnotationId(nextAnnotation.id);
        setSidebarView("notes");
      } catch (error) {
        setNotesError(error?.message || "Không tạo được ghi chú");
      }
    },
    [currentPage, materialId],
  );

  const handleUpdateAnnotation = useCallback((annotationId, payload) => {
    const isObject = payload && typeof payload === "object";
    const rawContent = isObject ? payload.content : payload;
    const nextContent = String(rawContent || "").trim();
    const titleUpdated = isObject && "title" in payload;
    const trimmedTitle = titleUpdated
      ? String(payload.title || "").trim()
      : "";
    const nextTitle = titleUpdated
      ? trimmedTitle || "Không có tiêu đề"
      : null;
    let targetNoteId = null;

    setAnnotations((previous) =>
      previous.map((annotation) => {
        if (annotation.id !== annotationId) return annotation;
        targetNoteId = annotation.noteId;
        const updated = { ...annotation, content: nextContent };
        if (titleUpdated) {
          updated.title = nextTitle;
          if (annotation.noteType !== "HIGHLIGHT") {
            updated.excerpt = nextTitle;
          }
        }
        return updated;
      }),
    );

    if (targetNoteId) {
      setNotesError(null);
      const body = { content: nextContent };
      if (titleUpdated) body.title = nextTitle;
      updateMaterialNote(targetNoteId, body).catch((error) => {
        setNotesError(error?.message || "Không cập nhật được ghi chú");
      });
    }
  }, []);

  const handleDeleteAnnotation = useCallback(
    (annotationId) => {
      if (annotationId === draftAnnotation?.id) {
        pdfRef.current?.cancelDraftAnnotation?.();
        setDraftAnnotation(null);
        setSelectedAnnotationId((previous) =>
          previous === annotationId ? null : previous,
        );
        return;
      }

      let targetNoteId = null;
      setAnnotations((previous) =>
        previous.filter((annotation) => {
          if (annotation.id !== annotationId) return true;
          targetNoteId = annotation.noteId;
          return false;
        }),
      );
      if (targetNoteId) {
        setNotesError(null);
        deleteMaterialNote(targetNoteId).catch((error) => {
          setNotesError(error?.message || "Không xóa được ghi chú");
        });
      }
      setSelectedAnnotationId((previous) =>
        previous === annotationId ? null : previous,
      );
    },
    [draftAnnotation?.id],
  );

  const handleOpenAnnotation = useCallback(
    (annotationId) => {
      setSelectedAnnotationId(annotationId);
      pdfRef.current?.focusAnnotation?.(annotationId);
    },
    [],
  );

  // Sidebar Ghi chú = chỉ NORMAL note (ghi chú tự do). HIGHLIGHT hiện trong
  // PDF viewer (dưới đoạn đã bôi). Sort theo createdAt giảm dần — note mới
  // nhất ở trên cùng, không phụ thuộc trang/scroll PDF.
  const sidebarNotes = useMemo(
    () =>
      annotations
        .filter(
          (annotation) =>
            annotation.kind !== "emoji" &&
            (annotation.noteType === "NORMAL" ||
              annotation.source === "floating"),
        )
        .slice()
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        ),
    [annotations],
  );
  const sidebarTabIndex = Math.max(0, sidebarTabs.indexOf(sidebarView));
  const viewerAnnotations = useMemo(
    () => (draftAnnotation ? [draftAnnotation, ...annotations] : annotations),
    [annotations, draftAnnotation],
  );

  const showPdf = isPdfMaterial(source) && pdfUrl;

  return (
    <div
      onPointerDownCapture={handleWorkspacePointerDown}
      className={`grid h-full min-h-0 ${
        isDarkMode ? "bg-slate-950" : "bg-white"
      }`}
      style={{
        // Grid rows: top bar (60px) + optional review banner (auto) + main content (1fr).
        // Khi material không WARNED, hàng review = 0px nên không chiếm chỗ.
        gridTemplateRows: isWarned ? "60px auto 1fr" : "60px 1fr",
        gridTemplateColumns: treeOpen ? "1fr 440px" : "1fr",
      }}
    >
      {/* TOP BAR */}
      <div
        className={`col-span-full flex items-center gap-3 px-5 border-b ${
          isDarkMode
            ? "border-slate-800 bg-slate-950"
            : "border-blue-100 bg-white"
        }`}
      >
        <IconBtn onClick={onBack} title="Quay lại" isDarkMode={isDarkMode}>
          <ArrowLeft size={16} />
        </IconBtn>

        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-10 flex-shrink-0 relative rounded shadow-[0_4px_12px_-4px_rgba(30,58,138,0.45)]"
            style={{ background: "linear-gradient(135deg, #1E3A8A, #2563EB)" }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[13px]">
              {coverInitial}
            </span>
          </div>
          <div className="min-w-0">
            <div
              className={`text-sm font-extrabold tracking-tight leading-tight truncate max-w-[280px] ${
                isDarkMode ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {sourceTitle}
            </div>
            <div
              className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1.5 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {sourceMeta && <>{sourceMeta} · </>}
              {totalPages > 0 && <>{totalPages} trang</>}
              <span
                className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                  isDarkMode
                    ? "bg-blue-900/40 text-blue-300"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {pdfTag}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER AREA - inline strip when highlight/listen tool is active */}
        <div className="flex-1 min-w-2 flex items-center justify-center">
          {showPdf && activeTool === "listen" && (
            <ListenPlayer
              isDarkMode={isDarkMode}
              currentPage={currentPage}
            />
          )}
          {showPdf && activeTool === "highlight" && (
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border ${
                isDarkMode
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200/70 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.25)]"
              }`}
            >
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                Màu
              </span>
              <div className="flex items-center gap-1">
                {HIGHLIGHT_COLORS.map((color) => {
                  const isActive = color.id === highlightColorId;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setHighlightColorId(color.id)}
                      title={color.label}
                      className={`relative w-6 h-6 rounded-md transition transform ${
                        isActive ? "scale-110" : "hover:scale-110"
                      }`}
                      style={{
                        background: color.swatch,
                        outline: isActive ? `2px solid ${color.ring}` : "none",
                        outlineOffset: isActive ? "1.5px" : "0",
                      }}
                    >
                      {isActive && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check
                            size={12}
                            className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
                            strokeWidth={3}
                          />
                        </span>
                      )}
                      <span className="sr-only">{color.label}</span>
                    </button>
                  );
                })}
              </div>
              <span
                className={`hidden md:inline-flex items-center text-[10px] font-semibold pl-1.5 border-l ${
                  isDarkMode
                    ? "text-blue-200/70 border-blue-500/30"
                    : "text-blue-700/80 border-blue-200"
                }`}
              >
                Tô chữ trên PDF để đánh dấu
              </span>
            </div>
          )}
        </div>

        {/* TOOL PILLS - moved up from old sub-toolbar */}
        {showPdf && (
          <div className="flex items-center gap-1">
            <ToolPill
              icon={Highlighter}
              label="Đánh dấu"
              active={activeTool === "highlight"}
              onClick={() =>
                setActiveTool(activeTool === "highlight" ? null : "highlight")
              }
              isDarkMode={isDarkMode}
            />
            <ToolPill
              icon={Headphones}
              label="Nghe"
              active={activeTool === "listen"}
              onClick={() =>
                setActiveTool(activeTool === "listen" ? null : "listen")
              }
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {showPdf && (
          <PageNavigator
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => {
              const next = Math.max(1, currentPage - 1);
              setCurrentPage(next);
              pdfRef.current?.jumpToPage(next);
            }}
            onNext={() => {
              const next = Math.min(totalPages || currentPage, currentPage + 1);
              setCurrentPage(next);
              pdfRef.current?.jumpToPage(next);
            }}
            isDarkMode={isDarkMode}
          />
        )}

      </div>

      {/* REVIEW BANNER — chỉ hiện khi material status = WARNED, yêu cầu user duyệt/từ chối */}
      {isWarned && (
        <div
          className={`col-span-full border-b px-5 py-3 ${
            isDarkMode
              ? "border-amber-700/40 bg-amber-950/30"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold ${
                  isDarkMode ? "text-amber-200" : "text-amber-900"
                }`}
              >
                ⚠️ Tài liệu đang ở trạng thái cảnh báo, cần bạn duyệt.
              </p>
              {moderationLoading && !moderationReport && (
                <p
                  className={`mt-1 text-xs ${
                    isDarkMode ? "text-amber-300/80" : "text-amber-700"
                  }`}
                >
                  Đang tải báo cáo kiểm duyệt...
                </p>
              )}
              {moderationReason && (
                <p
                  className={`mt-1 text-xs leading-relaxed ${
                    isDarkMode ? "text-amber-100" : "text-amber-800"
                  }`}
                >
                  <span className="font-semibold">Lý do: </span>
                  {moderationReason}
                </p>
              )}
              {moderationSuggestion && (
                <p
                  className={`mt-0.5 text-xs leading-relaxed ${
                    isDarkMode ? "text-amber-200/80" : "text-amber-700"
                  }`}
                >
                  <span className="font-semibold">Gợi ý: </span>
                  {moderationSuggestion}
                </p>
              )}
              {reviewError && (
                <p
                  className={`mt-1 text-xs ${
                    isDarkMode ? "text-red-300" : "text-red-700"
                  }`}
                >
                  {reviewError}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleReviewClick(true)}
                disabled={reviewLoading}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  reviewLoading
                    ? isDarkMode
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : isDarkMode
                      ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                Duyệt
              </button>
              <button
                type="button"
                onClick={() => handleReviewClick(false)}
                disabled={reviewLoading}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  reviewLoading
                    ? isDarkMode
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : isDarkMode
                      ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                }`}
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN READING AREA */}
      <section
        className={`flex flex-col overflow-hidden relative ${
          isDarkMode ? "bg-slate-900" : ""
        }`}
        style={
          !isDarkMode
            ? { background: "linear-gradient(180deg, #F1F5FB, #E5ECF6)" }
            : undefined
        }
      >
        {/* PDF VIEWER */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {showPdf ? (
            <MaterialPdfViewer
              ref={pdfRef}
              fileUrl={pdfUrl}
              highlightPageRange={highlightPageRange}
              isDarkMode={isDarkMode}
              onPageChange={handlePageChange}
              onTotalPagesChange={handleTotalPagesChange}
              annotations={viewerAnnotations}
              selectedAnnotationId={selectedAnnotationId}
              annotationsEnabled={sidebarView === "notes"}
              onAnnotationCreate={handleAnnotationCreate}
              onAnnotationSelect={handleAnnotationSelect}
              onAnnotationDraftChange={handleAnnotationDraftChange}
              onAnnotationResolve={handleAnnotationResolve}
              onAnnotationUpdate={handleUpdateAnnotation}
              onAnnotationDelete={handleDeleteAnnotation}
              hideToolbar
            />
          ) : isPdfMaterial(source) ? (
            // PDF nhưng không có URL display — vẫn fallback text
            <div
              className={`flex h-full flex-col items-center justify-center gap-3 p-8 text-center ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <FileText className="h-12 w-12 opacity-40" />
              <p className="text-sm">
                Tài liệu là PDF nhưng không tìm thấy URL hiển thị.
              </p>
            </div>
          ) : (
            // Non-PDF: render qua MaterialContentRenderer (image/audio/video player, markdown text)
            <div
              className={`h-full overflow-y-auto px-6 py-6 ${
                isDarkMode ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {contentLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm opacity-70">
                  <div
                    className={`h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${
                      isDarkMode ? "border-slate-500" : "border-slate-400"
                    }`}
                  />
                  <span>Đang tải nội dung...</span>
                </div>
              )}
              {!contentLoading && contentError && (
                <p
                  className={`text-center py-12 text-sm ${
                    isDarkMode ? "text-red-300" : "text-red-600"
                  }`}
                >
                  Không tải được nội dung tài liệu.
                </p>
              )}
              {!contentLoading && !contentError && extractedContent && (
                <MaterialContentRenderer
                  value={extractedContent.value}
                  type={source?.type || source?.materialType}
                  script={extractedContent.script}
                  scriptLabel="Lời thoại / Transcript"
                  isDarkMode={isDarkMode}
                />
              )}
              {!contentLoading && !contentError && !extractedContent && (
                <div
                  className={`flex h-full flex-col items-center justify-center gap-3 p-8 text-center ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  <FileText className="h-12 w-12 opacity-40" />
                  <p className="text-sm">Không có nội dung để hiển thị.</p>
                  <p className="text-xs opacity-70">
                    Loại:{" "}
                    {source?.type ||
                      source?.materialType ||
                      source?.contentType ||
                      "không xác định"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Floating: AI tutor (chỉ khi có highlight) - placeholder, wire later */}
          {/* <AITutorFab highlightedText="composition" currentChapter={9} /> */}
        </div>
      </section>

      {/* RIGHT SIDEBAR - segmented tabs share the same 440px slot without covering the PDF */}
      {treeOpen && showPdf && (
        <aside
          className={`flex flex-col overflow-hidden border-l ${
            isDarkMode ? "border-slate-800 bg-slate-900" : "border-blue-100"
          }`}
          style={
            !isDarkMode
              ? {
                  background:
                    "linear-gradient(180deg, #F0F7FF 0%, #E8F1FC 100%)",
                }
              : undefined
          }
        >
          {/* Segmented tab control - sliding active indicator */}
          <div className={`px-4 pt-4 pb-3 ${isDarkMode ? "" : ""}`}>
            <div
              className={`relative flex items-center p-1 rounded-xl ${
                isDarkMode
                  ? "bg-slate-800/70"
                  : "bg-white/70 backdrop-blur border border-blue-100 shadow-sm"
              }`}
            >
              {/* Sliding active indicator - tree=ocean blue, notes=orange, chat=green */}
              <div
                className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out"
                style={{
                  left: "0.25rem",
                  width: "calc((100% - 0.5rem) / 3)",
                  transform: `translateX(${sidebarTabIndex * 100}%)`,
                  background:
                    sidebarView === "chat"
                      ? "linear-gradient(135deg, #16A34A, #4ADE80)"
                      : sidebarView === "notes"
                        ? "linear-gradient(135deg, #F97316, #FB923C)"
                        : "linear-gradient(135deg, #1E3A8A, #2563EB)",
                  boxShadow:
                    sidebarView === "chat"
                      ? "0 4px 12px -4px rgba(22, 163, 74, 0.55)"
                      : sidebarView === "notes"
                        ? "0 4px 12px -4px rgba(249, 115, 22, 0.55)"
                        : "0 4px 12px -4px rgba(37, 99, 235, 0.55)",
                }}
              />

              <SegmentBtn
                active={sidebarView === "tree"}
                onClick={() => setSidebarView("tree")}
                isDarkMode={isDarkMode}
              >
                <Network size={13} className="-mt-px" />
                Cây kiến thức
              </SegmentBtn>
              <SegmentBtn
                active={sidebarView === "notes"}
                onClick={() => setSidebarView("notes")}
                isDarkMode={isDarkMode}
              >
                <MessageSquareText size={13} className="-mt-px" />
                Ghi chú
              </SegmentBtn>
              <SegmentBtn
                active={sidebarView === "chat"}
                onClick={() => setSidebarView("chat")}
                isDarkMode={isDarkMode}
              >
                <Sparkles size={13} className="-mt-px" />
                Hỏi AI
              </SegmentBtn>
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {sidebarView === "tree" && (
              <EmbeddedKnowledgeTree
                materialId={materialId}
                isDarkMode={isDarkMode}
                onLeafSelect={handleLeafSelect}
                totalPdfPages={totalPages}
                currentPdfPage={currentPage}
              />
            )}
            {sidebarView === "chat" && (
              <AskAIPanel
                materialId={materialId}
                materialTitle={sourceTitle}
                workspaceId={workspaceId}
                currentPage={currentPage}
                isDarkMode={isDarkMode}
                onJumpToPage={(page) => {
                  if (page == null) return;
                  setHighlightPageRange([page, page]);
                  pdfRef.current?.jumpToPage(page);
                  setCurrentPage(page);
                }}
              />
            )}
            {sidebarView === "notes" && (
              <NotesPanel
                isDarkMode={isDarkMode}
                annotations={sidebarNotes}
                notesError={notesError}
                selectedAnnotationId={selectedAnnotationId}
                onSelectAnnotation={handleOpenAnnotation}
                onCreateNote={handleCreateSidebarNote}
                onCreateFloatingNote={handleFloatingNoteSave}
                onUpdateAnnotation={handleUpdateAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
              />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function SegmentBtn({ active, onClick, isDarkMode, children }) {
  // Keep labels above the sliding indicator; the indicator handles the active layout.
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-colors duration-200 ${
        active
          ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]"
          : isDarkMode
            ? "text-slate-400 hover:text-slate-200"
            : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {children}
    </button>
  );
}

function NotesPanel({
  isDarkMode,
  annotations,
  notesError,
  selectedAnnotationId,
  onSelectAnnotation,
  onCreateNote,
  onCreateFloatingNote,
  onUpdateAnnotation,
  onDeleteAnnotation,
}) {
  const [editingAnnotationId, setEditingAnnotationId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [floatingNote, setFloatingNote] = useState(null);
  const floatingNoteElementRef = useRef(null);
  const floatingDragRef = useRef(null);
  const panelRef = useRef(null);
  const hasAnnotations = annotations.length > 0;

  const startFloatingNoteDrag = useCallback((event) => {
    if (!floatingNote) return;
    event.preventDefault();
    floatingDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      noteX: floatingNote.x,
      noteY: floatingNote.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [floatingNote]);

  const handleFloatingNoteDrag = useCallback((event) => {
    const drag = floatingDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setFloatingNote((previous) =>
      previous
        ? {
            ...previous,
            x: Math.max(12, drag.noteX + event.clientX - drag.startX),
            y: Math.max(12, drag.noteY + event.clientY - drag.startY),
          }
        : previous,
    );
  }, []);

  const stopFloatingNoteDrag = useCallback((event) => {
    if (floatingDragRef.current?.pointerId !== event.pointerId) return;
    floatingDragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    if (!floatingNoteElementRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const box = Array.isArray(entry.borderBoxSize)
        ? entry.borderBoxSize[0]
        : entry.borderBoxSize;
      const width = box?.inlineSize || entry.target.offsetWidth;
      const height = box?.blockSize || entry.target.offsetHeight;
      setFloatingNote((previous) =>
        previous
          ? {
              ...previous,
              width: Math.round(width),
              height: Math.round(height),
            }
          : previous,
      );
    });
    observer.observe(floatingNoteElementRef.current);
    return () => observer.disconnect();
  }, [floatingNote != null]);

  return (
    <div ref={panelRef} className="relative flex h-full flex-col">
      {notesError ? (
        <div
          className={`mx-4 mt-2 rounded-2xl border px-3 py-2 text-xs font-medium ${
            isDarkMode
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border-rose-200 bg-rose-50 text-rose-600"
          }`}
        >
          {notesError}
        </div>
      ) : null}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-2">
        {hasAnnotations ? (
          <div className="flex flex-col gap-3 pb-4">
            {annotations.map((annotation) => {
              const isSelected = annotation.id === selectedAnnotationId;
              const isEditing = editingAnnotationId === annotation.id;
              const isHighlight = annotation.noteType === "HIGHLIGHT";
              const noteTitle = isHighlight
                ? annotation.title || "Đoạn đã đánh dấu"
                : annotation.title || "Không có tiêu đề";
              const highlightedText =
                annotation.highlightedText || annotation.excerpt || "";

              return (
                <div
                  key={annotation.id}
                  data-annotation-interactive="true"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectAnnotation(annotation.id)}
                  onKeyDown={(event) => {
                    if (event.target?.closest?.("textarea,input,button")) {
                      return;
                    }
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onSelectAnnotation(annotation.id);
                  }}
                  className={`relative w-full overflow-hidden rounded-2xl border p-4 pr-20 text-left shadow-sm transition ${
                    isSelected
                      ? isDarkMode
                        ? isHighlight
                          ? "border-amber-400 bg-slate-900"
                          : "border-blue-500 bg-slate-900"
                        : isHighlight
                          ? "border-amber-400 bg-amber-50/40"
                          : "border-blue-400 bg-white"
                      : isDarkMode
                        ? isHighlight
                          ? "border-amber-500/30 bg-slate-900 hover:border-amber-400/60"
                          : "border-slate-800 bg-slate-900 hover:border-blue-500/60"
                        : isHighlight
                          ? "border-amber-200 bg-white hover:border-amber-300"
                          : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  {/* Left accent bar for highlight notes */}
                  {isHighlight && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 h-full w-1"
                      style={{
                        background:
                          "linear-gradient(180deg, #FCD34D 0%, #F59E0B 100%)",
                      }}
                    />
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${
                        isHighlight ? "" : "bg-orange-500"
                      }`}
                      style={
                        isHighlight
                          ? {
                              background:
                                "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
                            }
                          : undefined
                      }
                    >
                      {isHighlight ? <Highlighter size={15} /> : "N"}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isHighlight && (
                        <span
                          className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            isDarkMode
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <Highlighter size={9} strokeWidth={3} />
                          Đánh dấu
                        </span>
                      )}
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                          placeholder="Tên ghi chú (không bắt buộc)"
                          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-semibold outline-none transition ${
                            isDarkMode
                              ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                              : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400"
                          }`}
                        />
                      ) : (
                        <p
                          className={`truncate text-sm font-semibold ${
                            isDarkMode ? "text-slate-100" : "text-slate-900"
                          }`}
                        >
                          {noteTitle}
                        </p>
                      )}
                      {isHighlight && highlightedText && !isEditing && (
                        <blockquote
                          className={`mt-2 border-l-2 pl-2.5 text-xs italic leading-5 line-clamp-2 ${
                            isDarkMode
                              ? "border-amber-500/60 text-amber-100/80"
                              : "border-amber-400 text-slate-700"
                          }`}
                        >
                          <span
                            className="rounded px-0.5"
                            style={{
                              backgroundColor: isDarkMode
                                ? "rgba(252, 211, 77, 0.18)"
                                : "rgba(253, 224, 71, 0.55)",
                            }}
                          >
                            {highlightedText}
                          </span>
                        </blockquote>
                      )}
                      {isEditing ? (
                        <>
                          <textarea
                            value={editingContent}
                            autoFocus
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              setEditingContent(event.target.value)
                            }
                            placeholder="Nội dung ghi chú..."
                            className={`mt-3 min-h-[112px] w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition ${
                              isDarkMode
                                ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                                : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400"
                            }`}
                          />
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingAnnotationId(null);
                                setEditingTitle("");
                                setEditingContent("");
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
                              onClick={(event) => {
                                event.stopPropagation();
                                onUpdateAnnotation(annotation.id, {
                                  title: editingTitle,
                                  content: editingContent,
                                });
                                setEditingAnnotationId(null);
                                setEditingTitle("");
                                setEditingContent("");
                              }}
                              disabled={!editingContent.trim()}
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
                          className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          {annotation.content}
                        </p>
                      ) : (
                        <p
                          className={`mt-2 text-xs italic ${
                            isDarkMode ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          (Chưa có nội dung)
                        </p>
                      )}
                    </div>
                  </div>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectAnnotation(annotation.id);
                        setEditingAnnotationId(annotation.id);
                        setEditingTitle(
                          annotation.title &&
                            annotation.title !== "Không có tiêu đề"
                            ? annotation.title
                            : "",
                        );
                        setEditingContent(annotation.content || "");
                      }}
                      className={`absolute right-11 top-3 flex h-8 w-8 items-center justify-center rounded-full transition ${
                        isDarkMode
                          ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                          : "text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                      }`}
                      title="Chỉnh sửa ghi chú"
                    >
                      <Pencil size={15} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (annotation.id === editingAnnotationId) {
                        setEditingAnnotationId(null);
                        setEditingTitle("");
                        setEditingContent("");
                      }
                      onDeleteAnnotation(annotation.id);
                    }}
                    className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition ${
                      isDarkMode
                        ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                        : "text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                    }`}
                    title="Xóa ghi chú"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`flex min-h-full flex-col items-center justify-center px-6 text-center ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <MessageSquareText className="mb-3 h-12 w-12 opacity-35" />
            <p className="text-base font-semibold">Chưa có ghi chú tự do nào</p>
            <p className="mt-2 text-sm leading-6">
              Nhấn nút "+" ở góc phải dưới để tạo ghi chú mới. Ghi chú gắn với
              đoạn bôi đen sẽ hiện ngay dưới đoạn đó trong tài liệu.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        data-annotation-interactive="true"
        onClick={() => {
          onCreateNote();
          const width = 320;
          const height = 280;
          const FAB_RIGHT = 20;
          const FAB_BOTTOM = 20;
          const FAB_SIZE = 48;
          const GAP = 12;
          const panel = panelRef.current;
          const panelWidth = panel?.clientWidth || 440;
          const panelHeight = panel?.clientHeight || 640;
          const x = Math.max(12, panelWidth - FAB_RIGHT - width);
          const y = Math.max(
            12,
            panelHeight - FAB_BOTTOM - FAB_SIZE - GAP - height,
          );
          setFloatingNote({
            x,
            y,
            width,
            height,
            title: "",
            content: "",
          });
        }}
        className={`absolute bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_20px_40px_-24px_rgba(37,99,235,0.55)] transition ${
          isDarkMode
            ? "bg-blue-500 text-white hover:bg-blue-400"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        title="Tạo ghi chú"
      >
        <MessageSquareText className="h-5 w-5" />
      </button>

      {floatingNote ? (
        <div
          ref={floatingNoteElementRef}
          data-annotation-interactive="true"
          className={`absolute z-30 flex min-h-[180px] min-w-[240px] flex-col overflow-hidden rounded-3xl border shadow-[0_24px_70px_-32px_rgba(15,23,42,0.45)] ${
            isDarkMode
              ? "border-slate-700 bg-slate-900 text-slate-100"
              : "border-blue-200 bg-white text-slate-900"
          }`}
          style={{
            left: floatingNote.x,
            top: floatingNote.y,
            width: floatingNote.width,
            height: floatingNote.height,
            resize: "both",
          }}
        >
          <div
            className="flex cursor-move items-center justify-end px-2 pt-2"
            onPointerDown={startFloatingNoteDrag}
            onPointerMove={handleFloatingNoteDrag}
            onPointerUp={stopFloatingNoteDrag}
            onPointerCancel={stopFloatingNoteDrag}
          >
            <button
              type="button"
              onClick={() => setFloatingNote(null)}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-400 hover:bg-slate-100 hover:text-rose-600"
              }`}
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={floatingNote.title || ""}
            onChange={(event) =>
              setFloatingNote((previous) =>
                previous
                  ? { ...previous, title: event.target.value }
                  : previous,
              )
            }
            placeholder="Tên ghi chú (không bắt buộc)"
            className={`flex-shrink-0 px-4 py-2 text-sm font-bold outline-none border-b ${
              isDarkMode
                ? "bg-slate-900 text-slate-100 border-slate-800 placeholder:text-slate-500"
                : "bg-white text-slate-900 border-slate-100 placeholder:text-slate-400"
            }`}
          />
          <textarea
            value={floatingNote.content}
            onChange={(event) =>
              setFloatingNote((previous) =>
                previous
                  ? { ...previous, content: event.target.value }
                  : previous,
              )
            }
            placeholder="Nhập nội dung ghi chú..."
            className={`min-h-0 flex-1 resize-none px-4 py-3 text-sm outline-none ${
              isDarkMode
                ? "bg-slate-900 text-slate-100 placeholder:text-slate-500"
                : "bg-white text-slate-900 placeholder:text-slate-400"
            }`}
          />
          <div className="flex items-center justify-end gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setFloatingNote(null)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isDarkMode
                  ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!floatingNote.content.trim()}
              onClick={() => {
                onCreateFloatingNote({
                  title: floatingNote.title,
                  content: floatingNote.content,
                });
                setFloatingNote(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isDarkMode
                  ? "bg-blue-500 text-white hover:bg-blue-400"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Lưu
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
