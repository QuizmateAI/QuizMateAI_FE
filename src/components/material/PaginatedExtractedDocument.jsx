import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { MaterialContentRenderer, getRenderableDocumentText } from "@/components/features/material/MaterialContentRenderer";
import {
  pageContainsSourceSpan,
  paginateExtractedText,
} from "@/utils/documentPagination";

function resolvePages(pagesProp, fallbackPages) {
  if (Array.isArray(pagesProp) && pagesProp.length > 0) {
    return pagesProp;
  }
  return fallbackPages;
}

function getPageScrollTop(container, pageElement) {
  if (!container || !pageElement) return 0;
  const containerRect = container.getBoundingClientRect();
  const pageRect = pageElement.getBoundingClientRect();
  return container.scrollTop + (pageRect.top - containerRect.top) - 16;
}

export default function PaginatedExtractedDocument({
  value,
  type,
  script = null,
  scriptLabel,
  isDarkMode = false,
  currentPage = 1,
  onPageChange,
  pages: pagesProp = null,
  highlightSpan = "",
  scrollHighlightIntoView = false,
  scrollContainerRef = null,
}) {
  const { t } = useTranslation();
  const highlightRef = useRef(null);
  const pageRefs = useRef(new Map());
  const isProgrammaticScrollRef = useRef(false);
  const lastScrolledPageRef = useRef(null);

  const renderableText = useMemo(
    () => getRenderableDocumentText(value, type),
    [value, type],
  );

  const fallbackPagination = useMemo(
    () => paginateExtractedText(renderableText),
    [renderableText],
  );
  const pages = useMemo(
    () => resolvePages(pagesProp, fallbackPagination.pages),
    [fallbackPagination.pages, pagesProp],
  );
  const totalPages = pages.length || 1;

  const trimmedHighlightSpan = useMemo(
    () => String(highlightSpan || "").trim(),
    [highlightSpan],
  );

  useEffect(() => {
    pageRefs.current.clear();
    lastScrolledPageRef.current = null;
  }, [pages]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    const targetPage = Math.max(1, Math.min(totalPages || 1, Number(currentPage) || 1));
    const pageElement = pageRefs.current.get(targetPage);
    if (!container || !pageElement || lastScrolledPageRef.current === targetPage) {
      return undefined;
    }

    isProgrammaticScrollRef.current = true;
    lastScrolledPageRef.current = targetPage;
    container.scrollTo({
      top: getPageScrollTop(container, pageElement),
      behavior: "smooth",
    });

    const timer = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 450);

    return () => window.clearTimeout(timer);
  }, [currentPage, scrollContainerRef, totalPages]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container || typeof onPageChange !== "function" || pages.length === 0) {
      return undefined;
    }

    const resolveVisiblePage = () => {
      if (isProgrammaticScrollRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const viewportAnchor = containerRect.top + containerRect.height * 0.35;
      let closestPage = pages[0]?.pageNumber ?? 1;
      let closestDistance = Number.POSITIVE_INFINITY;

      pages.forEach((page) => {
        const element = pageRefs.current.get(page.pageNumber);
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const pageAnchor = rect.top + Math.min(rect.height, 120);
        const distance = Math.abs(pageAnchor - viewportAnchor);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = page.pageNumber;
        }
      });

      if (closestPage !== currentPage) {
        lastScrolledPageRef.current = closestPage;
        onPageChange(closestPage);
      }
    };

    container.addEventListener("scroll", resolveVisiblePage, { passive: true });
    resolveVisiblePage();

    return () => container.removeEventListener("scroll", resolveVisiblePage);
  }, [currentPage, onPageChange, pages, scrollContainerRef]);

  useEffect(() => {
    if (!scrollHighlightIntoView || !trimmedHighlightSpan) return undefined;

    const targetPage = pages.find((page) => pageContainsSourceSpan(page.text, trimmedHighlightSpan));
    if (!targetPage) return undefined;

    const container = scrollContainerRef?.current;
    const pageElement = pageRefs.current.get(targetPage.pageNumber);
    if (container && pageElement) {
      isProgrammaticScrollRef.current = true;
      lastScrolledPageRef.current = targetPage.pageNumber;
      container.scrollTo({
        top: getPageScrollTop(container, pageElement),
        behavior: "smooth",
      });
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 450);
    }

    const timer = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [pages, scrollContainerRef, scrollHighlightIntoView, trimmedHighlightSpan]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-8">
      {pages.map((page) => {
        const pageHighlightSpan = trimmedHighlightSpan && pageContainsSourceSpan(page.text, trimmedHighlightSpan)
          ? trimmedHighlightSpan
          : "";

        return (
          <section
            key={page.pageNumber}
            ref={(element) => {
              if (element) {
                pageRefs.current.set(page.pageNumber, element);
              } else {
                pageRefs.current.delete(page.pageNumber);
              }
            }}
            data-page={page.pageNumber}
            className={`rounded-2xl border px-8 py-10 shadow-sm ${
              isDarkMode
                ? "border-slate-700 bg-slate-900/80 text-slate-200"
                : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            <MaterialContentRenderer
              value={page.text}
              type={type}
              script={script}
              scriptLabel={scriptLabel}
              isDarkMode={isDarkMode}
              highlightSpan={pageHighlightSpan}
              highlightRef={pageHighlightSpan ? highlightRef : null}
            />
            <p
              className={`mt-8 border-t pt-4 text-center text-xs font-medium ${
                isDarkMode ? "border-slate-700 text-slate-500" : "border-slate-100 text-slate-500"
              }`}
            >
              {page.sectionTitle
                ? t("workspace.material.sectionPageIndicator", "{{title}} — {{current}} / {{total}}", {
                  title: page.sectionTitle,
                  current: page.pageNumber,
                  total: totalPages,
                })
                : t("workspace.material.pageIndicator", "Page {{current}} of {{total}}", {
                  current: page.pageNumber,
                  total: totalPages,
                })}
            </p>
          </section>
        );
      })}
    </div>
  );
}
