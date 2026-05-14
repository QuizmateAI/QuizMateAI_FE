import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, FileText } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ============================================================================
// MaterialPdfViewer — inline PDF viewer voi jump-to-page API qua ref.
//
// Usage:
//   const viewerRef = useRef();
//   <MaterialPdfViewer ref={viewerRef} fileUrl={url} highlightPageRange={[5, 8]} />
//   viewerRef.current.jumpToPage(7)  // scroll + flash highlight
//
// Tech: react-pdf wraps Mozilla pdf.js. Render each page voi virtualization
// nhe (chi mount visible + adjacent pages) cho doc dai (>100 trang).
//
// highlightPageRange: tuple [start, end] (1-indexed, inclusive). Pages
// trong range overlay tint mau xanh nhat — corresponds to current leaf.
// ============================================================================

// PDF.js worker — local copy from node_modules to avoid CDN cold start.
// Vite serves /node_modules path via dev server; production build copy to public/.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const PDF_OPTIONS = {
  // Reduce memory cho doc dai
  disableAutoFetch: false,
  disableStream: false,
};

const MaterialPdfViewer = forwardRef(function MaterialPdfViewer(
  {
    fileUrl,
    highlightPageRange = null,
    onPageChange,
    onTotalPagesChange,
    isDarkMode = false,
    initialScale = 1.0,
    hideToolbar = false,
  },
  ref,
) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(initialScale);
  const [loadError, setLoadError] = useState(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef(null);
  const pageRefs = useRef(new Map());
  const flashTimerRef = useRef(null);
  const [flashedPage, setFlashedPage] = useState(null);

  // Imperative API for parent: scroll a page into view + flash highlight
  useImperativeHandle(ref, () => ({
    jumpToPage(pageNum) {
      const target = Math.max(1, Math.min(numPages || pageNum, pageNum));
      setCurrentPage(target);
      const el = pageRefs.current.get(target);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // Flash highlight ~1.5s sau khi scroll
      setFlashedPage(target);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashedPage(null), 1800);
    },
    getCurrentPage() {
      return currentPage;
    },
    getTotalPages() {
      return numPages;
    },
  }), [numPages, currentPage]);

  // Track container width cho responsive page rendering
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.max(320, entry.contentRect.width - 32));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Detect current visible page khi user scroll manually
  useEffect(() => {
    if (!containerRef.current || numPages === 0) return undefined;
    const container = containerRef.current;
    const onScroll = () => {
      const containerRect = container.getBoundingClientRect();
      let bestPage = currentPage;
      let bestDelta = Infinity;
      for (const [pageNum, el] of pageRefs.current.entries()) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const delta = Math.abs(rect.top - containerRect.top);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestPage = pageNum;
        }
      }
      if (bestPage !== currentPage) {
        setCurrentPage(bestPage);
        onPageChange?.(bestPage);
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [numPages, currentPage, onPageChange]);

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  const fileSpec = useMemo(() => ({ url: fileUrl }), [fileUrl]);

  const handleDocLoad = useCallback(({ numPages: total }) => {
    setNumPages(total);
    setLoadError(null);
    onTotalPagesChange?.(total);
  }, [onTotalPagesChange]);

  const handleDocError = useCallback((error) => {
    setLoadError(error?.message || String(error));
  }, []);

  const isHighlighted = useCallback((pageNum) => {
    if (!highlightPageRange) return false;
    const [start, end] = highlightPageRange;
    return pageNum >= start && pageNum <= end;
  }, [highlightPageRange]);

  if (!fileUrl) {
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
        <FileText className="h-12 w-12 opacity-40" />
        <p className="text-sm">Chưa có file PDF để hiển thị</p>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>
      {/* Toolbar */}
      {!hideToolbar && (
      <div className={`flex items-center justify-between px-3 py-2 border-b shrink-0 ${
        isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
      }`}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = Math.max(1, currentPage - 1);
              setCurrentPage(next);
              const el = pageRefs.current.get(next);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            disabled={currentPage <= 1}
            className={`p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "text-slate-700"}`}
            aria-label="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className={`text-xs font-medium tabular-nums px-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            {currentPage} / {numPages || "?"}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = Math.min(numPages || currentPage, currentPage + 1);
              setCurrentPage(next);
              const el = pageRefs.current.get(next);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            disabled={currentPage >= numPages}
            className={`p-1.5 rounded disabled:opacity-40 ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-200 text-slate-700"}`}
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
            className={`p-1.5 rounded ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-200 text-slate-700"}`}
            aria-label="Thu nhỏ"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className={`text-xs tabular-nums w-12 text-center ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3.0, s + 0.15))}
            className={`p-1.5 rounded ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-200 text-slate-700"}`}
            aria-label="Phóng to"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>
      )}

      {/* Pages list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto py-4 px-4">
        {loadError ? (
          <div className={`flex h-full flex-col items-center justify-center gap-2 ${isDarkMode ? "text-rose-300" : "text-rose-600"}`}>
            <FileText className="h-12 w-12 opacity-50" />
            <p className="text-sm">Không tải được PDF: {loadError}</p>
          </div>
        ) : (
          <Document
            file={fileSpec}
            onLoadSuccess={handleDocLoad}
            onLoadError={handleDocError}
            loading={
              <div className={`flex flex-col items-center gap-2 py-12 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Đang tải PDF...</p>
              </div>
            }
            options={PDF_OPTIONS}
          >
            <div className="flex flex-col items-center gap-4">
              {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((pageNum) => {
                const highlighted = isHighlighted(pageNum);
                const flashed = flashedPage === pageNum;
                return (
                  <div
                    key={pageNum}
                    ref={(el) => {
                      if (el) pageRefs.current.set(pageNum, el);
                      else pageRefs.current.delete(pageNum);
                    }}
                    className={`relative shadow-md transition-all duration-300 ${
                      highlighted ? "ring-2 ring-amber-400" : ""
                    } ${flashed ? "ring-4 ring-cyan-400 shadow-cyan-400/50" : ""}`}
                  >
                    {highlighted && (
                      <div
                        className="pointer-events-none absolute inset-0 z-10 bg-amber-300/15"
                        aria-hidden="true"
                      />
                    )}
                    <Page
                      pageNumber={pageNum}
                      width={containerWidth}
                      scale={scale}
                      renderTextLayer
                      renderAnnotationLayer
                      className={isDarkMode ? "invert hue-rotate-180" : ""}
                    />
                    <div
                      className={`absolute bottom-1 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isDarkMode ? "bg-slate-800/70 text-slate-300" : "bg-white/80 text-slate-600"
                      }`}
                    >
                      Trang {pageNum}
                    </div>
                  </div>
                );
              })}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
});

export default MaterialPdfViewer;
