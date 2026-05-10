import { describe, expect, it } from "vitest";
import {
  BLOOM_ORDER,
  BLOOM_COLORS,
  MIN_QUIZ_ATTEMPTS_FOR_INSIGHT,
  fmtAccuracy,
  fmtNumber,
  fmtScore,
  fmtSeconds,
  getRenderableBloomBuckets,
  hasQuestionStatsData,
  hasQuizStatsData,
  pct,
  pickQuestionInsightBucket,
  pickQuizInsightItem,
} from "@/pages/Users/Individual/Workspace/Components/questionStats.utils";

const tNoDuration = (key) => (key === "workspace.questionStats.noDuration" ? "—" : key);

describe("pct", () => {
  it("returns 0 when total is missing or non-positive", () => {
    expect(pct(5, 0)).toBe(0);
    expect(pct(5, null)).toBe(0);
    expect(pct(5, -1)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(2, 3)).toBe(67);
  });

  it("clamps above 100% when value > total", () => {
    expect(pct(15, 10)).toBe(100);
  });

  it("clamps negative to 0", () => {
    expect(pct(-5, 10)).toBe(0);
  });

  it("treats NaN/garbage value as 0", () => {
    expect(pct("abc", 10)).toBe(0);
    expect(pct(NaN, 10)).toBe(0);
    expect(pct(undefined, 10)).toBe(0);
  });
});

describe("fmtAccuracy", () => {
  it("returns 0% for null/undefined/NaN", () => {
    expect(fmtAccuracy(null)).toBe("0%");
    expect(fmtAccuracy(undefined)).toBe("0%");
    expect(fmtAccuracy(NaN)).toBe("0%");
    expect(fmtAccuracy("abc")).toBe("0%");
  });

  it("formats 0..1 ratio as percent", () => {
    expect(fmtAccuracy(0)).toBe("0%");
    expect(fmtAccuracy(0.5)).toBe("50%");
    expect(fmtAccuracy(1)).toBe("100%");
    expect(fmtAccuracy(0.756)).toBe("76%");
  });

  it("clamps out-of-range values into [0%, 100%]", () => {
    expect(fmtAccuracy(1.5)).toBe("100%");
    expect(fmtAccuracy(-0.2)).toBe("0%");
  });
});

describe("fmtSeconds", () => {
  it("returns no-duration translation for falsy/zero/negative input", () => {
    expect(fmtSeconds(null, tNoDuration)).toBe("—");
    expect(fmtSeconds(undefined, tNoDuration)).toBe("—");
    expect(fmtSeconds(0, tNoDuration)).toBe("—");
    expect(fmtSeconds(-10, tNoDuration)).toBe("—");
    expect(fmtSeconds(NaN, tNoDuration)).toBe("—");
  });

  it("preserves sub-second positive values as 1s instead of dropping them", () => {
    expect(fmtSeconds(0.4, tNoDuration)).toBe("1s");
    expect(fmtSeconds(0.6, tNoDuration)).toBe("1s");
  });

  it("formats minute/second combinations", () => {
    expect(fmtSeconds(30, tNoDuration)).toBe("30s");
    expect(fmtSeconds(60, tNoDuration)).toBe("1m");
    expect(fmtSeconds(125, tNoDuration)).toBe("2m 5s");
  });
});

describe("fmtScore", () => {
  it("returns 0 for null/NaN", () => {
    expect(fmtScore(null)).toBe("0");
    expect(fmtScore(undefined)).toBe("0");
    expect(fmtScore("abc")).toBe("0");
  });

  it("formats numbers with up to one decimal", () => {
    expect(fmtScore(7)).toBe("7");
    expect(fmtScore(7.25)).toMatch(/^7[.,]3$/);
  });
});

describe("fmtNumber", () => {
  it("returns 0 for null/undefined", () => {
    expect(fmtNumber(null)).toBe("0");
    expect(fmtNumber(undefined)).toBe("0");
  });

  it("uses locale separators for large numbers", () => {
    expect(fmtNumber(1234)).toMatch(/1[.,\s]?234/);
  });
});

describe("pickQuestionInsightBucket", () => {
  const buckets = [
    { label: "EASY", attemptedQuestionsInMode: 10, accuracyInMode: 0.9 },
    { label: "MEDIUM", attemptedQuestionsInMode: 8, accuracyInMode: 0.5 },
    { label: "HARD", attemptedQuestionsInMode: 6, accuracyInMode: 0.3 },
  ];

  it("returns null when no candidates have attempts", () => {
    expect(pickQuestionInsightBucket([])).toBeNull();
    expect(pickQuestionInsightBucket([{ label: "EASY", attemptedQuestionsInMode: 0 }])).toBeNull();
  });

  it("picks highest-accuracy bucket as best", () => {
    expect(pickQuestionInsightBucket(buckets, "best").label).toBe("EASY");
  });

  it("picks lowest-accuracy bucket as worst", () => {
    expect(pickQuestionInsightBucket(buckets, "worst").label).toBe("HARD");
  });

  it("returns null for worst when only one candidate (avoid best === worst collision)", () => {
    const single = [{ label: "EASY", attemptedQuestionsInMode: 5, accuracyInMode: 0.7 }];
    expect(pickQuestionInsightBucket(single, "best").label).toBe("EASY");
    expect(pickQuestionInsightBucket(single, "worst")).toBeNull();
  });

  it("falls back to gradedQuestionsInMode for attempt count", () => {
    const fallback = [
      { label: "EASY", gradedQuestionsInMode: 5, accuracyInMode: 0.6 },
      { label: "HARD", gradedQuestionsInMode: 3, accuracyInMode: 0.2 },
    ];
    expect(pickQuestionInsightBucket(fallback, "best").label).toBe("EASY");
    expect(pickQuestionInsightBucket(fallback, "worst").label).toBe("HARD");
  });

  it("breaks accuracy ties by attempt count (higher first)", () => {
    const tied = [
      { label: "EASY", attemptedQuestionsInMode: 3, accuracyInMode: 0.8 },
      { label: "HARD", attemptedQuestionsInMode: 30, accuracyInMode: 0.8 },
    ];
    expect(pickQuestionInsightBucket(tied, "best").label).toBe("HARD");
  });
});

describe("pickQuizInsightItem", () => {
  const quizzes = [
    { quizId: 1, quizTitle: "A", totalAttempts: 5, averageAccuracy: 0.92, averageScore: 9 },
    { quizId: 2, quizTitle: "B", totalAttempts: 3, averageAccuracy: 0.65, averageScore: 6 },
    { quizId: 3, quizTitle: "C", totalAttempts: 8, averageAccuracy: 0.4, averageScore: 4 },
  ];

  it("requires the configured minimum attempts to be considered", () => {
    expect(MIN_QUIZ_ATTEMPTS_FOR_INSIGHT).toBeGreaterThanOrEqual(2);
    const lowAttempts = [
      { quizId: 1, quizTitle: "lucky", totalAttempts: 1, averageAccuracy: 1, averageScore: 10 },
    ];
    expect(pickQuizInsightItem(lowAttempts, "best")).toBeNull();
  });

  it("ignores a single 100% lucky quiz when others have more attempts", () => {
    const mixed = [
      { quizId: 1, quizTitle: "lucky", totalAttempts: 1, averageAccuracy: 1, averageScore: 10 },
      { quizId: 2, quizTitle: "real", totalAttempts: 50, averageAccuracy: 0.95, averageScore: 9 },
    ];
    expect(pickQuizInsightItem(mixed, "best").quizTitle).toBe("real");
  });

  it("picks best and worst correctly when ≥2 qualifying candidates", () => {
    expect(pickQuizInsightItem(quizzes, "best").quizTitle).toBe("A");
    expect(pickQuizInsightItem(quizzes, "worst").quizTitle).toBe("C");
  });

  it("returns null for worst when only one qualifying candidate", () => {
    const single = [
      { quizId: 1, quizTitle: "only", totalAttempts: 5, averageAccuracy: 0.6, averageScore: 6 },
      { quizId: 2, quizTitle: "skipped", totalAttempts: 1, averageAccuracy: 0.4, averageScore: 4 },
    ];
    expect(pickQuizInsightItem(single, "best").quizTitle).toBe("only");
    expect(pickQuizInsightItem(single, "worst")).toBeNull();
  });

  it("breaks ties by score then attempts", () => {
    const tied = [
      { quizId: 1, quizTitle: "A", totalAttempts: 5, averageAccuracy: 0.8, averageScore: 7 },
      { quizId: 2, quizTitle: "B", totalAttempts: 5, averageAccuracy: 0.8, averageScore: 9 },
    ];
    expect(pickQuizInsightItem(tied, "best").quizTitle).toBe("B");
  });
});

describe("getRenderableBloomBuckets", () => {
  it("returns canonical Bloom order REMEMBER → CREATE", () => {
    expect(BLOOM_ORDER).toEqual(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"]);
  });

  it("orders backend buckets along the canonical order", () => {
    const input = [
      { label: "EVALUATE", accuracyInMode: 0.5 },
      { label: "REMEMBER", accuracyInMode: 0.9 },
      { label: "APPLY", accuracyInMode: 0.7 },
    ];
    const out = getRenderableBloomBuckets(input).map((b) => b.label);
    expect(out).toEqual(["REMEMBER", "APPLY", "EVALUATE"]);
  });

  it("filters out UNSPECIFIED buckets", () => {
    const input = [
      { label: "UNSPECIFIED", accuracyInMode: 0 },
      { label: "REMEMBER", accuracyInMode: 0.9 },
    ];
    expect(getRenderableBloomBuckets(input).map((b) => b.label)).toEqual(["REMEMBER"]);
  });

  it("includes CREATE when present (forward-compat)", () => {
    const input = [
      { label: "CREATE", accuracyInMode: 0.4 },
      { label: "REMEMBER", accuracyInMode: 0.9 },
    ];
    expect(getRenderableBloomBuckets(input).map((b) => b.label)).toEqual(["REMEMBER", "CREATE"]);
    expect(BLOOM_COLORS.CREATE).toBeDefined();
  });

  it("preserves unknown buckets at the end without dropping them", () => {
    const input = [
      { label: "REMEMBER", accuracyInMode: 0.9 },
      { label: "FUTURE_LEVEL", accuracyInMode: 0.3 },
    ];
    expect(getRenderableBloomBuckets(input).map((b) => b.label))
      .toEqual(["REMEMBER", "FUTURE_LEVEL"]);
  });

  it("handles empty/null input safely", () => {
    expect(getRenderableBloomBuckets()).toEqual([]);
    expect(getRenderableBloomBuckets(null)).toEqual([]);
    expect(getRenderableBloomBuckets([])).toEqual([]);
  });
});

describe("hasQuestionStatsData", () => {
  it("returns false for null/undefined or fully-empty payloads", () => {
    expect(hasQuestionStatsData(null)).toBe(false);
    expect(hasQuestionStatsData({})).toBe(false);
    expect(hasQuestionStatsData({ currentQuestionStats: {}, lifetimeQuestionAttemptStats: {} })).toBe(false);
  });

  it("returns true if any of attempted/graded/lifetime > 0", () => {
    expect(hasQuestionStatsData({ currentQuestionStats: { attemptedQuestionsInMode: 1 } })).toBe(true);
    expect(hasQuestionStatsData({ currentQuestionStats: { gradedQuestionsInMode: 2 } })).toBe(true);
    expect(hasQuestionStatsData({ lifetimeQuestionAttemptStats: { totalQuestionAttempts: 10 } })).toBe(true);
    expect(hasQuestionStatsData({ lifetimeQuestionAttemptStats: { totalAttempts: 10 } })).toBe(true);
  });
});

describe("hasQuizStatsData", () => {
  it("returns false for null/empty payload", () => {
    expect(hasQuizStatsData(null)).toBe(false);
    expect(hasQuizStatsData({})).toBe(false);
  });

  it("returns true if any of attemptedQuizzesInMode/totalQuizAttempts > 0", () => {
    expect(hasQuizStatsData({ currentQuizStats: { attemptedQuizzesInMode: 1 } })).toBe(true);
    expect(hasQuizStatsData({ lifetimeQuizAttemptStats: { totalQuizAttempts: 5 } })).toBe(true);
  });
});
