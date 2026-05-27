function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSourceToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildSourceTokens(value) {
  const text = String(value || "");
  const tokens = [];
  const pattern = /[\p{L}\p{N}]+/gu;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    tokens.push({
      value: normalizeSourceToken(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}

function getMinimumFlexibleMatchLength(tokenCount) {
  if (tokenCount >= 40) return 12;
  if (tokenCount >= 20) return 8;
  if (tokenCount >= 6) return 6;
  return tokenCount;
}

function findFlexibleSourceRange(content, span) {
  const contentTokens = buildSourceTokens(content);
  const spanTokens = buildSourceTokens(span).map((token) => token.value);
  if (contentTokens.length === 0 || spanTokens.length < 3) return null;

  const minimumLength = getMinimumFlexibleMatchLength(spanTokens.length);
  const candidateLengths = [
    spanTokens.length,
    120,
    80,
    40,
    20,
    12,
    8,
    6,
  ]
    .map((length) => Math.min(length, spanTokens.length))
    .filter((length, index, list) => length >= minimumLength && list.indexOf(length) === index);

  for (const length of candidateLengths) {
    const needle = spanTokens.slice(0, length);
    for (let index = 0; index <= contentTokens.length - length; index += 1) {
      let matched = true;
      for (let offset = 0; offset < length; offset += 1) {
        if (contentTokens[index + offset].value !== needle[offset]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return {
          start: contentTokens[index].start,
          end: contentTokens[index + length - 1].end,
          partial: length < spanTokens.length,
        };
      }
    }
  }

  return null;
}

function splitContentByRanges(content, ranges) {
  const result = [];
  let cursor = 0;

  ranges.forEach((range) => {
    const start = Math.max(0, Math.min(content.length, range.start));
    const end = Math.max(start, Math.min(content.length, range.end));
    if (start > cursor) {
      result.push({ text: content.slice(cursor, start), highlight: false });
    }
    if (end > start) {
      result.push({
        text: content.slice(start, end),
        highlight: true,
        partial: Boolean(range.partial),
      });
    }
    cursor = end;
  });

  if (cursor < content.length) {
    result.push({ text: content.slice(cursor), highlight: false });
  }

  return result.length > 0 ? result : [{ text: content, highlight: false }];
}

export function getHighlightedContentSegments(content, span) {
  const safeContent = String(content || "");
  const trimmedSpan = String(span || "").trim();
  if (!trimmedSpan) {
    return [{ text: safeContent, highlight: false }];
  }

  const pattern = new RegExp(escapeRegExp(trimmedSpan), "gi");
  const exactRanges = [];
  let match;
  while ((match = pattern.exec(safeContent)) !== null) {
    exactRanges.push({
      start: match.index,
      end: match.index + match[0].length,
      partial: false,
    });
    if (match[0].length === 0) pattern.lastIndex += 1;
  }

  if (exactRanges.length > 0) {
    return splitContentByRanges(safeContent, exactRanges);
  }

  const flexibleRange = findFlexibleSourceRange(safeContent, trimmedSpan);
  if (flexibleRange) {
    return splitContentByRanges(safeContent, [flexibleRange]);
  }

  return [{ text: safeContent, highlight: false }];
}
