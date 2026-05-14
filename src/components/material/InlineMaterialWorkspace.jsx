import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Highlighter,
  Maximize2,
  MessageSquareText,
  MoreHorizontal,
  Network,
  Sparkles,
  X,
  PanelRightClose,
  FileText,
} from "lucide-react";

import MaterialPdfViewer from "./MaterialPdfViewer";
import EmbeddedKnowledgeTree from "./EmbeddedKnowledgeTree";
import AskAIPanel from "./AskAIPanel";

// ============================================================================
// InlineMaterialWorkspace — Variant C redesign:
//   - Top bar: book cover + title + tag + page navigator + actions
//   - Left (main): sub-toolbar (breadcrumb + actions) + PDF + floating CTAs
//   - Right (440px sidebar): progress card + cây kiến thức chapter cards
// ============================================================================

function pickPdfUrl(source) {
  if (!source) return null;
  const candidates = [
    source.storageURL, source.storageUrl, source.storage_url,
    source.fileURL, source.fileUrl, source.file_url,
    source.materialUrl, source.material_url,
    source.downloadURL, source.downloadUrl, source.download_url,
    source.r2Url, source.r2_url,
    source.url, source.link,
    source.contentURL, source.contentUrl, source.content_url,
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
  const type = String(source.type || source.materialType || source.contentType || "").toLowerCase();
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

function PageNavigator({ currentPage, totalPages, onPrev, onNext, isDarkMode }) {
  return (
    <div className={`flex items-center gap-1 rounded-xl p-1 ${
      isDarkMode ? "bg-slate-800" : "bg-slate-100"
    }`}>
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage <= 1}
        className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition ${
          isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-200"
        }`}
      >
        <ChevronLeft size={14} />
      </button>
      <div className={`px-3 py-1 rounded-md text-[13px] font-extrabold tabular-nums shadow-sm ${
        isDarkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
      }`}>
        <span className={isDarkMode ? "text-cyan-300" : "text-blue-700"}>{currentPage}</span>
        <span className="text-slate-400 mx-1">/</span>
        {totalPages || "?"}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= (totalPages || 1)}
        className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition ${
          isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-200"
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
function AITutorFab({ highlightedText, currentChapter, onJumpChapter, onAsk, onClose }) {
  if (!highlightedText) return null;
  return (
    <div className="absolute left-6 bottom-6 w-[360px] bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-4 shadow-[0_20px_40px_-12px_rgba(37,99,235,0.5),0_4px_12px_-4px_rgba(37,99,235,0.3)]">
      <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase opacity-95">
        <Sparkles size={14} />
        AI Tutor
        <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">ĐOẠN VỪA HIGHLIGHT</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto w-5.5 h-5.5 rounded-full bg-white/15 inline-flex items-center justify-center"
        >
          <X size={12} />
        </button>
      </div>
      <p className="text-sm font-semibold leading-relaxed my-3">
        Bạn vừa đánh dấu <b>"{highlightedText.slice(0, 30)}{highlightedText.length > 30 ? "…" : ""}"</b>
        {currentChapter && <> — khái niệm này quay lại nhiều lần ở chương {currentChapter}. Bạn muốn xem lại nhanh không?</>}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onJumpChapter}
          className="flex-1 px-3 py-2 rounded-lg bg-white text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 hover:bg-blue-50 transition"
        >
          ✓ Có, mở chương {currentChapter || ""}
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
  // sidebarView: "tree" | "chat" | null (null = collapsed cho max PDF area)
  // Default "tree" — đúng spec Variant C. User toggle qua pill "Hỏi AI" hoặc tab.
  const [sidebarView, setSidebarView] = useState("tree");
  const [highlightPageRange, setHighlightPageRange] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTool, setActiveTool] = useState("highlight");
  const pdfRef = useRef(null);

  const treeOpen = sidebarView !== null;

  const pdfUrl = useMemo(() => pickPdfUrl(source), [source]);
  const materialId = source?.id || source?.materialId;
  const workspaceId = source?.workspaceId || source?.workspaceID || source?.workspace_id;
  const sourceTitle = source?.name || source?.title || "Tài liệu";
  const sourceMeta = source?.author || source?.uploaderName || source?.originalFileName || "";
  const pdfTag = (source?.type || source?.materialType || "PDF").split("/").pop().toUpperCase();
  const coverInitial = getCoverInitial(sourceTitle);

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

  const showPdf = isPdfMaterial(source) && pdfUrl;

  return (
    <div className={`grid h-full min-h-0 ${
      isDarkMode ? "bg-slate-950" : "bg-white"
    }`} style={{
      gridTemplateRows: "60px 1fr",
      gridTemplateColumns: treeOpen ? "1fr 440px" : "1fr",
    }}>
      {/* TOP BAR */}
      <div className={`col-span-full flex items-center gap-3 px-5 border-b ${
        isDarkMode ? "border-slate-800 bg-slate-950" : "border-blue-100 bg-white"
      }`}>
        <IconBtn onClick={onBack} title="Quay lại" isDarkMode={isDarkMode}>
          <ArrowLeft size={16} />
        </IconBtn>

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-10 flex-shrink-0 relative rounded shadow-[0_4px_12px_-4px_rgba(30,58,138,0.45)]"
            style={{ background: "linear-gradient(135deg, #1E3A8A, #2563EB)" }}>
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[13px]">
              {coverInitial}
            </span>
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-extrabold tracking-tight leading-tight truncate max-w-[280px] ${
              isDarkMode ? "text-slate-100" : "text-slate-900"
            }`}>
              {sourceTitle}
            </div>
            <div className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1.5 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}>
              {sourceMeta && <>{sourceMeta} · </>}
              {totalPages > 0 && <>{totalPages} trang</>}
              <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                isDarkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"
              }`}>
                {pdfTag}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-2" />

        {/* TOOL PILLS — moved up from old sub-toolbar */}
        {showPdf && (
          <div className="flex items-center gap-1">
            <ToolPill icon={Highlighter} label="Highlight" active={activeTool === "highlight"}
              onClick={() => setActiveTool(activeTool === "highlight" ? null : "highlight")}
              isDarkMode={isDarkMode} />
            <ToolPill icon={MessageSquareText} label="Ghi chú" active={activeTool === "note"}
              onClick={() => setActiveTool(activeTool === "note" ? null : "note")}
              isDarkMode={isDarkMode} />
            <ToolPill icon={Headphones} label="Nghe" active={activeTool === "listen"}
              onClick={() => setActiveTool(activeTool === "listen" ? null : "listen")}
              isDarkMode={isDarkMode} />
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

        <IconBtn isDarkMode={isDarkMode} title="Toàn màn hình"
          onClick={() => setSidebarView((v) => (v === null ? "tree" : null))}>
          {treeOpen ? <Maximize2 size={16} /> : <PanelRightClose size={16} />}
        </IconBtn>
        <IconBtn isDarkMode={isDarkMode} title="Thêm"><MoreHorizontal size={16} /></IconBtn>
      </div>

      {/* MAIN READING AREA */}
      <section className={`flex flex-col overflow-hidden relative ${
        isDarkMode ? "bg-slate-900" : ""
      }`} style={!isDarkMode ? { background: "linear-gradient(180deg, #F1F5FB, #E5ECF6)" } : undefined}>
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
              hideToolbar
            />
          ) : (
            <div className={`flex h-full flex-col items-center justify-center gap-3 p-8 text-center ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}>
              <FileText className="h-12 w-12 opacity-40" />
              <p className="text-sm">
                {isPdfMaterial(source)
                  ? "Tài liệu là PDF nhưng không tìm thấy URL hiển thị."
                  : "Material này không phải PDF, không thể hiển thị inline."}
              </p>
              <p className="text-xs opacity-70">
                Loại: {source?.type || source?.materialType || source?.contentType || "không xác định"}
              </p>
            </div>
          )}

          {/* Floating: AI tutor (chỉ khi có highlight) — placeholder, wire later */}
          {/* <AITutorFab highlightedText="composition" currentChapter={9} /> */}
        </div>
      </section>

      {/* RIGHT SIDEBAR — Segmented control giữa Tree và Chat (share 440px slot, không che PDF) */}
      {treeOpen && showPdf && (
        <aside className={`flex flex-col overflow-hidden border-l ${
          isDarkMode ? "border-slate-800 bg-slate-900" : "border-blue-100"
        }`}
        style={!isDarkMode ? { background: "linear-gradient(180deg, #F0F7FF 0%, #E8F1FC 100%)" } : undefined}>
          {/* Segmented tab control — sliding active indicator */}
          <div className={`px-4 pt-4 pb-3 ${
            isDarkMode ? "" : ""
          }`}>
            <div className={`relative flex items-center p-1 rounded-xl ${
              isDarkMode ? "bg-slate-800/70" : "bg-white/70 backdrop-blur border border-blue-100 shadow-sm"
            }`}>
              {/* Sliding active indicator */}
              <div
                className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out shadow-[0_4px_12px_-4px_rgba(37,99,235,0.5)]"
                style={{
                  left: sidebarView === "tree" ? "0.25rem" : "calc(50% + 0.125rem)",
                  width: "calc(50% - 0.375rem)",
                  background: sidebarView === "chat"
                    ? "linear-gradient(135deg, #2563EB, #06B6D4)"
                    : "linear-gradient(135deg, #FFFFFF, #F0F7FF)",
                  border: sidebarView === "tree" && !isDarkMode ? "1px solid #DBEAFE" : "none",
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
          </div>
        </aside>
      )}
    </div>
  );
}

function SegmentBtn({ active, onClick, isDarkMode, children, accent = false }) {
  // Z-10 để label nằm trên sliding indicator. Active state đổi màu chữ; layout do indicator phụ trách.
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-colors duration-200 ${
        active
          ? accent
            ? "text-white"
            : isDarkMode ? "text-slate-100" : "text-blue-700"
          : isDarkMode
            ? "text-slate-400 hover:text-slate-200"
            : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {children}
    </button>
  );
}
