export function lineOfNthMatch(source, pattern, nZeroBased) {
  if (source == null || nZeroBased < 0) return null;
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let m;
  let i = 0;
  while ((m = re.exec(source)) !== null) {
    if (i === nZeroBased) {
      return source.slice(0, m.index).split(/\r?\n/).length;
    }
    i += 1;
  }
  return null;
}

export function globalQuestionIndex(parsed, sIdx, qIdx) {
  if (!parsed || !Array.isArray(parsed.sections)) return qIdx;
  let acc = 0;
  for (let s = 0; s < parsed.sections.length; s += 1) {
    const qs = parsed.sections[s]?.questions;
    const len = Array.isArray(qs) ? qs.length : 0;
    if (s < sIdx) {
      acc += len;
    } else if (s === sIdx) {
      return acc + qIdx;
    }
  }
  return acc + qIdx;
}

export function answerCountBefore(parsed, sIdx, qIdx) {
  if (!parsed || !Array.isArray(parsed.sections)) return 0;
  let n = 0;
  for (let s = 0; s < parsed.sections.length; s += 1) {
    const qs = parsed.sections[s]?.questions;
    if (!Array.isArray(qs)) continue;
    for (let q = 0; q < qs.length; q += 1) {
      if (s === sIdx && q === qIdx) return n;
      const answers = qs[q]?.answers;
      n += Array.isArray(answers) ? answers.length : 0;
    }
  }
  return n;
}

export function lineForQuestionSlot(source, globalQIdx) {
  return lineOfNthMatch(source, /"questionType"\s*:/g, globalQIdx);
}

export function lineForAnswerSlot(source, parsed, sIdx, qIdx, aIdx) {
  const before = answerCountBefore(parsed, sIdx, qIdx);
  return lineOfNthMatch(source, /"isCorrect"\s*:/g, before + aIdx);
}

export function hintForInvalidQuestionType(raw) {
  if (raw == null || typeof raw !== "string") return "";
  const u = raw.trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (u === "YES_NO" || u === "YESNO" || u === "BOOLEAN") {
    return "TRUE_FALSE";
  }
  return "";
}

export function lineOfFirstKey(source, key) {
  if (source == null || source === "" || !key) return null;
  const escaped = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`"${escaped}"\\s*:`);
  const m = re.exec(source);
  if (!m) return null;
  return source.slice(0, m.index).split(/\r?\n/).length;
}
