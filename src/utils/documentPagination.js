import { getHighlightedContentSegments } from "@/components/material/sourceHighlight";

const DEFAULT_CHARS_PER_PAGE = 2400;
const MAX_SECTION_CHARS = 3200;

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeDocumentSections(payload) {
  const data = payload?.data ?? payload ?? [];
  return Array.isArray(data) ? data : [];
}

export function extractRagChunks(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.chunks)) return data.chunks;
  return [];
}

export function flattenDocumentSectionLeaves(sectionRoots) {
  const leaves = [];

  const walk = (node) => {
    if (!node) return;
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      leaves.push(node);
      return;
    }
    children.forEach(walk);
  };

  (Array.isArray(sectionRoots) ? sectionRoots : []).forEach(walk);
  return leaves;
}

function normalizeChunkId(value) {
  return String(value || "").trim();
}

export function buildChunkContentMap(chunks) {
  const map = new Map();
  (Array.isArray(chunks) ? chunks : []).forEach((chunk) => {
    const id = normalizeChunkId(chunk?.chunk_id ?? chunk?.chunkId);
    if (id) map.set(id, chunk);
  });
  return map;
}

function getChunkText(chunk) {
  if (!chunk) return "";
  return String(chunk.content ?? chunk.text ?? chunk.body ?? "").trim();
}

function extractSectionFromFullText(fullText, title, nextTitle) {
  const normalized = String(fullText || "");
  const needle = String(title || "").trim();
  if (!needle || !normalized) return "";

  let start = normalized.indexOf(needle);
  if (start < 0) {
    const headingPattern = new RegExp(`^#{1,3}\\s*${escapeRegExp(needle)}\\s*$`, "im");
    const match = normalized.match(headingPattern);
    start = match?.index ?? -1;
  }
  if (start < 0) return "";

  let end = normalized.length;
  const nextNeedle = String(nextTitle || "").trim();
  if (nextNeedle) {
    const nextIdx = normalized.indexOf(nextNeedle, start + needle.length);
    if (nextIdx > start) end = nextIdx;
  }

  return normalized.slice(start, end).trim();
}

function buildSectionPageText(section, chunkMap, fullText, nextSectionTitle) {
  const chunkIds = Array.isArray(section?.chunkIds) ? section.chunkIds : [];
  const chunkText = chunkIds
    .map((chunkId) => getChunkText(chunkMap.get(normalizeChunkId(chunkId))))
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (chunkText) return chunkText;

  return extractSectionFromFullText(fullText, section?.title, nextSectionTitle);
}

/**
 * Paginate extracted content by backend document sections (leaf nodes + chunkIds).
 */
export function paginateByDocumentSections(sectionRoots, chunks, fullText, options = {}) {
  const leaves = flattenDocumentSectionLeaves(sectionRoots);
  if (leaves.length === 0) {
    return paginateExtractedText(fullText, options);
  }

  const chunkMap = buildChunkContentMap(chunks);
  const pages = [];
  let globalOffset = 0;

  leaves.forEach((section, index) => {
    const nextTitle = leaves[index + 1]?.title;
    const body = buildSectionPageText(section, chunkMap, fullText, nextTitle);
    if (!body) return;

    const sectionTitle = String(section?.title || "").trim();
    const displayText = sectionTitle && !body.includes(sectionTitle)
      ? `## ${sectionTitle}\n\n${body}`
      : body;

    const startOffset = globalOffset;
    const endOffset = startOffset + displayText.length;
    pages.push({
      pageNumber: pages.length + 1,
      text: displayText,
      sectionId: section?.id || section?.sectionId || null,
      sectionTitle,
      startOffset,
      endOffset,
    });
    globalOffset = endOffset + 1;
  });

  if (pages.length === 0) {
    return paginateExtractedText(fullText, options);
  }

  return { pages, totalPages: pages.length };
}

export function paginateDocumentContent({
  fullText,
  sections = [],
  chunks = [],
  options = {},
}) {
  if (Array.isArray(sections) && sections.length > 0) {
    return paginateByDocumentSections(sections, chunks, fullText, options);
  }
  return paginateExtractedText(fullText, options);
}

export function findPageForSectionId(pages, sectionId) {
  const normalizedId = String(sectionId || "").trim();
  if (!normalizedId || !Array.isArray(pages)) return 1;
  const matched = pages.find((page) => String(page.sectionId || "") === normalizedId);
  return matched?.pageNumber ?? 1;
}

function splitLongSection(text, charsPerPage) {
  if (text.length <= charsPerPage) {
    return [text];
  }

  const parts = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + charsPerPage);
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      const lineBreak = text.lastIndexOf("\n", end);
      const preferredBreak = paragraphBreak > cursor + Math.floor(charsPerPage * 0.55)
        ? paragraphBreak
        : lineBreak > cursor + Math.floor(charsPerPage * 0.55)
          ? lineBreak
          : end;
      end = preferredBreak > cursor ? preferredBreak : end;
    }
    const slice = text.slice(cursor, end).trim();
    if (slice) parts.push(slice);
    cursor = end;
  }
  return parts.length > 0 ? parts : [text];
}

function buildPagesFromSections(sections, charsPerPage) {
  const pages = [];
  let globalOffset = 0;

  sections.forEach((section) => {
    const chunks = section.length > MAX_SECTION_CHARS
      ? splitLongSection(section, charsPerPage)
      : [section];

    chunks.forEach((chunk) => {
      const text = chunk.trim();
      if (!text) return;
      const startOffset = globalOffset;
      const endOffset = startOffset + text.length;
      pages.push({
        pageNumber: pages.length + 1,
        text,
        startOffset,
        endOffset,
      });
      globalOffset = endOffset + 1;
    });
  });

  return pages.length > 0
    ? pages
    : [{ pageNumber: 1, text: "", startOffset: 0, endOffset: 0 }];
}

function splitByBoundaryMatches(text, boundaryRegex) {
  const matches = [...text.matchAll(boundaryRegex)];
  if (matches.length <= 1) return null;

  const sections = [];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index ?? 0;
    const end = index + 1 < matches.length
      ? (matches[index + 1].index ?? text.length)
      : text.length;
    const section = text.slice(start, end).trim();
    if (section) sections.push(section);
  }
  return sections;
}

/**
 * Split extracted document text into virtual pages for navigation.
 * Word/DOCX headings and Excel sheets become natural page boundaries.
 */
export function paginateExtractedText(text, options = {}) {
  const charsPerPage = options.charsPerPage ?? DEFAULT_CHARS_PER_PAGE;
  const normalized = String(text || "").trim();
  if (!normalized) {
    return {
      pages: [{ pageNumber: 1, text: "", startOffset: 0, endOffset: 0 }],
      totalPages: 1,
    };
  }

  const sheetSections = splitByBoundaryMatches(normalized, /^#{1,3}\s*Sheet\s*:/gim);
  if (sheetSections) {
    const pages = buildPagesFromSections(sheetSections, charsPerPage);
    return { pages, totalPages: pages.length };
  }

  const headingSections = splitByBoundaryMatches(normalized, /^#{1,3}\s+\S.+$/gm);
  if (headingSections) {
    const pages = buildPagesFromSections(headingSections, charsPerPage);
    return { pages, totalPages: pages.length };
  }

  const pages = buildPagesFromSections(
    splitLongSection(normalized, charsPerPage),
    charsPerPage,
  );
  return { pages, totalPages: pages.length };
}

export function pageContainsSourceSpan(pageText, sourceSpan) {
  const span = String(sourceSpan || "").trim();
  if (!span || !pageText) return false;
  return getHighlightedContentSegments(pageText, span).some((segment) => segment.highlight);
}

export function findPageForSourceSpan(pages, sourceSpan) {
  if (!Array.isArray(pages) || pages.length === 0) return 1;
  const span = String(sourceSpan || "").trim();
  if (!span) return 1;

  const matchedPage = pages.find((page) => pageContainsSourceSpan(page.text, span));
  return matchedPage?.pageNumber ?? 1;
}

export function getPageByNumber(pages, pageNumber) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return { pageNumber: 1, text: "", startOffset: 0, endOffset: 0 };
  }
  const target = Math.max(1, Math.min(pages.length, Number(pageNumber) || 1));
  return pages.find((page) => page.pageNumber === target) || pages[0];
}
