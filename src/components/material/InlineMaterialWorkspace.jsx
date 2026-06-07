 import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
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
import ToastError from "@/components/system/ToastError";
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
//   - Right (440px sidebar): progress card + cÃ¢y kiáº¿n thá»©c chapter cards
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

function formatMaterialTypeLabel(source, t) {
  const rawType = String(
    source?.type || source?.materialType || source?.contentType || "",
  ).toLowerCase();
  const rawName = String(
    source?.name || source?.title || source?.originalFileName || "",
  ).toLowerCase();
  const combined = `${rawType} ${rawName}`;

  if (combined.includes("pdf")) return "PDF";
  if (
    combined.includes("wordprocessingml") ||
    combined.includes("msword") ||
    /\.(docx?|rtf)\b/.test(combined)
  ) {
    return t("workspace.material.types.word", "Word document");
  }
  if (
    combined.includes("spreadsheetml") ||
    combined.includes("excel") ||
    /\.(xlsx?|csv)\b/.test(combined)
  ) {
    return t("workspace.material.types.excel", "Excel spreadsheet");
  }
  if (
    combined.includes("presentationml") ||
    combined.includes("powerpoint") ||
    /\.(pptx?)\b/.test(combined)
  ) {
    return "PowerPoint";
  }
  if (combined.includes("image") || /\.(png|jpe?g|webp|gif|svg)\b/.test(combined)) {
    return t("workspace.material.types.image", "Image");
  }
  if (combined.includes("video") || /\.(mp4|webm|mov|avi|mkv)\b/.test(combined)) {
    return "Video";
  }
  if (combined.includes("audio") || /\.(mp3|wav|m4a|flac|aac|ogg)\b/.test(combined)) {
    return t("workspace.material.types.audio", "Audio");
  }
  if (combined.includes("text") || /\.(txt|md)\b/.test(combined)) {
    return t("workspace.material.types.text", "Text");
  }
  if (combined.includes("url") || combined.includes("link")) return t("workspace.material.types.link", "Link");

  return t("workspace.material.types.document", "Document");
}

function estimateNonPdfPageCount(extractedContent) {
  const text = String(extractedContent?.value || extractedContent?.script || "").trim();
  if (!text) return 1;

  const sheetCount = (text.match(/^#{1,3}\s*Sheet\s*:/gim) || []).length;
  if (sheetCount > 0) return sheetCount;

  const headingCount = (text.match(/^#{1,3}\s+\S.+$/gm) || []).length;
  if (headingCount > 1) return headingCount;

  return Math.max(1, Math.ceil(text.length / 2400));
}

function extractTextPayload(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload?.data === "string") return payload.data;
  if (typeof payload?.extractedText === "string") return payload.extractedText;
  if (typeof payload?.text === "string") return payload.text;
  if (typeof payload?.content === "string") return payload.content;
  if (typeof payload?.value === "string") return payload.value;
  if (typeof payload?.script === "string") return payload.script;
  if (typeof payload?.data?.extractedText === "string") return payload.data.extractedText;
  if (typeof payload?.data?.text === "string") return payload.data.text;
  if (typeof payload?.data?.content === "string") return payload.data.content;
  if (typeof payload?.data?.value === "string") return payload.data.value;
  return "";
}

function getCoverInitial(title) {
  if (!title) return "?";
  const t = title.trim();
  const match = t.match(/[\p{L}\p{N}]/u);
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
      ? note?.highlightedText || "Highlighted passage"
      : note?.title || "Free note",
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
    title: annotation.title || "Free note",
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
          Highlighted passage
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
        You just highlighted{" "}
        <b>
          "{highlightedText.slice(0, 30)}
          {highlightedText.length > 30 ? "..." : ""}"
        </b>
        {currentChapter && (
          <>
            {" "}
            ? this concept appears multiple times in chapter {currentChapter}.
            Do you want to review it quickly?
          </>
        )}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onJumpChapter}
          className="flex-1 px-3 py-2 rounded-lg bg-white text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 hover:bg-blue-50 transition"
        >
          Open chapter {currentChapter || ""}
        </button>
        <button
          type="button"
          onClick={onAsk}
          className="flex-1 px-3 py-2 rounded-lg bg-white/15 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-white/25 transition"
        >
          + Ask more
        </button>
      </div>
    </div>
  );
}

export default function InlineMaterialWorkspace({
  source,
  isDarkMode = false,
  onBack,
  initialPage = null,
  initialSearchText = "",
}) {
  const { t } = useTranslation();
  const sidebarTabs = ["tree", "notes", "chat"];

  // sidebarView: "tree" | "chat" | "notes" | null
  const [sidebarView, setSidebarView] = useState("tree");
  const [highlightPageRange, setHighlightPageRange] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [draftAnnotation, setDraftAnnotation] = useState(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [notesError, setNotesError] = useState(null);
  // Review banner state: status starts tá»« source nhÆ°ng cho phÃ©p update local sau khi approve.
  const [materialStatus, setMaterialStatus] = useState(
    String(source?.status || "").toUpperCase(),
  );
  const [moderationReport, setModerationReport] = useState(null);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  // Non-PDF content (extracted text cho docx/text, hoáº·c {url, transcript} cho media).
  const [extractedContent, setExtractedContent] = useState(null); // { value, script } | null
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState(false);
  const pdfRef = useRef(null);
  const nonPdfScrollRef = useRef(null);

  const treeOpen = sidebarView !== null;

  const pdfUrl = useMemo(() => pickPdfUrl(source), [source]);
  const materialId = source?.id || source?.materialId;
  const workspaceId =
    source?.workspaceId || source?.workspaceID || source?.workspace_id;
  const sourceTitle = source?.name || source?.title || t("workspace.material.types.document", "Document");
  const sourceMeta =
    source?.author || source?.uploaderName || source?.originalFileName || "";
  const materialTypeLabel = formatMaterialTypeLabel(source, t);
  const coverInitial = getCoverInitial(sourceTitle);
  const showPdf = isPdfMaterial(source) && pdfUrl;
  const nonPdfPageCount = useMemo(
    () => (showPdf ? 0 : estimateNonPdfPageCount(extractedContent)),
    [extractedContent, showPdf],
  );
  const displayTotalPages = showPdf ? totalPages : nonPdfPageCount;
  const showDocumentTools = showPdf || !isPdfMaterial(source);

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
        setNotesError(error?.message || t("workspace.material.notes.loadError", "Could not load notes"));
      });

    return () => {
      cancelled = true;
    };
  }, [materialId]);

  // Sync materialStatus khi source thay Ä‘á»•i (vd user navigate giá»¯a cÃ¡c material).
  useEffect(() => {
    setMaterialStatus(String(source?.status || "").toUpperCase());
    setReviewError(null);
  }, [source?.id, source?.status]);

  const isWarned = materialStatus === "WARN" || materialStatus === "WARNED";
  const isRejected = materialStatus === "REJECT" || materialStatus === "REJECTED";
  const hasModerationFlag = isWarned || isRejected;

  // Fetch moderation report khi material bá»‹ flag (WARN/REJECT) Ä‘á»ƒ hiá»ƒn thá»‹ reason/suggestion trong banner.
  useEffect(() => {
    if (!materialId || !hasModerationFlag) {
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
  }, [materialId, hasModerationFlag]);

  const handleReviewClick = useCallback(
    async (isApproved) => {
      if (!materialId || reviewLoading) return;
      setReviewLoading(true);
      setReviewError(null);
      try {
        await reviewMaterial(materialId, isApproved);
        // Banner sáº½ tá»± áº©n vÃ¬ materialStatus Ä‘á»•i sang ACTIVE/REJECTED â†’ isWarned = false.
        setMaterialStatus(isApproved ? "ACTIVE" : "REJECTED");
      } catch (error) {
        setReviewError(
          error?.response?.data?.message
            || error?.message
            || t("workspace.material.moderation.reviewError", "Could not review this material right now."),
        );
      } finally {
        setReviewLoading(false);
      }
    },
    [materialId, reviewLoading],
  );

  const moderationReason = moderationReport?.reason || source?.moderationSummary || null;
  const moderationSuggestion = moderationReport?.suggestion || null;

  // Fetch ná»™i dung cho non-PDF: media (image/audio/video) -> {url, transcript},
  // text/docx -> extracted markdown. Skip cho PDF (Ä‘Ã£ cÃ³ viewer riÃªng).
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
    Boolean(materialId) && !isPdfMaterial(source);

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
          // Media: thá»­ /content endpoint trÆ°á»›c (tráº£ {url, transcript})
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
        const text = extractTextPayload(res);
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

  const jumpToNonPdfPage = useCallback((page) => {
    const targetPage = Math.max(1, Math.min(nonPdfPageCount || 1, page));
    setCurrentPage(targetPage);

    const container = nonPdfScrollRef.current;
    if (!container) return;

    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const ratio = nonPdfPageCount > 1 ? (targetPage - 1) / (nonPdfPageCount - 1) : 0;
    container.scrollTo({
      top: Math.round(maxScrollTop * ratio),
      behavior: "smooth",
    });
  }, [nonPdfPageCount]);

  const handleTotalPagesChange = useCallback((total) => {
    setTotalPages(total);
  }, []);

  useEffect(() => {
    const targetPage = Number(initialPage);
    if (!Number.isInteger(targetPage) || targetPage <= 0 || !isPdfMaterial(source)) {
      return;
    }
    setHighlightPageRange([targetPage, targetPage]);
    setCurrentPage(targetPage);
  }, [initialPage, sourceTypeLower]);

  useEffect(() => {
    if (showPdf) return;
    setCurrentPage(1);
  }, [materialId, showPdf]);

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
        setNotesError(error?.message || t("workspace.material.notes.createError", "Could not create note"));
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
      const title = trimmedTitle || t("workspace.material.notes.untitled", "Untitled");
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
        setNotesError(error?.message || t("workspace.material.notes.createError", "Could not create note"));
      }
    },
    [currentPage, materialId, t],
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
      ? trimmedTitle || t("workspace.material.notes.untitled", "Untitled")
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
        setNotesError(error?.message || t("workspace.material.notes.updateError", "Could not update note"));
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
          setNotesError(error?.message || t("workspace.material.notes.deleteError", "Could not delete note"));
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

  // Sidebar Ghi chÃº = chá»‰ NORMAL note (ghi chÃº tá»± do). HIGHLIGHT hiá»‡n trong
  // PDF viewer (dÆ°á»›i Ä‘oáº¡n Ä‘Ã£ bÃ´i). Sort theo createdAt giáº£m dáº§n â€” note má»›i
  // nháº¥t á»Ÿ trÃªn cÃ¹ng, khÃ´ng phá»¥ thuá»™c trang/scroll PDF.
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

  return (
    <div
      onPointerDownCapture={handleWorkspacePointerDown}
      className={`grid h-full min-h-0 ${
        isDarkMode ? "bg-slate-950" : "bg-white"
      }`}
      style={{
        // Grid rows: top bar (60px) + optional review banner (auto) + main content (1fr).
        // Khi material khÃ´ng bá»‹ moderation flag, khÃ´ng táº¡o hÃ ng banner.
        gridTemplateRows: hasModerationFlag ? "60px auto 1fr" : "60px 1fr",
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
        <IconBtn onClick={onBack} title={t("common.back", "Back")} isDarkMode={isDarkMode}>
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
              {sourceMeta && <>{sourceMeta} ? </>}
              {displayTotalPages > 0 && <>{displayTotalPages} {t("workspace.material.pageUnit", "pages")}</>}
              <span
                className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                  isDarkMode
                    ? "bg-blue-900/40 text-blue-300"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {materialTypeLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-2" />

        {showDocumentTools && (
          <PageNavigator
            currentPage={currentPage}
            totalPages={displayTotalPages}
            onPrev={() => {
              const next = Math.max(1, currentPage - 1);
              if (showPdf) {
                setCurrentPage(next);
                pdfRef.current?.jumpToPage(next);
              } else {
                jumpToNonPdfPage(next);
              }
            }}
            onNext={() => {
              const next = Math.min(displayTotalPages || currentPage, currentPage + 1);
              if (showPdf) {
                setCurrentPage(next);
                pdfRef.current?.jumpToPage(next);
              } else {
                jumpToNonPdfPage(next);
              }
            }}
            isDarkMode={isDarkMode}
          />
        )}

      </div>

      {/* REVIEW BANNER â€” hiá»‡n khi material bá»‹ moderation flag (WARN/REJECT). */}
      {hasModerationFlag && (
        <div
          className={`col-span-full border-b px-5 py-2 ${
            isRejected
              ? (isDarkMode
                  ? "border-red-700/40 bg-red-950/30"
                  : "border-red-200 bg-red-50")
              : (isDarkMode
                  ? "border-amber-700/40 bg-amber-950/30"
                  : "border-amber-200 bg-amber-50")
          }`}
        >
          <div className="flex w-full flex-wrap items-start gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={`text-base font-semibold ${
                  isRejected
                    ? (isDarkMode ? "text-red-200" : "text-red-900")
                    : (isDarkMode ? "text-amber-200" : "text-amber-900")
                }`}
              >
                {isRejected
                  ? t("workspace.material.moderation.rejectedBanner", "⛔ This material is marked as not relevant to the learning goal.")
                  : t("workspace.material.moderation.warningBanner", "⚠️ This material is in warning status and needs your review.")}
              </p>
              {moderationLoading && !moderationReport && (
                <p
                  className={`mt-0.5 text-sm ${
                    isRejected
                      ? (isDarkMode ? "text-red-300/80" : "text-red-700")
                      : (isDarkMode ? "text-amber-300/80" : "text-amber-700")
                  }`}
                >
                  {t("workspace.material.moderation.loading", "Loading moderation report...")}
                </p>
              )}
              {moderationReason && (
                <p
                  className={`mt-0.5 text-sm leading-relaxed ${
                    isRejected
                      ? (isDarkMode ? "text-red-100" : "text-red-800")
                      : (isDarkMode ? "text-amber-100" : "text-amber-800")
                  }`}
                >
                  <span className="font-semibold">{t("workspace.material.moderation.reason", "Reason")}: </span>
                  {moderationReason}
                </p>
              )}
              {moderationSuggestion && (
                <p
                  className={`mt-0 text-sm leading-relaxed ${
                    isRejected
                      ? (isDarkMode ? "text-red-200/80" : "text-red-700")
                      : (isDarkMode ? "text-amber-200/80" : "text-amber-700")
                  }`}
                >
                  <span className="font-semibold">{t("workspace.material.moderation.suggestion", "Suggestion")}: </span>
                  {moderationSuggestion}
                </p>
              )}
              <ToastError message={reviewError} />
            </div>
            {isWarned && (
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
                  } text-sm`}
                >
                  {t("workspace.material.moderation.approve", "Approve")}
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
                  } text-sm`}
                >
                  {t("workspace.material.moderation.reject", "Reject")}
                </button>
              </div>
            )}
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
              initialPage={initialPage}
              initialSearchText={initialSearchText}
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
            // PDF nhÆ°ng khÃ´ng cÃ³ URL display â€” váº«n fallback text
            <div
              className={`flex h-full flex-col items-center justify-center gap-3 p-8 text-center ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <FileText className="h-12 w-12 opacity-40" />
              <p className="text-sm">
                {t("workspace.material.pdfMissingUrl", "This material is a PDF but no display URL was found.")}
              </p>
            </div>
          ) : (
            // Non-PDF: render qua MaterialContentRenderer (image/audio/video player, markdown text)
            <div
              ref={nonPdfScrollRef}
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
                  <span>{t("common.loading", "Loading...")}</span>
                </div>
              )}
              {!contentLoading && contentError && (
                <p
                  className={`text-center py-12 text-sm ${
                    isDarkMode ? "text-red-300" : "text-red-600"
                  }`}
                >
                  {t("workspace.material.contentLoadFailed", "Could not load material content.")}
                </p>
              )}
              {!contentLoading && !contentError && extractedContent && (
                <MaterialContentRenderer
                  value={extractedContent.value}
                  type={source?.type || source?.materialType}
                  script={extractedContent.script}
                  scriptLabel={t("workspace.material.transcriptLabel", "Transcript")}
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
                  <p className="text-sm">{t("workspace.material.noContent", "No content to display.")}</p>
                  <p className="text-xs opacity-70">
                    {t("workspace.material.typeLabel", "Type")}: {materialTypeLabel}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Floating: AI tutor (chá»‰ khi cÃ³ highlight) - placeholder, wire later */}
          {/* <AITutorFab highlightedText="composition" currentChapter={9} /> */}
        </div>
      </section>

      {/* RIGHT SIDEBAR - segmented tabs share the same 440px slot without covering the document */}
      {treeOpen && (
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
                {t("workspace.material.tree.title", "Knowledge Tree")}
              </SegmentBtn>
              <SegmentBtn
                active={sidebarView === "notes"}
                onClick={() => setSidebarView("notes")}
                isDarkMode={isDarkMode}
              >
                <MessageSquareText size={13} className="-mt-px" />
                {t("workspace.material.notes.tab", "Notes")}
              </SegmentBtn>
              <SegmentBtn
                active={sidebarView === "chat"}
                onClick={() => setSidebarView("chat")}
                isDarkMode={isDarkMode}
              >
                <Sparkles size={13} className="-mt-px" />
                {t("workspace.material.askAi.tab", "Ask AI")}
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
                t={t}
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
  t,
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
      <ToastError message={notesError} />
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-2">
        {hasAnnotations ? (
          <div className="flex flex-col gap-3 pb-4">
            {annotations.map((annotation) => {
              const isSelected = annotation.id === selectedAnnotationId;
              const isEditing = editingAnnotationId === annotation.id;
              const isHighlight = annotation.noteType === "HIGHLIGHT";
              const noteTitle = isHighlight
                ? annotation.title || t("workspace.material.notes.highlightedPassage", "Highlighted passage")
                : annotation.title || t("workspace.material.notes.untitled", "Untitled");
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
                          {t("workspace.material.notes.highlightBadge", "Highlight")}
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
                          placeholder={t("workspace.material.notes.titlePlaceholder", "Note title (optional)")}
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
                            placeholder={t("workspace.material.notes.contentPlaceholder", "Note content...")}
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
                              {t("common.cancel", "Cancel")}
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
                              {t("common.save", "Save")}
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
                          {t("workspace.material.notes.emptyContent", "(No content yet)")}
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
                            annotation.title !== t("workspace.material.notes.untitled", "Untitled")
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
                      title={t("workspace.material.notes.editTitle", "Edit note")}
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
                    title={t("workspace.material.notes.deleteTitle", "Delete note")}
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
            <p className="text-base font-semibold">{t("workspace.material.notes.emptyFreeTitle", "No free notes yet")}</p>
            <p className="mt-2 text-sm leading-6">
              {t("workspace.material.notes.emptyFreeDescription", "Press the + button in the bottom-right corner to create a new note. Notes attached to highlighted text will appear directly under that passage in the material.")}

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
        title={t("workspace.material.notes.createTitle", "Create note")}
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
              title={t("common.close", "Close")}
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
            placeholder={t("workspace.material.notes.titlePlaceholder", "Note title (optional)")}
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
            placeholder={t("workspace.material.notes.contentInputPlaceholder", "Enter note content...")}
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
              {t("common.cancel", "Cancel")}
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
              {t("common.save", "Save")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

