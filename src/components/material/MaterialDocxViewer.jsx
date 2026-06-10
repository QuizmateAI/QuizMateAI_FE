import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FileText, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  findAndHighlightSourceSpan,
  findDocxPageForSourceSpan,
} from "@/utils/docxHighlight";
import { collectDocxPageElements } from "@/utils/docxVirtualPages";
import {
  buildOfficeViewerUrl,
  renderDocxInIframe,
} from "@/utils/docxIframeRenderer";
import "./MaterialDocxViewer.css";

function getPageScrollTop(container, pageElement) {
  if (!container || !pageElement) return 0;
  const containerRect = container.getBoundingClientRect();
  const pageRect = pageElement.getBoundingClientRect();
  return container.scrollTop + (pageRect.top - containerRect.top) - 16;
}

const OFFICE_FALLBACK_MS = 7000;

const MaterialDocxViewer = forwardRef(function MaterialDocxViewer(
  {
    fileUrl,
    isDarkMode = false,
    initialPage = null,
    initialSearchText = "",
    onPageChange,
    onTotalPagesChange,
    onRenderError,
    onCapabilitiesChange,
    forceNativeViewer = false,
    scrollContainerRef = null,
  },
  ref,
) {
  const { t } = useTranslation();
  const iframeRef = useRef(null);
  const officeIframeRef = useRef(null);
  const pageElementsRef = useRef([]);
  const highlightRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);
  const sourceJumpKeyRef = useRef("");
  const officeFallbackTimerRef = useRef(null);
  const nativeScrollRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewerMode, setViewerMode] = useState("loading");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const trimmedSearchText = String(initialSearchText || "").trim();
  const shouldUseNativeViewer = forceNativeViewer || trimmedSearchText.length > 0;
  const officeViewerUrl = fileUrl ? buildOfficeViewerUrl(fileUrl) : "";

  const applySourceHighlight = useCallback(() => {
    if (!trimmedSearchText || pageElementsRef.current.length === 0) {
      return null;
    }
    return findAndHighlightSourceSpan(pageElementsRef.current, trimmedSearchText);
  }, [trimmedSearchText]);

  const reportCapabilities = useCallback((mode, total) => {
    onCapabilitiesChange?.({
      mode,
      supportsPaging: mode === "native" && total > 0,
      totalPages: total,
    });
  }, [onCapabilitiesChange]);

  const getNativeScrollContainer = useCallback(() => {
    return nativeScrollRef.current
      || iframeRef.current?.contentDocument?.documentElement
      || iframeRef.current?.contentDocument?.body
      || null;
  }, []);

  const jumpToPage = useCallback((page, options = {}) => {
    const targetPage = Math.max(1, Math.min(pageElementsRef.current.length || 1, Number(page) || 1));
    const pageElement = pageElementsRef.current[targetPage - 1];
    const container = getNativeScrollContainer();
    if (!pageElement || !container) return;

    isProgrammaticScrollRef.current = true;
    setCurrentPage(targetPage);
    onPageChange?.(targetPage);
    container.scrollTo({
      top: getPageScrollTop(container, pageElement),
      behavior: options.behavior || "smooth",
    });
    window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 450);
  }, [getNativeScrollContainer, onPageChange]);

  useImperativeHandle(ref, () => ({
    jumpToPage,
  }), [jumpToPage]);

  const applyNativePaging = useCallback((root) => {
    const pages = collectDocxPageElements(root);
    pageElementsRef.current = pages;
    const total = pages.length || 1;
    setNumPages(total);
    onTotalPagesChange?.(total);
    reportCapabilities("native", total);
    return total;
  }, [onTotalPagesChange, reportCapabilities]);

  const renderNativeDocument = useCallback(async () => {
    if (!fileUrl || !iframeRef.current) return;

    setLoading(true);
    setError(null);
    setViewerMode("native");
    pageElementsRef.current = [];
    reportCapabilities("native", 0);

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const { bodyContainer } = await renderDocxInIframe(iframeRef.current, buffer);
      iframeRef.current.classList.remove("hidden");
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      });
      nativeScrollRef.current = iframeRef.current.contentDocument?.documentElement
        || iframeRef.current.contentDocument?.body
        || null;
      const root = bodyContainer.querySelector(".docx-wrapper") || bodyContainer;
      const total = applyNativePaging(root);

      const preferredPage = Number(initialPage);
      const pageFromSource = trimmedSearchText
        ? findDocxPageForSourceSpan(pageElementsRef.current, trimmedSearchText)
        : 1;
      const resolvedPage = trimmedSearchText
        ? pageFromSource
        : Number.isInteger(preferredPage) && preferredPage > 0
          ? Math.min(preferredPage, total)
          : 1;

      window.requestAnimationFrame(() => {
        jumpToPage(resolvedPage, { behavior: "auto" });
        if (trimmedSearchText) {
          const highlighted = applySourceHighlight();
          highlightRef.current = highlighted?.mark || null;
          if (highlighted?.pageNumber && highlighted.pageNumber !== resolvedPage) {
            jumpToPage(highlighted.pageNumber, { behavior: "auto" });
          }
          window.setTimeout(() => {
            highlightRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 220);
        }
      });
    } catch (renderError) {
      const message = renderError?.message || "Could not render DOCX";
      setError(message);
      setViewerMode("error");
      onRenderError?.(renderError);
      reportCapabilities("error", 0);
    } finally {
      setLoading(false);
    }
  }, [
    applyNativePaging,
    applySourceHighlight,
    fileUrl,
    initialPage,
    jumpToPage,
    onRenderError,
    reportCapabilities,
    trimmedSearchText,
  ]);

  const switchToOfficeViewer = useCallback(() => {
    if (officeFallbackTimerRef.current) {
      window.clearTimeout(officeFallbackTimerRef.current);
      officeFallbackTimerRef.current = null;
    }
    setViewerMode("office");
    setLoading(false);
    setError(null);
    setNumPages(0);
    onTotalPagesChange?.(0);
    reportCapabilities("office", 0);
  }, [onTotalPagesChange, reportCapabilities]);

  useEffect(() => {
    if (!fileUrl) return undefined;

    if (shouldUseNativeViewer) {
      renderNativeDocument();
      return undefined;
    }

    switchToOfficeViewer();

    officeFallbackTimerRef.current = window.setTimeout(() => {
      renderNativeDocument();
    }, OFFICE_FALLBACK_MS);

    return () => {
      if (officeFallbackTimerRef.current) {
        window.clearTimeout(officeFallbackTimerRef.current);
        officeFallbackTimerRef.current = null;
      }
    };
  }, [fileUrl, renderNativeDocument, shouldUseNativeViewer, switchToOfficeViewer]);

  useEffect(() => {
    if (!trimmedSearchText || viewerMode !== "office") return undefined;
    renderNativeDocument();
    return undefined;
  }, [renderNativeDocument, trimmedSearchText, viewerMode]);

  const handleOfficeLoaded = useCallback(() => {
    if (officeFallbackTimerRef.current) {
      window.clearTimeout(officeFallbackTimerRef.current);
      officeFallbackTimerRef.current = null;
    }
    setLoading(false);
    reportCapabilities("office", 0);
  }, [reportCapabilities]);

  useEffect(() => {
    const container = getNativeScrollContainer();
    if (viewerMode !== "native" || !container || pageElementsRef.current.length === 0) {
      return undefined;
    }

    const resolveVisiblePage = () => {
      if (isProgrammaticScrollRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const viewportAnchor = containerRect.top + containerRect.height * 0.35;
      let closestPage = 1;
      let closestDistance = Number.POSITIVE_INFINITY;

      pageElementsRef.current.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const pageAnchor = rect.top + Math.min(rect.height, 120);
        const distance = Math.abs(pageAnchor - viewportAnchor);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = index + 1;
        }
      });

      if (closestPage !== currentPage) {
        setCurrentPage(closestPage);
        onPageChange?.(closestPage);
      }
    };

    container.addEventListener("scroll", resolveVisiblePage, { passive: true });
    resolveVisiblePage();

    return () => container.removeEventListener("scroll", resolveVisiblePage);
  }, [currentPage, getNativeScrollContainer, numPages, onPageChange, viewerMode]);

  useEffect(() => {
    if (viewerMode !== "native" || !trimmedSearchText || pageElementsRef.current.length === 0) {
      return undefined;
    }

    const jumpKey = `${fileUrl || "docx"}:${trimmedSearchText.slice(0, 80)}:${initialPage || ""}`;
    if (sourceJumpKeyRef.current === jumpKey) return undefined;
    sourceJumpKeyRef.current = jumpKey;

    const highlighted = applySourceHighlight();
    if (!highlighted) return undefined;

    highlightRef.current = highlighted.mark;
    jumpToPage(highlighted.pageNumber, { behavior: "auto" });
    const timer = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [applySourceHighlight, fileUrl, initialPage, jumpToPage, trimmedSearchText, viewerMode]);

  if (error && viewerMode === "error") {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center gap-3 p-8 text-center ${
          isDarkMode ? "text-slate-400" : "text-slate-500"
        }`}
      >
        <FileText className="h-12 w-12 opacity-40" />
        <p className="text-sm">
          {t("workspace.material.docxRenderFailed", "Could not render the original Word file in the browser.")}
        </p>
        <p className="text-xs opacity-70">{error}</p>
      </div>
    );
  }

  return (
    <div className={`material-docx-viewer ${isDarkMode ? "material-docx-viewer-dark" : ""}`}>
      {loading && (
        <div className="docx-viewer-loading gap-2 py-12 text-sm opacity-70">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {shouldUseNativeViewer
              ? t("workspace.material.docxLoading", "Loading Word document...")
              : t("workspace.material.docxOfficeLoading", "Opening document in Word viewer...")}
          </span>
        </div>
      )}

      {viewerMode === "office" && !shouldUseNativeViewer && (
        <iframe
          ref={officeIframeRef}
          title={t("workspace.material.docxOfficeTitle", "Word document preview")}
          src={officeViewerUrl}
          className={`material-docx-office-frame ${loading ? "hidden" : ""}`}
          onLoad={handleOfficeLoaded}
        />
      )}

      {(viewerMode === "native" || shouldUseNativeViewer) && (
        <iframe
          ref={iframeRef}
          title={t("workspace.material.docxNativeTitle", "Word document")}
          className={`material-docx-native-frame ${loading ? "hidden" : ""}`}
        />
      )}
    </div>
  );
});

export default MaterialDocxViewer;
