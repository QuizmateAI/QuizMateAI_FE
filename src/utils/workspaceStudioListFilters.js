const STUDIO_SUB_FILTERS = new Set(["ai", "manual", "paste"]);

export function normalizeStudioCreateVia(value) {
  return String(value || "").toUpperCase();
}

export function recordLooksPasteImported(record) {
  if (!record || typeof record !== "object") return false;
  if (record.pasteImported === true || record.createdFromPaste === true) return true;
  const cv = normalizeStudioCreateVia(record.createVia);
  if (
    ["PASTE", "MANUAL_FROM_PASTE", "MANUAL_FROM_JSON", "IMPORT_JSON"].includes(cv)
  ) {
    return true;
  }
  const candidates = [
    record.manualCreationSource,
    record.creationSource,
    record.importSource,
    record.quizCreationSource,
    record.flashcardCreationSource,
    record.manualImportKind,
  ];
  return candidates.some((c) => {
    const u = String(c || "").toUpperCase();
    return u === "PASTE" || u === "JSON" || u === "JSON_IMPORT" || u === "MANUAL_PASTE";
  });
}

export function quizMatchesStudioSubFilter(quiz, filter) {
  const f = String(filter || "").toLowerCase();
  if (!f || !STUDIO_SUB_FILTERS.has(f)) return true;
  const cv = normalizeStudioCreateVia(quiz?.createVia);
  const paste = recordLooksPasteImported(quiz);
  if (f === "ai") return cv === "AI";
  if (f === "manual") {
    if (cv !== "MANUAL" && cv !== "MANUAL_FROM_AI") return false;
    return !paste;
  }
  if (f === "paste") return paste;
  return true;
}

export function flashcardMatchesStudioSubFilter(item, filter) {
  const f = String(filter || "").toLowerCase();
  if (!f || !STUDIO_SUB_FILTERS.has(f)) return true;
  const cv = normalizeStudioCreateVia(item?.createVia);
  const paste = recordLooksPasteImported(item);
  if (f === "ai") return cv === "AI";
  if (f === "manual") {
    if (cv !== "MANUAL") return false;
    return !paste;
  }
  if (f === "paste") return paste;
  return true;
}
