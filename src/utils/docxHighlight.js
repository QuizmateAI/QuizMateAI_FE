import { getHighlightedContentSegments } from "@/components/material/sourceHighlight";

function wrapTextNodeRange(textNode, start, end, className) {
  const text = textNode.nodeValue || "";
  if (!text || end <= start) return null;

  const before = text.slice(0, start);
  const match = text.slice(start, end);
  const after = text.slice(end);
  const parent = textNode.parentNode;
  if (!parent) return null;
  const doc = textNode.ownerDocument || document;

  const mark = doc.createElement("mark");
  mark.className = className;

  if (before) parent.insertBefore(doc.createTextNode(before), textNode);
  mark.textContent = match;
  parent.insertBefore(mark, textNode);
  if (after) parent.insertBefore(doc.createTextNode(after), textNode);
  parent.removeChild(textNode);
  return mark;
}

function findFlexibleRangeInText(haystack, needle) {
  const segments = getHighlightedContentSegments(haystack, needle);
  const highlighted = segments.find((segment) => segment.highlight);
  if (!highlighted?.text) return null;

  const start = haystack.indexOf(highlighted.text);
  if (start < 0) {
    const normalizedHaystack = haystack.replace(/\s+/g, " ");
    const normalizedNeedle = highlighted.text.replace(/\s+/g, " ");
    const normalizedStart = normalizedHaystack.indexOf(normalizedNeedle);
    if (normalizedStart < 0) return null;
    return { start: normalizedStart, end: normalizedStart + normalizedNeedle.length, text: highlighted.text };
  }
  return { start, end: start + highlighted.text.length, text: highlighted.text };
}

export function highlightSourceSpanInElement(root, sourceSpan, className = "docx-source-highlight") {
  if (!root || !sourceSpan) return null;
  const doc = root.ownerDocument || document;

  root.querySelectorAll("mark.docx-source-highlight").forEach((node) => {
    const parent = node.parentNode;
    if (!parent) return;
    parent.replaceChild(doc.createTextNode(node.textContent || ""), node);
    parent.normalize();
  });

  const haystack = root.innerText || "";
  const range = findFlexibleRangeInText(haystack, sourceSpan);
  if (!range) return null;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charOffset = 0;
  let startNode = null;
  let startOffset = 0;
  let endNode = null;
  let endOffset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const value = node.nodeValue || "";
    const nodeStart = charOffset;
    const nodeEnd = charOffset + value.length;

    if (!startNode && range.start >= nodeStart && range.start < nodeEnd) {
      startNode = node;
      startOffset = range.start - nodeStart;
    }
    if (!endNode && range.end > nodeStart && range.end <= nodeEnd) {
      endNode = node;
      endOffset = range.end - nodeStart;
      break;
    }
    charOffset = nodeEnd;
  }

  if (!startNode || !endNode) return null;

  if (startNode === endNode) {
    return wrapTextNodeRange(startNode, startOffset, endOffset, className);
  }

  const docRange = doc.createRange();
  docRange.setStart(startNode, startOffset);
  docRange.setEnd(endNode, endOffset);
  const mark = doc.createElement("mark");
  mark.className = className;
  try {
    docRange.surroundContents(mark);
    return mark;
  } catch {
    return null;
  }
}

export function findAndHighlightSourceSpan(pageElements, sourceSpan) {
  const span = String(sourceSpan || "").trim();
  if (!span || !Array.isArray(pageElements) || pageElements.length === 0) {
    return null;
  }

  for (let index = 0; index < pageElements.length; index += 1) {
    const mark = highlightSourceSpanInElement(pageElements[index], span);
    if (mark) {
      return { pageNumber: index + 1, mark };
    }
  }

  return null;
}

export function findDocxPageForSourceSpan(pageElements, sourceSpan) {
  const span = String(sourceSpan || "").trim();
  if (!span || !Array.isArray(pageElements) || pageElements.length === 0) return 1;

  const matchedIndex = pageElements.findIndex((element) => {
    const text = element?.innerText || "";
    return getHighlightedContentSegments(text, span).some((segment) => segment.highlight);
  });

  return matchedIndex >= 0 ? matchedIndex + 1 : 1;
}
