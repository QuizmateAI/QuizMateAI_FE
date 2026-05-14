import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Highlighter,
  MessageSquareText,
  Maximize2,
  MoreHorizontal,
  Network,
  Pencil,
  Sparkles,
  X,
  PanelRightClose,
  FileText,
} from "lucide-react";

import MaterialPdfViewer from "./MaterialPdfViewer";
import EmbeddedKnowledgeTree from "./EmbeddedKnowledgeTree";
import AskAIPanel from "./AskAIPanel";
import {
  createMaterialNote,
  deleteMaterialNote,
  listMaterialNotes,
  updateMaterialNote,
} from "../../api/MaterialNoteAPI";

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

function mapMaterialNoteToAnnotation(note, fallbackPage = 1) {
  const isHighlight = note?.noteType === "HIGHLIGHT";
  return {
    id: note?.noteId ? `server-note:${note.noteId}` : createAnnotationId(),
    noteId: note?.noteId,
    kind: "note",
    page: fallbackPage,
    excerpt: isHighlight
      ? note?.highlightedText || "Đoạn đã đánh dấu"
      : note?.title || "Ghi chú tự do",
    topRatio: 0.12,
    source: isHighlight ? "server-highlight" : "floating",
    selectionRects: [],
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
    };
  }

  return {
    materialId: Number(materialId),
    noteType: "NORMAL",
    title: annotation.title || "Ghi chú tự do",
    content: annotation.content || "",
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
          ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900 shadow-[0_4px_10px_-4px_rgba(245,158,11,0.45)]"
          : isDarkMode
            ? "text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
            : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
      }`}
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
  const [annotations, setAnnotations] = useState([]);
  const [draftAnnotation, setDraftAnnotation] = useState(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [annotationLayouts, setAnnotationLayouts] = useState({});
  const [notesError, setNotesError] = useState(null);
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

  const handleAnnotationLayoutChange = useCallback((layouts) => {
    setAnnotationLayouts(layouts);
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

  const handleDraftContentChange = useCallback((content) => {
    pdfRef.current?.updateDraftContent?.(content);
  }, []);

  const handleSaveDraft = useCallback(() => {
    pdfRef.current?.saveDraftAnnotation?.();
  }, []);

  const handleFloatingNoteSave = useCallback(
    async (content) => {
      if (!materialId) return;
      const annotation = {
        id: createAnnotationId(),
        kind: "note",
        page: currentPage,
        excerpt: "Ghi chú tự do",
        topRatio: 0.12,
        source: "floating",
        selectionRects: [],
        content: String(content || "").trim(),
        title: "Ghi chú tự do",
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

  const handleUpdateAnnotation = useCallback((annotationId, content) => {
    const nextContent = String(content || "").trim();
    let targetNoteId = null;

    setAnnotations((previous) =>
      previous.map((annotation) => {
        if (annotation.id !== annotationId) return annotation;
        targetNoteId = annotation.noteId;
        return { ...annotation, content: nextContent };
      }),
    );

    if (targetNoteId) {
      setNotesError(null);
      updateMaterialNote(targetNoteId, { content: nextContent }).catch(
        (error) => {
          setNotesError(error?.message || "Không cập nhật được ghi chú");
        },
      );
    }
  }, []);

  const handleNotesWheel = useCallback((event) => {
    event.preventDefault();
    pdfRef.current?.scrollByDelta?.(event.deltaY);
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

  const sortedAnnotations = useMemo(() => {
    const annotationItems = draftAnnotation
      ? [draftAnnotation, ...annotations]
      : [...annotations];

    return annotationItems.sort((left, right) => {
      const pageDiff = Number(left.page || 0) - Number(right.page || 0);
      if (pageDiff !== 0) return pageDiff;

      const topDiff =
        Number(left.topRatio || 0) - Number(right.topRatio || 0);
      if (topDiff !== 0) return topDiff;

      if (left.status === "draft" && right.status !== "draft") return -1;
      if (right.status === "draft" && left.status !== "draft") return 1;

      return (
        new Date(left.createdAt || 0).getTime() -
        new Date(right.createdAt || 0).getTime()
      );
    });
  }, [annotations, draftAnnotation]);
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
        gridTemplateRows: "60px 1fr",
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

        <div className="flex-1 min-w-2" />

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

        <IconBtn
          isDarkMode={isDarkMode}
          title="Toàn màn hình"
          onClick={() => setSidebarView((v) => (v === null ? "tree" : null))}
        >
          {treeOpen ? <Maximize2 size={16} /> : <PanelRightClose size={16} />}
        </IconBtn>
        <IconBtn isDarkMode={isDarkMode} title="Thêm">
          <MoreHorizontal size={16} />
        </IconBtn>
      </div>

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
              onAnnotationLayoutChange={handleAnnotationLayoutChange}
              onAnnotationResolve={handleAnnotationResolve}
              hideToolbar
            />
          ) : (
            <div
              className={`flex h-full flex-col items-center justify-center gap-3 p-8 text-center ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <FileText className="h-12 w-12 opacity-40" />
              <p className="text-sm">
                {isPdfMaterial(source)
                  ? "Tài liệu là PDF nhưng không tìm thấy URL hiển thị."
                  : "Material này không phải PDF, không thể hiển thị inline."}
              </p>
              <p className="text-xs opacity-70">
                Loáº¡i:{" "}
                {source?.type ||
                  source?.materialType ||
                  source?.contentType ||
                  "không xác định"}
              </p>
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
              {/* Sliding active indicator */}
              <div
                className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out shadow-[0_4px_12px_-4px_rgba(37,99,235,0.5)]"
                style={{
                  left: "0.25rem",
                  width: "calc((100% - 0.5rem) / 3)",
                  transform: `translateX(${sidebarTabIndex * 100}%)`,
                  background:
                    sidebarView === "chat"
                      ? "linear-gradient(135deg, #2563EB, #06B6D4)"
                      : sidebarView === "notes"
                        ? "linear-gradient(135deg, #F97316, #FB923C)"
                        : "linear-gradient(135deg, #FFFFFF, #F0F7FF)",
                  border:
                    sidebarView === "tree" && !isDarkMode
                      ? "1px solid #DBEAFE"
                      : "none",
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
                accent
              >
                <Sparkles size={13} className="-mt-px" />
                Hỏi AI
              </SegmentBtn>
              <button
                type="button"
                onClick={() => setSidebarView(null)}
                title="Đóng sidebar"
                className={`absolute -right-1 -top-1 w-5 h-5 rounded-full inline-flex items-center justify-center transition shadow-md ${
                  isDarkMode
                    ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    : "bg-white text-slate-500 hover:text-rose-600 border border-slate-200"
                }`}
              >
                <X size={11} strokeWidth={3} />
              </button>
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
                annotations={sortedAnnotations}
                annotationLayouts={annotationLayouts}
                totalPages={totalPages}
                notesError={notesError}
                selectedAnnotationId={selectedAnnotationId}
                onSelectAnnotation={handleOpenAnnotation}
                onCreateNote={handleCreateSidebarNote}
                onCreateFloatingNote={handleFloatingNoteSave}
                onDraftChange={handleDraftContentChange}
                onSaveDraft={handleSaveDraft}
                onUpdateAnnotation={handleUpdateAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                onWheel={handleNotesWheel}
              />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function SegmentBtn({ active, onClick, isDarkMode, children, accent = false }) {
  // Keep labels above the sliding indicator; the indicator handles the active layout.
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-colors duration-200 ${
        active
          ? accent
            ? "text-white"
            : isDarkMode
              ? "text-slate-100"
              : "text-blue-700"
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
  annotationLayouts,
  totalPages,
  notesError,
  selectedAnnotationId,
  onSelectAnnotation,
  onCreateNote,
  onCreateFloatingNote,
  onDraftChange,
  onSaveDraft,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onWheel,
}) {
  const [editingAnnotationId, setEditingAnnotationId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [floatingNote, setFloatingNote] = useState(null);
  const floatingNoteElementRef = useRef(null);
  const floatingDragRef = useRef(null);
  const hasAnnotations = annotations.length > 0;
  const positionedAnnotations = useMemo(() => {
    const fallbackPageUnit = 220;
    const sidebarOffset = 64;
    const minimumGap = 20;
    const layout = annotations.reduce(
      (result, annotation) => {
        const liveLayout = annotationLayouts?.[annotation.id];
        const pagePosition =
          Math.max(1, Number(annotation.page || 1)) - 1 +
          Number(annotation.topRatio || 0);
        const isEditing = editingAnnotationId === annotation.id;
        const estimatedHeight =
          annotation.status === "draft" || isEditing
            ? 340
            : annotation.kind === "emoji"
              ? 138
              : 214;
        const baseTop =
          typeof liveLayout?.top === "number"
            ? Math.round(liveLayout.top - sidebarOffset)
            : Math.round(pagePosition * fallbackPageUnit);
        const top = Math.max(
          baseTop,
          result.previousBottom == null
            ? baseTop
            : result.previousBottom + minimumGap,
        );

        return {
          previousBottom: top + estimatedHeight,
          items: [...result.items, { annotation, top }],
        };
      },
      { previousBottom: null, items: [] },
    );

    return {
      items: layout.items,
      trackHeight: Math.max(
        (Math.max(1, Number(totalPages || 1)) * fallbackPageUnit) + 120,
        Number(layout.previousBottom || 0) + 32,
      ),
    };
  }, [annotationLayouts, annotations, editingAnnotationId, totalPages]);

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
    <div className="relative flex h-full flex-col" onWheel={onWheel}>
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
      <div className="relative flex-1 overflow-hidden px-4 pb-20">
        {hasAnnotations ? (
          <div
            className="relative h-full pb-4"
            style={{ minHeight: `${positionedAnnotations.trackHeight}px` }}
          >
            <div
              aria-hidden="true"
              className={`absolute bottom-0 left-6 top-0 w-px ${
                isDarkMode ? "bg-slate-800" : "bg-blue-100"
              }`}
            />
            {positionedAnnotations.items.map(({ annotation, top }) => {
              const isSelected = annotation.id === selectedAnnotationId;
              const isEmoji = annotation.kind === "emoji";
              const isDraft = annotation.status === "draft";
              const isEditing = editingAnnotationId === annotation.id;

              return (
                <div
	                  key={annotation.id}
                    data-annotation-interactive="true"
	                  className="absolute left-0 right-0"
                  style={{ top: `${top}px` }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectAnnotation(annotation.id)}
                    onKeyDown={(event) => {
                      if (
                        event.target?.closest?.("textarea,input,button")
                      ) {
                        return;
                      }
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onSelectAnnotation(annotation.id);
                    }}
                    className={`w-full rounded-[26px] border bg-white p-4 pr-20 text-left shadow-sm transition ${
                      isSelected
                        ? "border-blue-400 text-slate-900"
                        : "border-slate-200 text-slate-900 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        aria-hidden="true"
                        className={`mt-5 h-px w-5 shrink-0 ${
                          isDarkMode ? "bg-slate-700" : "bg-blue-200"
                        }`}
                      />
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                        {isEmoji ? annotation.emoji : "N"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
	                            {isEmoji
                              ? "Biểu tượng"
	                              : isDraft
	                                ? "Ghi chú mới"
	                                : "Ghi chú"}
                          </p>
                          <div className="flex items-center gap-2">
                            {isDraft ? (
                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  isDarkMode
                                    ? "bg-amber-500/15 text-amber-200"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                Đang soạn
                              </span>
                            ) : null}
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                                isDarkMode
                                  ? "bg-slate-800 text-slate-300"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              Trang {annotation.page}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`mt-1 line-clamp-3 text-xs leading-5 ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {annotation.excerpt}
                        </p>
                        {isDraft ? (
                          <>
                            <textarea
                              value={annotation.content || ""}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                onDraftChange(event.target.value)
                              }
                              placeholder="Viết ghi chú tại đây..."
                              className={`mt-4 min-h-[136px] w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                                isDarkMode
                                  ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400"
                              }`}
                            />
                            <div className="mt-4 flex items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteAnnotation(annotation.id);
                                }}
                                className={`text-sm font-semibold transition ${
                                  isDarkMode
                                    ? "text-slate-300 hover:text-white"
                                    : "text-blue-600 hover:text-blue-700"
                                }`}
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onSaveDraft();
                                }}
                                disabled={!annotation.content?.trim()}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isDarkMode
                                    ? "bg-slate-700 text-slate-100"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                Lưu ghi chú
                              </button>
                            </div>
                          </>
                        ) : isEditing ? (
                          <>
                            <textarea
                              value={editingContent}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                setEditingContent(event.target.value)
                              }
                              className={`mt-4 min-h-[112px] w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                                isDarkMode
                                  ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400"
                              }`}
                            />
                            <div className="mt-4 flex items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingAnnotationId(null);
                                  setEditingContent("");
                                }}
                                className={`text-sm font-semibold transition ${
                                  isDarkMode
                                    ? "text-slate-300 hover:text-white"
                                    : "text-blue-600 hover:text-blue-700"
                                }`}
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onUpdateAnnotation(
                                    annotation.id,
                                    editingContent,
                                  );
                                  setEditingAnnotationId(null);
                                  setEditingContent("");
                                }}
                                disabled={!editingContent.trim()}
                                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isDarkMode
                                    ? "bg-blue-500 text-white hover:bg-blue-400"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              >
                                <Check size={15} />
                                Lưu
                              </button>
                            </div>
                          </>
                        ) : !isEmoji ? (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                            {annotation.content}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {!isDraft && !isEmoji && !isEditing ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectAnnotation(annotation.id);
                        setEditingAnnotationId(annotation.id);
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
            <p className="text-base font-semibold">Chưa có ghi chú nào</p>
            <p className="mt-2 text-sm leading-6">
              Di chuột hoặc quét nội dung trong tài liệu để đặt ghi chú và biểu
              tượng.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        data-annotation-interactive="true"
        onClick={() => {
          onCreateNote();
          setFloatingNote({
            x: 42,
            y: 84,
            width: 300,
            height: 220,
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
            className={`flex cursor-move items-center justify-between border-b px-4 py-3 ${
              isDarkMode ? "border-slate-800" : "border-slate-100"
            }`}
            onPointerDown={startFloatingNoteDrag}
            onPointerMove={handleFloatingNoteDrag}
            onPointerUp={stopFloatingNoteDrag}
            onPointerCancel={stopFloatingNoteDrag}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText className="h-4 w-4 text-blue-500" />
              Ghi chú mới
            </div>
            <button
              type="button"
              onClick={() => setFloatingNote(null)}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-400 hover:bg-slate-100 hover:text-rose-600"
              }`}
              title="Đóng"
            >
              <X size={15} />
            </button>
          </div>
          <textarea
            value={floatingNote.content}
            onChange={(event) =>
              setFloatingNote((previous) =>
                previous
                  ? { ...previous, content: event.target.value }
                  : previous,
              )
            }
            placeholder="Nhập ghi chú..."
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
                onCreateFloatingNote(floatingNote.content);
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
