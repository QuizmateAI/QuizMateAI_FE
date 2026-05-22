import katex from "katex";

const VIET_MARK = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u;

export function looksLikePlainMathOrMixed(s) {
  if (!s || typeof s !== "string") return false;
  if (/\\\(|\\\[/.test(s)) return false;
  return (
    /\^/.test(s)
    || /√/.test(s)
    || /<=>/.test(s)
    || /=>/.test(s)
    || /[≤≥]/.test(s)
    || /\|[^|]+\|/.test(s)
    || /\\frac|\\sqrt|\\cdot|\\times|\\div|\\pm|\\mp/i.test(s)
    // Bất đẳng thức dạng -1 < x < 3 (không có <=> / ^)
    || (/\d/.test(s) && /[xX]/.test(s) && (s.match(/</g) || []).length >= 2)
  );
}

function escapeTextBrace(run) {
  return run.replace(/\\/g, "\\textbackslash ").replace(/{/g, "\\{").replace(/}/g, "\\}");
}

function wrapVietnameseLetterRuns(s) {
  return s.replace(/[\p{L}]{2,}(?:\s+[\p{L}]{2,})*/gu, (run) => {
    if (!VIET_MARK.test(run) && run.length < 24) return run;
    return `\\text{${escapeTextBrace(run)}}`;
  });
}

function replaceCommonMathSymbols(raw) {
  let str = raw;
  str = str.replace(/√\(([^)]+)\)/g, (_, inner) => `\\sqrt{${inner}}`);
  str = str.replace(/√(\d+)/g, (_, n) => `\\sqrt{${n}}`);
  str = str.replace(/<=>/g, "\\Leftrightarrow");
  str = str.replace(/=>/g, "\\Rightarrow");
  str = str.replace(/<=/g, "\\leq");
  str = str.replace(/>=/g, "\\geq");
  str = str.replace(/≤/g, "\\leq");
  str = str.replace(/≥/g, "\\geq");
  return str;
}

export function plainTextToHeuristicLatexInner(text) {
  let s = String(text);
  s = wrapVietnameseLetterRuns(s);
  s = replaceCommonMathSymbols(s);
  return s;
}

export function tryHeuristicKatexHtml(text) {
  if (!looksLikePlainMathOrMixed(text)) return null;
  const inner = plainTextToHeuristicLatexInner(text);
  try {
    const html = katex.renderToString(inner, {
      throwOnError: false,
      strict: "ignore",
      displayMode: false,
    });
    if (typeof html === "string" && html.includes("katex-error")) return null;
    return html;
  } catch {
    return null;
  }
}
