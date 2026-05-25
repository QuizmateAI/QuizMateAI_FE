import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Highlighter,
  Loader2,
  MessageSquarePlus,
  SmilePlus,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import HighlightNotePopover from "./HighlightNotePopover";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const PDF_OPTIONS = {
  disableAutoFetch: false,
  disableStream: false,
};

const EMOJI_OPTIONS = ["👍", "💡", "🔥", "✅", "❓", "⭐"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizePdfSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildPageSearchOrder(totalPages, preferredPage) {
  const total = Number(totalPages);
  if (!Number.isInteger(total) || total <= 0) return [];
  const preferred = Number(preferredPage);
  const ordered = [];
  const seen = new Set();
  const push = (page) => {
    const normalized = Number(page);
    if (!Number.isInteger(normalized) || normalized < 1 || normalized > total || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  };

  if (Number.isInteger(preferred) && preferred > 0) {
    for (let delta = 0; delta <= 12; delta += 1) {
      push(preferred - delta);
      push(preferred + delta);
    }
  }
  for (let page = 1; page <= total; page += 1) push(page);
  return ordered;
}

function createAnnotationId() {
  return `annotation:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function clearNativeSelection() {
  if (typeof window === "undefined") return;
  window.getSelection?.()?.removeAllRanges?.();
}

function getPageShellFromNode(node) {
  if (!node || typeof node !== "object") return null;
  if (node instanceof Element) {
    return node.closest("[data-pdf-page-number]");
  }
  if ("parentElement" in node && node.parentElement) {
    return node.parentElement.closest("[data-pdf-page-number]");
  }
  return null;
}

function getPageTextSpans(pageShell) {
  if (!pageShell) return [];
  return Array.from(
    pageShell.querySelectorAll(".react-pdf__Page__textContent span"),
  ).filter((span) => String(span.textContent || "").trim().length > 0);
}

function buildFallbackAnchor(pageShell, pageNum, clientY = null) {
  const pageRect = pageShell?.getBoundingClientRect?.();
  if (!pageRect) return null;
  const relativeY =
    typeof clientY === "number" ? clientY - pageRect.top : pageRect.height / 2;
  return {
    page: pageNum,
    excerpt: "Ghi chú cho dòng này",
    topRatio: clamp(relativeY / pageRect.height, 0.06, 0.94),
    source: "hover",
    selectionRects: [],
  };
}

function getAnnotationAnchorTopRatio(annotation) {
  const firstSelectionRect = Array.isArray(annotation?.selectionRects)
    ? annotation.selectionRects[0]
    : null;
  if (firstSelectionRect) return firstSelectionRect.topRatio;
  return Number(annotation?.topRatio || 0);
}

function buildRectRatio(rect, pageRect) {
  return {
    leftRatio: clamp((rect.left - pageRect.left) / pageRect.width, 0, 1),
    topRatio: clamp((rect.top - pageRect.top) / pageRect.height, 0, 1),
    widthRatio: clamp(rect.width / pageRect.width, 0, 1),
    heightRatio: clamp(rect.height / pageRect.height, 0, 1),
  };
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .trim();
}

function findHighlightAnchorOnPage(pageShell, pageNum, highlightedText) {
  const targetText = normalizeSearchText(highlightedText);
  const pageRect = pageShell?.getBoundingClientRect?.();
  if (!targetText || !pageRect) return null;

  const spans = getPageTextSpans(pageShell);
  for (let startIndex = 0; startIndex < spans.length; startIndex += 1) {
    let combinedText = "";
    const matchedRects = [];

    for (let index = startIndex; index < spans.length; index += 1) {
      const spanText = String(spans[index].textContent || "").trim();
      if (!spanText) continue;

      combinedText = normalizeSearchText(
        combinedText ? `${combinedText} ${spanText}` : spanText,
      );
      matchedRects.push(spans[index].getBoundingClientRect());

      if (combinedText.includes(targetText)) {
        const selectionRects = matchedRects
          .map((rect) => buildRectRatio(rect, pageRect))
          .filter(
            (rect) => rect.widthRatio > 0.002 && rect.heightRatio > 0.002,
          );
        const firstRect = selectionRects[0];
        if (!firstRect) return null;

        return {
          page: pageNum,
          topRatio: clamp(
            firstRect.topRatio + firstRect.heightRatio / 2,
            0.06,
            0.94,
          ),
          selectionRects,
          source: "server-highlight-resolved",
        };
      }

      if (combinedText.length > targetText.length * 2.5) {
        break;
      }
    }
  }

  return null;
}

function buildAnchorFromPoint(pageShell, pageNum, clientY) {
  const pageRect = pageShell?.getBoundingClientRect?.();
  if (!pageRect) return null;

  const textSpans = getPageTextSpans(pageShell);
  if (textSpans.length === 0) {
    return buildFallbackAnchor(pageShell, pageNum, clientY);
  }

  let nearestSpan = null;
  let nearestDelta = Number.POSITIVE_INFINITY;

  textSpans.forEach((span) => {
    const rect = span.getBoundingClientRect();
    if (rect.height <= 0 || rect.width <= 0) return;
    const midY = rect.top + rect.height / 2;
    const delta = Math.abs(midY - clientY);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      nearestSpan = { rect, text: String(span.textContent || "").trim() };
    }
  });

  if (!nearestSpan) {
    return buildFallbackAnchor(pageShell, pageNum, clientY);
  }

  return {
    page: pageNum,
    excerpt: nearestSpan.text,
    topRatio: clamp(
      (nearestSpan.rect.top + nearestSpan.rect.height / 2 - pageRect.top) /
        pageRect.height,
      0.06,
      0.94,
    ),
    source: "hover",
    selectionRects: [buildRectRatio(nearestSpan.rect, pageRect)],
  };
}

// Merge rect cùng 1 line thành 1 bounding rect — PDF.js render mỗi word/span là
// 1 rect riêng, một paragraph dài có thể >100 rect. Coalesce theo line giảm
// xuống ~số dòng, giữ visual gần như y hệt mà payload nhẹ + không vượt BE limit.
function coalesceRectsByLine(rects) {
  if (!Array.isArray(rects) || rects.length === 0) return [];
  const sorted = [...rects].sort((a, b) => a.topRatio - b.topRatio);
  const lines = [];
  for (const rect of sorted) {
    const midY = rect.topRatio + rect.heightRatio / 2;
    const tolerance = Math.max(rect.heightRatio, 0.005) * 0.6;
    const merged = lines.find((line) => {
      const lineMidY = line.topRatio + line.heightRatio / 2;
      return Math.abs(midY - lineMidY) <= tolerance;
    });
    if (merged) {
      const left = Math.min(merged.leftRatio, rect.leftRatio);
      const top = Math.min(merged.topRatio, rect.topRatio);
      const right = Math.max(
        merged.leftRatio + merged.widthRatio,
        rect.leftRatio + rect.widthRatio,
      );
      const bottom = Math.max(
        merged.topRatio + merged.heightRatio,
        rect.topRatio + rect.heightRatio,
      );
      merged.leftRatio = left;
      merged.topRatio = top;
      merged.widthRatio = right - left;
      merged.heightRatio = bottom - top;
    } else {
      lines.push({ ...rect });
    }
  }
  return lines;
}

function buildSelectionRects(range, pageRect) {
  const raw = Array.from(range.getClientRects())
    .filter(
      (rect) =>
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > pageRect.top &&
        rect.top < pageRect.bottom,
    )
    .map((rect) => buildRectRatio(rect, pageRect))
    .filter((rect) => rect.widthRatio > 0.002 && rect.heightRatio > 0.002);
  return coalesceRectsByLine(raw);
}

function buildAnchorFromSelection(selection) {
  if (!selection || selection.rangeCount === 0) return null;
  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const range = selection.getRangeAt(0);
  const pageShell = getPageShellFromNode(range.startContainer);
  if (!pageShell) return null;

  const pageNum = Number(pageShell.dataset.pdfPageNumber);
  if (!Number.isInteger(pageNum) || pageNum <= 0) return null;

  const pageRect = pageShell.getBoundingClientRect();
  const rects = Array.from(range.getClientRects()).filter(
    (rect) =>
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > pageRect.top &&
      rect.top < pageRect.bottom,
  );
  const primaryRect = rects[0] || range.getBoundingClientRect();
  if (!primaryRect || primaryRect.height <= 0) return null;
  const selectionRects = buildSelectionRects(range, pageRect);

  return {
    page: pageNum,
    excerpt: selectedText,
    topRatio: clamp(
      (primaryRect.top + primaryRect.height / 2 - pageRect.top) /
        pageRect.height,
      0.06,
      0.94,
    ),
    source: "selection",
    selectionRects,
  };
}

function buildAnchorFromPageCenter(pageShell, pageNum) {
  const pageRect = pageShell?.getBoundingClientRect?.();
  if (!pageRect) return null;
  return buildAnchorFromPoint(
    pageShell,
    pageNum,
    pageRect.top + pageRect.height / 2,
  );
}

function AnnotationRail({ topRatio, isDarkMode, onNote, onEmoji }) {
  return (
    <div
      data-annotation-rail="true"
      className="absolute -right-3 top-0 z-20 flex -translate-y-1/2 flex-col gap-2"
      style={{ top: `${topRatio * 100}%` }}
      onMouseMove={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onNote}
        title="Tạo ghi chú"
        className={`flex h-10 w-10 items-center justify-center rounded-2xl border shadow-lg transition ${
          isDarkMode
            ? "border-slate-700 bg-slate-900 text-blue-300 hover:border-blue-500 hover:bg-slate-800"
            : "border-slate-200 bg-white text-blue-600 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onEmoji}
        title="Gắn emoji"
        className={`flex h-10 w-10 items-center justify-center rounded-2xl border shadow-lg transition ${
          isDarkMode
            ? "border-slate-700 bg-slate-900 text-blue-300 hover:border-blue-500 hover:bg-slate-800"
            : "border-slate-200 bg-white text-blue-600 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <SmilePlus className="h-5 w-5" />
      </button>
    </div>
  );
}

function EmojiPicker({ topRatio, isDarkMode, onPick, onCancel }) {
  return (
    <div
      className="absolute right-16 top-0 z-30 -translate-y-1/2"
      style={{ top: `${topRatio * 100}%` }}
    >
      <div
        className={`rounded-3xl border px-4 py-3 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] ${
          isDarkMode
            ? "border-slate-700 bg-slate-950"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-2">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onPick(emoji)}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xl transition ${
                isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
              }`}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className={`ml-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isDarkMode
                ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

const MaterialPdfViewer = forwardRef(function MaterialPdfViewer(
  {
    fileUrl,
    highlightPageRange = null,
    onPageChange,
    onTotalPagesChange,
    isDarkMode = false,
    initialScale = 1.0,
    hideToolbar = false,
    annotations = [],
    selectedAnnotationId = null,
    annotationsEnabled = true,
    initialPage = null,
    initialSearchText = "",
    onAnnotationCreate,
    onAnnotationSelect,
    onAnnotationDraftChange,
    onAnnotationLayoutChange,
    onAnnotationResolve,
    onAnnotationUpdate,
    onAnnotationDelete,
  },
  ref,
) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(initialScale);
  const [loadError, setLoadError] = useState(null);
  const [containerWidth, setContainerWidth] = useState(800);
  // Virtualization: render full <Page> chỉ cho window ±RENDER_WINDOW quanh currentPage.
  // Mặc định 8 page → ~17 page rendered tổng — đủ cho UX scroll mượt mà tránh OOM với
  // tài liệu hàng trăm/ngàn trang (react-pdf load text+canvas layer mỗi page tốn ~1-2MB).
  // Placeholder dùng A4 ratio (~1.414) để giữ scroll position gần đúng.
  const RENDER_WINDOW = 8;
  const estimatedPageHeight = Math.max(400, containerWidth * 1.414 * scale);
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [draftComposer, setDraftComposer] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(null);
  const [flashedPage, setFlashedPage] = useState(null);
  const containerRef = useRef(null);
  const pageRefs = useRef(new Map());
  const flashTimerRef = useRef(null);
  const annotationLayoutFrameRef = useRef(null);
  const initialPageJumpKeyRef = useRef(null);
  const sourceTextJumpKeyRef = useRef(null);
  const pdfDocumentRef = useRef(null);
  const suppressScrollSyncUntilRef = useRef(0);

  const activeAnchor = selectionAnchor || hoverAnchor || draftComposer;

  const flashPage = useCallback((pageNum) => {
    setFlashedPage(pageNum);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashedPage(null), 1800);
  }, []);

  const jumpToPage = useCallback(
    (pageNum, options = {}) => {
      const target = Math.max(1, Math.min(numPages || pageNum, pageNum));
      const behavior = options.behavior || "smooth";
      suppressScrollSyncUntilRef.current =
        Date.now() + (behavior === "smooth" ? 900 : 250);
      setCurrentPage(target);
      onPageChange?.(target);
      const element = pageRefs.current.get(target);
      element?.scrollIntoView?.({ behavior, block: "start" });
      flashPage(target);
    },
    [flashPage, numPages, onPageChange],
  );

  const jumpToAnnotation = useCallback(
    (annotation) => {
      if (!annotation) return;
      const targetPage = Math.max(
        1,
        Math.min(numPages || annotation.page, annotation.page),
      );
      const container = containerRef.current;
      const pageElement = pageRefs.current.get(targetPage);

      setCurrentPage(targetPage);
      if (container && pageElement) {
        const anchorTop =
          pageElement.offsetTop +
          pageElement.offsetHeight * getAnnotationAnchorTopRatio(annotation);
        container.scrollTo({
          top: Math.max(0, anchorTop - container.clientHeight * 0.32),
          behavior: "smooth",
        });
      } else {
        pageElement?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      }
      flashPage(targetPage);
    },
    [flashPage, numPages],
  );

  const startDraftFromAnchor = useCallback(
    (kind, anchor) => {
      if (!anchor) return;
      clearNativeSelection();
      setSelectionAnchor(null);
      setHoverAnchor(null);
      if (kind === "emoji") {
        setEmojiPicker(anchor);
        setDraftComposer(null);
        onAnnotationDraftChange?.(null);
        return;
      }
      const nextDraft = {
        ...anchor,
        kind: "note",
        content: "",
      };
      setDraftComposer(nextDraft);
      setEmojiPicker(null);
      onAnnotationDraftChange?.(nextDraft);
    },
    [onAnnotationDraftChange],
  );

  const createAnnotationFromAnchor = useCallback(
    (kind, anchor, payload) => {
      if (!anchor) return;
      const annotation = {
        id: createAnnotationId(),
        kind,
        page: anchor.page,
        excerpt: anchor.excerpt,
        topRatio: anchor.topRatio,
        source: anchor.source || "hover",
        selectionRects: anchor.selectionRects || [],
        createdAt: new Date().toISOString(),
        ...(kind === "emoji"
          ? { emoji: payload }
          : { content: String(payload || "").trim() }),
      };
      onAnnotationCreate?.(annotation);
      onAnnotationSelect?.(annotation.id);
      onAnnotationDraftChange?.(null);
      setDraftComposer(null);
      setEmojiPicker(null);
      flashPage(annotation.page);
      clearNativeSelection();
    },
    [
      flashPage,
      onAnnotationCreate,
      onAnnotationDraftChange,
      onAnnotationSelect,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      jumpToPage,
      getCurrentPage() {
        return currentPage;
      },
      getTotalPages() {
        return numPages;
      },
      scrollByDelta(deltaY) {
        containerRef.current?.scrollBy?.({ top: deltaY, behavior: "auto" });
      },
      focusAnnotation(annotationId) {
        const annotation = annotations.find((item) => item.id === annotationId);
        if (!annotation) return;
        jumpToAnnotation(annotation);
        onAnnotationSelect?.(annotation.id);
      },
      startAnnotationDraft(kind = "note") {
        const pageElement = pageRefs.current.get(currentPage);
        const anchor =
          selectionAnchor ||
          hoverAnchor ||
          buildAnchorFromPageCenter(pageElement, currentPage);
        if (!anchor) return;
        startDraftFromAnchor(kind, anchor);
      },
      updateDraftContent(content) {
        setDraftComposer((previous) => {
          if (!previous) return previous;
          const nextDraft = { ...previous, content };
          onAnnotationDraftChange?.(nextDraft);
          return nextDraft;
        });
      },
      saveDraftAnnotation() {
        if (!draftComposer?.content?.trim()) return false;
        createAnnotationFromAnchor(
          "note",
          draftComposer,
          draftComposer.content,
        );
        return true;
      },
      cancelDraftAnnotation() {
        setDraftComposer(null);
        setEmojiPicker(null);
        setSelectionAnchor(null);
        setHoverAnchor(null);
        clearNativeSelection();
        onAnnotationDraftChange?.(null);
      },
    }),
    [
      annotations,
      createAnnotationFromAnchor,
      currentPage,
      draftComposer,
      jumpToAnnotation,
      jumpToPage,
      numPages,
      onAnnotationDraftChange,
      onAnnotationSelect,
      startDraftFromAnchor,
      hoverAnchor,
      selectionAnchor,
    ],
  );

  const publishAnnotationLayouts = useCallback(() => {
    if (!onAnnotationLayoutChange) return;
    const container = containerRef.current;
    if (!container) {
      onAnnotationLayoutChange({});
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextLayouts = annotations.reduce((result, annotation) => {
      const pageElement = pageRefs.current.get(annotation.page);
      if (!pageElement) return result;

      const pageRect = pageElement.getBoundingClientRect();
      return {
        ...result,
        [annotation.id]: {
          page: annotation.page,
          top:
            pageRect.top -
            containerRect.top +
            pageRect.height * getAnnotationAnchorTopRatio(annotation),
          pageTop: pageRect.top - containerRect.top,
          pageHeight: pageRect.height,
        },
      };
    }, {});

    onAnnotationLayoutChange(nextLayouts);
  }, [annotations, onAnnotationLayoutChange]);

  const scheduleAnnotationLayoutPublish = useCallback(() => {
    if (!onAnnotationLayoutChange || typeof window === "undefined") return;
    if (annotationLayoutFrameRef.current) {
      window.cancelAnimationFrame(annotationLayoutFrameRef.current);
    }
    annotationLayoutFrameRef.current = window.requestAnimationFrame(() => {
      annotationLayoutFrameRef.current = null;
      publishAnnotationLayouts();
    });
  }, [onAnnotationLayoutChange, publishAnnotationLayouts]);

  const resolveServerHighlightAnnotations = useCallback(() => {
    if (!onAnnotationResolve || annotations.length === 0) return;

    annotations
      .filter(
        (annotation) =>
          annotation.noteType === "HIGHLIGHT" &&
          (!Array.isArray(annotation.selectionRects) ||
            annotation.selectionRects.length === 0),
      )
      .forEach((annotation) => {
        const highlightedText =
          annotation.highlightedText || annotation.excerpt || "";
        if (!highlightedText.trim()) return;

        for (const [pageNum, pageElement] of pageRefs.current.entries()) {
          const resolved = findHighlightAnchorOnPage(
            pageElement,
            pageNum,
            highlightedText,
          );
          if (resolved) {
            onAnnotationResolve(annotation.id, resolved);
            break;
          }
        }
      });
  }, [annotations, onAnnotationResolve]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.max(320, entry.contentRect.width - 32));
      }
      scheduleAnnotationLayoutPublish();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [scheduleAnnotationLayoutPublish]);

  useEffect(() => {
    if (!containerRef.current || numPages === 0) return undefined;
    const container = containerRef.current;
    const onScroll = () => {
      if (Date.now() < suppressScrollSyncUntilRef.current) {
        scheduleAnnotationLayoutPublish();
        return;
      }

      const containerRect = container.getBoundingClientRect();
      let bestPage = currentPage;
      let bestDelta = Infinity;

      for (const [pageNum, element] of pageRefs.current.entries()) {
        if (!element) continue;
        const rect = element.getBoundingClientRect();
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
      scheduleAnnotationLayoutPublish();
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    scheduleAnnotationLayoutPublish();
    return () => container.removeEventListener("scroll", onScroll);
  }, [currentPage, numPages, onPageChange, scheduleAnnotationLayoutPublish]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (annotationLayoutFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(annotationLayoutFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    scheduleAnnotationLayoutPublish();
  }, [
    annotations,
    containerWidth,
    numPages,
    scale,
    scheduleAnnotationLayoutPublish,
  ]);

  useEffect(() => {
    if (!onAnnotationResolve || numPages === 0) return undefined;
    const timerId = window.setTimeout(resolveServerHighlightAnnotations, 250);
    return () => window.clearTimeout(timerId);
  }, [
    containerWidth,
    numPages,
    onAnnotationResolve,
    resolveServerHighlightAnnotations,
    scale,
  ]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!annotationsEnabled || draftComposer || emojiPicker) return;
      const selection = window.getSelection?.();
      if (!selection || selection.isCollapsed) {
        setSelectionAnchor(null);
        return;
      }
      const anchor = buildAnchorFromSelection(selection);
      setSelectionAnchor(anchor);
      if (anchor) {
        setHoverAnchor(null);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [annotationsEnabled, draftComposer, emojiPicker]);

  const fileSpec = useMemo(() => ({ url: fileUrl }), [fileUrl]);

  const handleDocLoad = useCallback(
    (pdfDocument) => {
      const total = Number(pdfDocument?.numPages) || 0;
      pdfDocumentRef.current = pdfDocument || null;
      setNumPages(total);
      setLoadError(null);
      onTotalPagesChange?.(total);
    },
    [onTotalPagesChange],
  );

  const handleDocError = useCallback((error) => {
    pdfDocumentRef.current = null;
    setLoadError(error?.message || String(error));
  }, []);

  useEffect(() => {
    const targetPage = Number(initialPage);
    if (!Number.isInteger(targetPage) || targetPage <= 0 || numPages <= 0) {
      return undefined;
    }

    const target = Math.max(1, Math.min(numPages, targetPage));
    const jumpKey = `${fileUrl || "pdf"}:${target}`;
    if (initialPageJumpKeyRef.current === jumpKey) {
      return undefined;
    }
    initialPageJumpKeyRef.current = jumpKey;

    const jump = () => jumpToPage(target, { behavior: "auto" });

    const frame = window.requestAnimationFrame(jump);
    const timers = [120, 450, 900].map((delay) => window.setTimeout(jump, delay));

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [fileUrl, initialPage, jumpToPage, numPages]);

  useEffect(() => {
    const pdfDocument = pdfDocumentRef.current;
    const normalizedNeedle = normalizePdfSearchText(initialSearchText);
    if (!pdfDocument || numPages <= 0 || normalizedNeedle.length < 20) {
      return undefined;
    }

    const preferred = Number(initialPage);
    const jumpKey = `${fileUrl || "pdf"}:${normalizedNeedle.slice(0, 80)}:${preferred || ""}`;
    if (sourceTextJumpKeyRef.current === jumpKey) {
      return undefined;
    }
    sourceTextJumpKeyRef.current = jumpKey;

    let cancelled = false;
    const needleVariants = [
      normalizedNeedle,
      normalizedNeedle.slice(0, 180).trim(),
      normalizedNeedle.slice(0, 120).trim(),
    ].filter(
      (value, index, array) =>
        value.length >= 20 && array.indexOf(value) === index,
    );

    const findSourcePage = async () => {
      for (const pageNum of buildPageSearchOrder(numPages, preferred)) {
        if (cancelled) return;
        try {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const haystack = normalizePdfSearchText(
            (textContent?.items || []).map((item) => item?.str || "").join(" "),
          );
          if (needleVariants.some((needle) => haystack.includes(needle))) {
            if (!cancelled) {
              jumpToPage(pageNum, { behavior: "auto" });
            }
            return;
          }
        } catch {
          // Keep searching; a few PDF pages can fail text extraction.
        }
      }
    };

    findSourcePage();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, initialPage, initialSearchText, jumpToPage, numPages]);

  const isHighlighted = useCallback(
    (pageNum) => {
      if (!highlightPageRange) return false;
      const [start, end] = highlightPageRange;
      return pageNum >= start && pageNum <= end;
    },
    [highlightPageRange],
  );

  const handlePageHover = useCallback(
    (pageNum, pageShell, clientY, target = null) => {
      if (
        !annotationsEnabled ||
        selectionAnchor ||
        draftComposer ||
        emojiPicker
      ) {
        return;
      }
      if (target?.closest?.("[data-annotation-rail='true']")) return;
      const anchor = buildAnchorFromPoint(pageShell, pageNum, clientY);
      setHoverAnchor(anchor);
    },
    [annotationsEnabled, draftComposer, emojiPicker, selectionAnchor],
  );

  const handlePageLeave = useCallback(() => {
    if (
      !annotationsEnabled ||
      selectionAnchor ||
      draftComposer ||
      emojiPicker
    ) {
      return;
    }
    setHoverAnchor(null);
  }, [annotationsEnabled, draftComposer, emojiPicker, selectionAnchor]);

  const handleAnnotationClick = useCallback(
    (annotation) => {
      onAnnotationSelect?.(annotation.id);
      jumpToAnnotation(annotation);
    },
    [jumpToAnnotation, onAnnotationSelect],
  );

  if (!fileUrl) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center gap-2 ${
          isDarkMode ? "text-slate-400" : "text-slate-500"
        }`}
      >
        <FileText className="h-12 w-12 opacity-40" />
        <p className="text-sm">Chưa có file PDF để hiển thị</p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}
    >
      {!hideToolbar && (
        <div
          className={`flex shrink-0 items-center justify-between border-b px-3 py-2 ${
            isDarkMode
              ? "border-slate-800 bg-slate-900"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => jumpToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className={`rounded p-1.5 hover:bg-slate-200 disabled:opacity-40 ${
                isDarkMode
                  ? "text-slate-200 hover:bg-slate-800"
                  : "text-slate-700"
              }`}
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span
              className={`px-2 text-xs font-medium tabular-nums ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {currentPage} / {numPages || "?"}
            </span>
            <button
              type="button"
              onClick={() => jumpToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className={`rounded p-1.5 disabled:opacity-40 ${
                isDarkMode
                  ? "text-slate-200 hover:bg-slate-800"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setScale((value) => Math.max(0.5, value - 0.15))}
              className={`rounded p-1.5 ${
                isDarkMode
                  ? "text-slate-200 hover:bg-slate-800"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
              aria-label="Thu nhỏ"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span
              className={`w-12 text-center text-xs tabular-nums ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((value) => Math.min(3.0, value + 0.15))}
              className={`rounded p-1.5 ${
                isDarkMode
                  ? "text-slate-200 hover:bg-slate-800"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
              aria-label="Phóng to"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loadError ? (
          <div
            className={`flex h-full flex-col items-center justify-center gap-2 ${
              isDarkMode ? "text-rose-300" : "text-rose-600"
            }`}
          >
            <FileText className="h-12 w-12 opacity-50" />
            <p className="text-sm">Không tải được PDF: {loadError}</p>
          </div>
        ) : (
          <Document
            file={fileSpec}
            onLoadSuccess={handleDocLoad}
            onLoadError={handleDocError}
            loading={
              <div
                className={`flex flex-col items-center gap-2 py-12 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Đang tải PDF...</p>
              </div>
            }
            options={PDF_OPTIONS}
          >
            <div className="flex flex-col items-center gap-4">
              {Array.from(
                { length: numPages || 0 },
                (_, index) => index + 1,
              ).map((pageNum) => {
                // Virtualization: render placeholder cho các trang ngoài window quanh currentPage.
                // Threshold: chỉ skip khi tài liệu vượt 2*RENDER_WINDOW+1 trang. Tài liệu nhỏ
                // (<=17 trang) vẫn render full để giữ behavior cũ. Placeholder vẫn giữ key+ref+
                // data-attr nên scroll observer + jumpToPage tiếp tục work, chỉ là không có
                // Page+text+annotation layer (đó là phần ngốn RAM).
                if (
                  numPages > RENDER_WINDOW * 2 + 1 &&
                  Math.abs(pageNum - currentPage) > RENDER_WINDOW
                ) {
                  return (
                    <div
                      key={pageNum}
                      ref={(element) => {
                        if (element) pageRefs.current.set(pageNum, element);
                        else pageRefs.current.delete(pageNum);
                      }}
                      data-pdf-page-number={pageNum}
                      style={{ width: containerWidth, height: estimatedPageHeight }}
                      className={`relative flex items-center justify-center shadow-md ${
                        isDarkMode
                          ? "bg-slate-800/40 text-slate-500"
                          : "bg-white/60 text-slate-400"
                      }`}
                    >
                      <span className="text-sm font-medium">Trang {pageNum}</span>
                    </div>
                  );
                }
                const highlighted = isHighlighted(pageNum);
                const flashed = flashedPage === pageNum;
                // NORMAL note (source: floating) hiển thị trong sidebar, không render
                // trên PDF. HIGHLIGHT (mọi source khác) đều render — bao gồm cả
                // server-highlight đã load từ BE (có selectionRects nguyên gốc).
                const pageAnnotations = annotations.filter(
                  (annotation) =>
                    annotation.page === pageNum &&
                    annotation.source !== "floating",
                );
                const visibleAnchor =
                  activeAnchor?.page === pageNum ? activeAnchor : null;
                const visibleEmojiPicker =
                  annotationsEnabled && emojiPicker?.page === pageNum
                    ? emojiPicker
                    : null;
                // Ẩn rail khi hover sát một annotation đang hiện ở mép phải
                // (button highlight + rail dùng chung cột bên phải nên dễ chồng).
                const anchorOverlapsAnnotation =
                  visibleAnchor &&
                  pageAnnotations.some((annotation) => {
                    const ratio = Number(annotation.topRatio);
                    if (!Number.isFinite(ratio)) return false;
                    return Math.abs(ratio - visibleAnchor.topRatio) < 0.04;
                  });

                return (
                  <div
                    key={pageNum}
                    ref={(element) => {
                      if (element) pageRefs.current.set(pageNum, element);
                      else pageRefs.current.delete(pageNum);
                    }}
                    data-pdf-page-number={pageNum}
                    onMouseMove={(event) =>
                      handlePageHover(
                        pageNum,
                        event.currentTarget,
                        event.clientY,
                        event.target,
                      )
                    }
                    onMouseLeave={handlePageLeave}
                    className={`relative shadow-md transition-all duration-300 ${
                      highlighted ? "ring-2 ring-amber-400" : ""
                    } ${flashed ? "ring-4 ring-cyan-400 shadow-cyan-400/50" : ""}`}
                  >
                    {highlighted ? (
                      <div
                        className="pointer-events-none absolute inset-0 z-10 bg-amber-300/15"
                        aria-hidden="true"
                      />
                    ) : null}

                    {pageAnnotations.map((annotation) => {
                      const isSelected = annotation.id === selectedAnnotationId;
                      const hasSelectionHighlight =
                        Array.isArray(annotation.selectionRects) &&
                        annotation.selectionRects.length > 0;

                      if (hasSelectionHighlight) {
                        return annotation.selectionRects.map((rect, index) => (
                          <div
                            key={`highlight-${annotation.id}-${index}`}
                            aria-hidden="true"
                            className={`pointer-events-none absolute z-10 rounded-md transition-all duration-200 ${
                              isSelected
                                ? isDarkMode
                                  ? "bg-amber-300/60 ring-1 ring-amber-200/90"
                                  : "bg-amber-300/70 ring-1 ring-amber-500/60"
                                : isDarkMode
                                  ? "bg-amber-300/12"
                                  : "bg-amber-300/22"
                            }`}
                            style={{
                              left: `${rect.leftRatio * 100}%`,
                              top: `${rect.topRatio * 100}%`,
                              width: `${rect.widthRatio * 100}%`,
                              height: `${rect.heightRatio * 100}%`,
                            }}
                          />
                        ));
                      }

                      return (
                        <div
                          key={`highlight-${annotation.id}`}
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-x-3 z-10 rounded-2xl transition-all duration-200 ${
                            isSelected
                              ? isDarkMode
                                ? "bg-amber-300/60 ring-2 ring-amber-200/90 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]"
                                : "bg-amber-300/70 ring-2 ring-amber-500/50 shadow-[0_0_0_1px_rgba(245,158,11,0.16)]"
                              : isDarkMode
                                ? "bg-sky-300/6"
                                : "bg-sky-400/10"
                          }`}
                          style={{
                            top: `calc(${annotation.topRatio * 100}% - ${isSelected ? 18 : 14}px)`,
                            height: isSelected ? 36 : 28,
                          }}
                        />
                      );
                    })}

                    <Page
                      pageNumber={pageNum}
                      width={containerWidth}
                      scale={scale}
                      renderTextLayer
                      renderAnnotationLayer
                      className={isDarkMode ? "invert hue-rotate-180" : ""}
                    />

                    <div
                      className={`absolute bottom-1 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        isDarkMode
                          ? "bg-slate-800/70 text-slate-300"
                          : "bg-white/80 text-slate-600"
                      }`}
                    >
                      Trang {pageNum}
                    </div>

                    {annotationsEnabled &&
                    visibleAnchor &&
                    !visibleEmojiPicker &&
                    !anchorOverlapsAnnotation ? (
                      <AnnotationRail
                        topRatio={visibleAnchor.topRatio}
                        isDarkMode={isDarkMode}
                        onNote={() =>
                          startDraftFromAnchor("note", visibleAnchor)
                        }
                        onEmoji={() =>
                          startDraftFromAnchor("emoji", visibleAnchor)
                        }
                      />
                    ) : null}

                    {visibleEmojiPicker ? (
                      <EmojiPicker
                        topRatio={visibleEmojiPicker.topRatio}
                        isDarkMode={isDarkMode}
                        onPick={(emoji) =>
                          createAnnotationFromAnchor(
                            "emoji",
                            visibleEmojiPicker,
                            emoji,
                          )
                        }
                        onCancel={() => setEmojiPicker(null)}
                      />
                    ) : null}

                    {pageAnnotations.map((annotation) => {
                      const isEmoji = annotation.kind === "emoji";
                      const isHighlightNote =
                        annotation.noteType === "HIGHLIGHT";
                      const isSelected = annotation.id === selectedAnnotationId;

                      let buttonClass;
                      if (isSelected) {
                        buttonClass = isDarkMode
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-blue-500 bg-blue-600 text-white";
                      } else if (isHighlightNote) {
                        buttonClass = isDarkMode
                          ? "border-amber-500/60 bg-amber-500/15 text-amber-300 hover:border-amber-400 hover:bg-amber-500/25"
                          : "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100";
                      } else {
                        buttonClass = isDarkMode
                          ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-blue-500 hover:bg-slate-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50";
                      }

                      return (
                        <div
                          key={annotation.id}
                          className="absolute right-3 top-0 z-20"
                          style={{ top: `${annotation.topRatio * 100}%` }}
                        >
                          <button
                            type="button"
                            onClick={() => handleAnnotationClick(annotation)}
                            className={`flex h-10 min-w-[40px] -translate-y-1/2 items-center justify-center rounded-2xl border px-3 shadow-lg transition ${buttonClass}`}
                            title={
                              isEmoji
                                ? "Emoji cho dòng này"
                                : isHighlightNote
                                  ? "Ghi chú đánh dấu"
                                  : "Ghi chú"
                            }
                          >
                            {isEmoji ? (
                              <span className="text-lg leading-none">
                                {annotation.emoji}
                              </span>
                            ) : isHighlightNote ? (
                              <Highlighter className="h-4 w-4" />
                            ) : (
                              <MessageSquarePlus className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      );
                    })}

                    {pageAnnotations
                      .filter(
                        (annotation) =>
                          annotation.kind !== "emoji" &&
                          (annotation.status === "draft" ||
                            annotation.id === selectedAnnotationId),
                      )
                      .map((annotation) => {
                        const isDraft = annotation.status === "draft";
                        return (
                          <HighlightNotePopover
                            key={`popover-${annotation.id}`}
                            annotation={annotation}
                            isDarkMode={isDarkMode}
                            isDraft={isDraft}
                            onChangeContent={(content) => {
                              setDraftComposer((previous) => {
                                if (!previous) return previous;
                                const next = { ...previous, content };
                                onAnnotationDraftChange?.(next);
                                return next;
                              });
                            }}
                            onSaveDraft={() => {
                              if (!draftComposer?.content?.trim()) return;
                              createAnnotationFromAnchor(
                                "note",
                                draftComposer,
                                draftComposer.content,
                              );
                            }}
                            onCancelDraft={() => {
                              setDraftComposer(null);
                              setEmojiPicker(null);
                              setSelectionAnchor(null);
                              setHoverAnchor(null);
                              clearNativeSelection();
                              onAnnotationDraftChange?.(null);
                            }}
                            onUpdate={(id, content) =>
                              onAnnotationUpdate?.(id, content)
                            }
                            onDelete={(id) => onAnnotationDelete?.(id)}
                            onClose={() => onAnnotationSelect?.(null)}
                          />
                        );
                      })}
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
