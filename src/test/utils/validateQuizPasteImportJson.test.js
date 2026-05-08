import { describe, expect, it } from "vitest";
import { validateQuizPasteImportJson } from "@/utils/validateQuizPasteImportJson";

const t = (_key, opts) => {
  let s = opts?.defaultValue ?? _key;
  if (opts && typeof s === "string") {
    Object.entries(opts).forEach(([k, v]) => {
      if (k === "defaultValue" || v === undefined || v === null) return;
      s = s.replaceAll(`{{${k}}}`, String(v));
    });
  }
  return s;
};

const minimalValid = {
  title: "T1",
  timerMode: true,
  duration: 60,
  sections: [
    {
      questions: [
        {
          questionType: "SINGLE_CHOICE",
          content: "Q1?",
          answers: [
            { content: "A", isCorrect: false },
            { content: "B", isCorrect: true },
          ],
        },
      ],
    },
  ],
};

describe("validateQuizPasteImportJson", () => {
  it("returns empty when no text", () => {
    const r = validateQuizPasteImportJson("  ", { t });
    expect(r.empty).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("accepts minimal valid payload (advance template)", () => {
    const r = validateQuizPasteImportJson(JSON.stringify(minimalValid), {
      t,
      templateKey: "quiz.paste_import.advance",
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects when timerMode true but duration missing", () => {
    const bad = { ...minimalValid, duration: null };
    const r = validateQuizPasteImportJson(JSON.stringify(bad), {
      t,
      templateKey: "quiz.paste_import.basic",
    });
    expect(r.ok).toBe(false);
    const textOf = (e) => (typeof e === "string" ? e : e.text);
    expect(r.errors.some((e) => textOf(e).includes("timerMode=true") || textOf(e).includes("timerMode"))).toBe(true);
  });

  it("rejects FILL_IN_BLANK on basic template", () => {
    const payload = {
      title: "T",
      timerMode: false,
      sections: [
        {
          questions: [
            {
              questionType: "FILL_IN_BLANK",
              content: "Fill ___",
              duration: 30,
              answers: [{ content: "ok", isCorrect: true }],
            },
          ],
        },
      ],
    };

    const r = validateQuizPasteImportJson(JSON.stringify(payload), {
      t,
      templateKey: "quiz.paste_import.basic",
    });
    expect(r.ok).toBe(false);
    const textOf = (e) => (typeof e === "string" ? e : e.text);
    expect(r.errors.some((e) => textOf(e).includes("FILL_IN_BLANK"))).toBe(true);
  });
});
