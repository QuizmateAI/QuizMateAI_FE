/**
 * Client-side validation for quiz paste-import JSON, aligned with
 * {@code ManualQuizPasteImportRequest} + {@code ManualQuizValidator} (BE).
 * Reduces round-trips; BE remains authoritative.
 */

import {
  globalQuestionIndex,
  hintForInvalidQuestionType,
  lineForAnswerSlot,
  lineForQuestionSlot,
  lineOfFirstKey,
} from "./quizPasteImportSourceLocation.js";

const PASTE_ADVANCE_TEMPLATE_KEY = "quiz.paste_import.advance";

const BASIC_TYPES = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]);
const ADVANCE_TYPES = new Set([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "FILL_IN_BLANK",
  "MATCHING",
]);

const QUESTION_TYPE_ENUM = new Set([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "FILL_IN_BLANK",
  "MATCHING",
  "IMAGED_BASED",
]);

const QUIZ_INTENT = new Set(["PRE_LEARNING", "POST_LEARNING", "REVIEW", "MOCK_TEST"]);
const DIFFICULTY = new Set(["EASY", "MEDIUM", "HARD", "CUSTOM"]);

const ALLOWED_ROOT_KEYS = new Set([
  "title",
  "description",
  "timerMode",
  "duration",
  "quizIntent",
  "overallDifficulty",
  "sections",
  "workspaceId",
]);

function pushErr(errors, line, text) {
  errors.push({ line: line ?? null, text: String(text) });
}

function pushWarn(warnings, text) {
  warnings.push({ line: null, text: String(text) });
}

function wrapRefQuestion(safeT, sIdx, qIdx, body) {
  return safeT("workspace.quiz.pasteImport.validationUser.refQuestion", {
    section: sIdx + 1,
    question: qIdx + 1,
    body,
    defaultValue: "Section {{section}}, question {{question}}: {{body}}",
  });
}

function wrapRefAnswer(safeT, sIdx, qIdx, aIdx, body) {
  return safeT("workspace.quiz.pasteImport.validationUser.refAnswer", {
    section: sIdx + 1,
    question: qIdx + 1,
    answer: aIdx + 1,
    body,
    defaultValue: "Section {{section}}, question {{question}}, option {{answer}}: {{body}}",
  });
}

function pushQErr(errors, source, parsed, sIdx, qIdx, safeT, key, opts, defaultValue) {
  const g = globalQuestionIndex(parsed, sIdx, qIdx);
  const line = lineForQuestionSlot(source, g);
  const core = safeT(key, { ...opts, defaultValue });
  const ref = wrapRefQuestion(safeT, sIdx, qIdx, core);
  pushErr(errors, line, ref);
}

function pushAErr(errors, source, parsed, sIdx, qIdx, aIdx, safeT, key, opts, defaultValue) {
  const line = lineForAnswerSlot(source, parsed, sIdx, qIdx, aIdx);
  const core = safeT(key, { ...opts, defaultValue });
  const ref = wrapRefAnswer(safeT, sIdx, qIdx, aIdx, core);
  pushErr(errors, line, ref);
}

function pushRootErr(errors, source, safeT, key, opts, defaultValue, lineKey) {
  const line = lineKey ? lineOfFirstKey(source, lineKey) : null;
  const core = safeT(key, { ...opts, defaultValue });
  pushErr(errors, line, core);
}

function normalizePasteQuestionType(raw) {
  if (raw == null) return "";
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase();
}

function resolveAllowedPasteTypes(templateKey) {
  if (templateKey === PASTE_ADVANCE_TEMPLATE_KEY) {
    return ADVANCE_TYPES;
  }
  return BASIC_TYPES;
}

function trimToNull(s) {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}

function parseMatchingPairsFromAnswer(answer, t) {
  const mp = answer?.matchingPairs;
  if (Array.isArray(mp) && mp.length > 0) {
    return mp.map((pair, i) => ({
      left: trimToNull(pair?.leftKey),
      right: trimToNull(pair?.rightKey),
      i,
    }));
  }
  const payload = answer?.content;
  if (payload == null || typeof payload !== "string" || !payload.trim()) {
    return null;
  }
  try {
    const root = JSON.parse(payload.trim());
    let pairNode = root;
    if (root && typeof root === "object" && !Array.isArray(root) && root.pairs != null) {
      pairNode = root.pairs;
    }
    const parsed = [];
    if (Array.isArray(pairNode)) {
      pairNode.forEach((node, i) => {
        parsed.push({
          left: trimToNull(node?.leftKey),
          right: trimToNull(node?.rightKey),
          i,
        });
      });
    } else if (pairNode && typeof pairNode === "object" && !Array.isArray(pairNode)) {
      parsed.push({
        left: trimToNull(pairNode.leftKey),
        right: trimToNull(pairNode.rightKey),
        i: 0,
      });
    }
    return parsed.length ? parsed : null;
  } catch (e) {
    return { parseError: t("workspace.quiz.pasteImport.validation.matchingJsonInvalid", { message: e?.message || "", defaultValue: `Invalid matching JSON: ${e?.message || ""}` }) };
  }
}

/**
 * @param {string} rawJson
 * @param {{ t: (key: string, opts?: object) => string, templateKey?: string | null, maxQuestions?: number }} options
 */
export function validateQuizPasteImportJson(rawJson, options) {
  const { t, templateKey = null, maxQuestions = 100 } = options || {};
  const safeT = typeof t === "function" ? t : (k, o) => o?.defaultValue || k;

  const errors = [];
  const warnings = [];
  const trimmed = String(rawJson || "").trim();

  if (!trimmed) {
    return { ok: false, parsed: null, errors: [], warnings: [], empty: true };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    pushErr(
      errors,
      1,
      safeT("workspace.quiz.pasteImport.errors.jsonSyntax", {
        message: err?.message || "unknown",
        defaultValue:
          "JSON has a syntax error (brackets, commas, or an unclosed string). Fix from the top of the file or use Format when the JSON is otherwise valid. Details: {{message}}",
      }),
    );
    return { ok: false, parsed: null, errors, warnings, empty: false };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    pushErr(
      errors,
      null,
      safeT("workspace.quiz.pasteImport.errors.notObject", {
        defaultValue:
          "The entire content must be one JSON object `{ ... }`, not an array `[...]` or a single primitive.",
      }),
    );
    return { ok: false, parsed: null, errors, warnings, empty: false };
  }

  const allowedTypes = templateKey ? resolveAllowedPasteTypes(templateKey) : null;

  const rootKeys = Object.keys(parsed);
  const unknownRoot = rootKeys.filter((k) => !ALLOWED_ROOT_KEYS.has(k));
  if (unknownRoot.length > 0) {
    pushWarn(
      warnings,
      safeT("workspace.quiz.pasteImport.validation.unknownRootKeys", {
        keys: unknownRoot.join(", "),
        defaultValue:
          "Some root-level field names are not in the system template (they may be ignored): {{keys}}. Remove them or rename to match the prompt.",
      }),
    );
  }

  if (typeof parsed.title !== "string" || !parsed.title.trim()) {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.errors.missingTitle",
      {},
      'Missing quiz title ("title") or it is empty. Add a line like "title": "…" matching the prompt sample.',
      "title",
    );
  } else if (parsed.title.length > 255) {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.validation.titleTooLong",
      { max: 255 },
      "Quiz title (title) is too long: maximum {{max}} characters.",
      "title",
    );
  }

  if (!("timerMode" in parsed)) {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.validation.timerModeRequired",
      {},
      'Missing "timerMode": set true for a whole-quiz timer (with duration), or false for per-question timing.',
      "timerMode",
    );
  } else if (typeof parsed.timerMode !== "boolean") {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.validation.timerModeType",
      {},
      '"timerMode" must be true or false (boolean in JSON), not a word like “true” as plain text or 0/1.',
      "timerMode",
    );
  }

  const timerMode = parsed.timerMode === true;

  if (timerMode) {
    const d = parsed.duration;
    if (d == null || typeof d !== "number" || !Number.isFinite(d) || d < 1) {
      pushRootErr(
        errors,
        trimmed,
        safeT,
        "workspace.quiz.pasteImport.validation.durationWhenQuizTimer",
        {},
        "With whole-quiz timing (timerMode: true), set duration to seconds ≥ 1 for the entire quiz.",
        "duration",
      );
    }
  }

  if (parsed.quizIntent != null && typeof parsed.quizIntent === "string") {
    const qi = parsed.quizIntent.trim().toUpperCase();
    if (!QUIZ_INTENT.has(qi)) {
      pushRootErr(
        errors,
        trimmed,
        safeT,
        "workspace.quiz.pasteImport.validation.quizIntentInvalid",
        { value: parsed.quizIntent },
        'quizIntent is not valid. Use one of: PRE_LEARNING, POST_LEARNING, REVIEW, MOCK_TEST (uppercase, underscores). Current value: "{{value}}".',
        "quizIntent",
      );
    }
  } else if (parsed.quizIntent != null && typeof parsed.quizIntent !== "string") {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.validation.quizIntentType",
      {},
      "quizIntent, if present, must be a string — for example \"REVIEW\".",
      "quizIntent",
    );
  }

  if (parsed.overallDifficulty != null && typeof parsed.overallDifficulty === "string") {
    const od = parsed.overallDifficulty.trim().toUpperCase();
    if (!DIFFICULTY.has(od)) {
      pushRootErr(
        errors,
        trimmed,
        safeT,
        "workspace.quiz.pasteImport.validation.difficultyInvalid",
        { value: parsed.overallDifficulty },
        'overallDifficulty is not valid. Use: EASY, MEDIUM, HARD, or CUSTOM. Current value: "{{value}}".',
        "overallDifficulty",
      );
    }
  } else if (parsed.overallDifficulty != null && typeof parsed.overallDifficulty !== "string") {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.validation.difficultyType",
      {},
      "overallDifficulty, if present, must be a string — for example \"MEDIUM\".",
      "overallDifficulty",
    );
  }

  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.errors.missingSections",
      {},
      'Missing a non-empty "sections" array. Add a sections array like in the prompt.',
      "sections",
    );
    return { ok: false, parsed, errors, warnings, empty: false };
  }

  let totalQuestions = 0;
  parsed.sections.forEach((section) => {
    if (section && Array.isArray(section.questions)) {
      totalQuestions += section.questions.length;
    }
  });

  if (totalQuestions === 0) {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.validation.noQuestions",
      {},
      "sections does not contain any questions yet. Each section needs at least one object in its questions array.",
      "questions",
    );
  }

  if (totalQuestions > maxQuestions) {
    pushRootErr(
      errors,
      trimmed,
      safeT,
      "workspace.quiz.pasteImport.validation.tooManyQuestions",
      { max: maxQuestions, count: totalQuestions },
      "This quiz has {{count}} questions — over the limit of {{max}} per quiz. Split some into another quiz.",
      "sections",
    );
  }

  parsed.sections.forEach((section, sIdx) => {
    if (section == null || typeof section !== "object" || Array.isArray(section)) {
      pushErr(
        errors,
        lineOfFirstKey(trimmed, "sections"),
        safeT("workspace.quiz.pasteImport.validation.sectionInvalidUser", {
          section: sIdx + 1,
          defaultValue:
            "Section {{section}} in \"sections\" is invalid (null or not an object). Fix it to match the `{ ... }` sample in the prompt.",
        }),
      );
      return;
    }
    if (!Array.isArray(section.questions) || section.questions.length === 0) {
      pushErr(
        errors,
        lineOfFirstKey(trimmed, "sections"),
        safeT("workspace.quiz.pasteImport.validation.sectionNoQuestionsUser", {
          section: sIdx + 1,
          defaultValue: 'Section {{section}} has no "questions" array or it is empty. Each section needs at least one question.',
        }),
      );
      return;
    }

    section.questions.forEach((question, qIdx) => {
      if (question == null || typeof question !== "object" || Array.isArray(question)) {
        pushQErr(
          errors,
          trimmed,
          parsed,
          sIdx,
          qIdx,
          safeT,
          "workspace.quiz.pasteImport.validation.questionInvalidUser",
          {},
          "This question block is the wrong shape (not `{ … }`). Compare again with the prompt sample.",
        );
        return;
      }

      if (typeof question.content !== "string" || !question.content.trim()) {
        pushQErr(
          errors,
          trimmed,
          parsed,
          sIdx,
          qIdx,
          safeT,
          "workspace.quiz.pasteImport.validation.questionContentEmptyUser",
          {},
          "Question text (content) is empty. Enter the full question.",
        );
      }

      const rawType = question.questionType;
      if (rawType == null || (typeof rawType === "string" && !rawType.trim())) {
        pushQErr(
          errors,
          trimmed,
          parsed,
          sIdx,
          qIdx,
          safeT,
          "workspace.quiz.pasteImport.validation.questionTypeMissingUser",
          {},
          "Missing question type (questionType). Add something like \"SINGLE_CHOICE\" as in the prompt.",
        );
        return;
      }
      if (typeof rawType !== "string") {
        pushQErr(
          errors,
          trimmed,
          parsed,
          sIdx,
          qIdx,
          safeT,
          "workspace.quiz.pasteImport.validation.questionTypeTypeUser",
          {},
          "questionType must be a quoted string, for example \"TRUE_FALSE\".",
        );
        return;
      }

      const nType = normalizePasteQuestionType(rawType);
      if (!QUESTION_TYPE_ENUM.has(nType)) {
        const sug = hintForInvalidQuestionType(rawType);
        if (sug) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.questionTypeUnknownHint",
            { value: rawType, suggest: sug },
            'Type "{{value}}" is not valid. For true/false questions use "{{suggest}}" from the prompt (not YES_NO or similar).',
          );
        } else {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.questionTypeUnknownUser",
            { value: rawType },
            'Type "{{value}}" is not recognized. Open the prompt and copy the exact name (e.g. SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE…).',
          );
        }
        return;
      }

      if (nType === "IMAGED_BASED") {
        pushQErr(
          errors,
          trimmed,
          parsed,
          sIdx,
          qIdx,
          safeT,
          "workspace.quiz.pasteImport.validation.imagedNotInPasteUser",
          {},
          "Image questions (IMAGED_BASED) cannot be created via paste JSON. Create the quiz manually in the app to upload images.",
        );
        return;
      }

      if (allowedTypes && !allowedTypes.has(nType)) {
        const allowedStr = [...allowedTypes].join(", ");
        pushQErr(
          errors,
          trimmed,
          parsed,
          sIdx,
          qIdx,
          safeT,
          "workspace.quiz.pasteImport.validation.questionTypePlanUser",
          { type: nType, allowed: allowedStr },
          "Type {{type}} is not allowed for your current prompt/plan. Your plan supports: {{allowed}}.",
        );
      }

      if (!timerMode) {
        const qDur = question.duration;
        if (qDur == null || typeof qDur !== "number" || !Number.isFinite(qDur) || qDur <= 0) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.questionDurationUser",
            {},
            "Per-question timing: each question needs duration as seconds > 0.",
          );
        }
      }

      const answers = question.answers;
      if (!Array.isArray(answers) || answers.length === 0) {
        pushQErr(
          errors,
          trimmed,
          parsed,
          sIdx,
          qIdx,
          safeT,
          "workspace.quiz.pasteImport.validation.answersRequiredUser",
          {},
          "No answers yet (answers). Each question needs an array of options like in the sample.",
        );
        return;
      }

      let correctCount = 0;
      answers.forEach((a) => {
        if (a && typeof a === "object" && !Array.isArray(a) && a.isCorrect === true) {
          correctCount += 1;
        }
      });

      if (nType !== "MATCHING") {
        answers.forEach((a, aIdx) => {
          if (a == null || typeof a !== "object" || Array.isArray(a)) {
            pushAErr(
              errors,
              trimmed,
              parsed,
              sIdx,
              qIdx,
              aIdx,
              safeT,
              "workspace.quiz.pasteImport.validation.answerInvalidUser",
              {},
              "This answer row is the wrong shape. Each answer must be an object with content and isCorrect.",
            );
            return;
          }
          if (!("isCorrect" in a) || typeof a.isCorrect !== "boolean") {
            pushAErr(
              errors,
              trimmed,
              parsed,
              sIdx,
              qIdx,
              aIdx,
              safeT,
              "workspace.quiz.pasteImport.validation.answerIsCorrectUser",
              {},
              "Missing isCorrect or it is not true/false. Mark the correct answer with isCorrect: true.",
            );
          }
          if (a.content == null || typeof a.content !== "string" || !a.content.trim()) {
            pushAErr(
              errors,
              trimmed,
              parsed,
              sIdx,
              qIdx,
              aIdx,
              safeT,
              "workspace.quiz.pasteImport.validation.answerContentBlankUser",
              { type: nType },
              "Answer text is empty — for type {{type}} each choice needs text in \"content\".",
            );
          }
        });
      } else {
        if (answers.length !== 1) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.matchingOneAnswerUser",
            {},
            "Matching (MATCHING): answers must contain exactly one object that holds the leftKey/rightKey pairs.",
          );
        } else {
          const a0 = answers[0];
          if (a0 == null || typeof a0 !== "object" || Array.isArray(a0)) {
            pushAErr(
              errors,
              trimmed,
              parsed,
              sIdx,
              qIdx,
              0,
              safeT,
              "workspace.quiz.pasteImport.validation.answerInvalidUser",
              {},
              "This MATCHING answer row is the wrong shape.",
            );
          } else {
            if (!("isCorrect" in a0) || typeof a0.isCorrect !== "boolean") {
              pushAErr(
                errors,
                trimmed,
                parsed,
                sIdx,
                qIdx,
                0,
                safeT,
                "workspace.quiz.pasteImport.validation.answerIsCorrectUser",
                {},
                "For MATCHING, the answer must have isCorrect: true.",
              );
            } else if (a0.isCorrect !== true) {
              pushAErr(
                errors,
                trimmed,
                parsed,
                sIdx,
                qIdx,
                0,
                safeT,
                "workspace.quiz.pasteImport.validation.matchingCorrectFlagUser",
                {},
                "For MATCHING, set isCorrect: true on the answer row that contains the pairs.",
              );
            }
            const resolved = parseMatchingPairsFromAnswer(a0, safeT);
            if (resolved?.parseError) {
              const g = globalQuestionIndex(parsed, sIdx, qIdx);
              const line = lineForQuestionSlot(trimmed, g);
              const wrapped = wrapRefQuestion(safeT, sIdx, qIdx, resolved.parseError);
              pushErr(errors, line, wrapped);
            } else if (!resolved || resolved.length < 2) {
              pushQErr(
                errors,
                trimmed,
                parsed,
                sIdx,
                qIdx,
                safeT,
                "workspace.quiz.pasteImport.validation.matchingPairsMinUser",
                {},
                "MATCHING needs at least 2 pairs (leftKey and rightKey), or a pairs JSON in content.",
              );
            } else {
              const leftSeen = new Set();
              resolved.forEach((row) => {
                if (!row.left || !row.right) {
                  pushQErr(
                    errors,
                    trimmed,
                    parsed,
                    sIdx,
                    qIdx,
                    safeT,
                    "workspace.quiz.pasteImport.validation.matchingPairIncompleteUser",
                    { index: row.i + 1 },
                    "Pair {{index}} is missing leftKey or rightKey.",
                  );
                  return;
                }
                if (leftSeen.has(row.left)) {
                  pushQErr(
                    errors,
                    trimmed,
                    parsed,
                    sIdx,
                    qIdx,
                    safeT,
                    "workspace.quiz.pasteImport.validation.matchingDupLeftUser",
                    { left: row.left },
                    'Duplicate leftKey "{{left}}" in the same MATCHING question.',
                  );
                }
                leftSeen.add(row.left);
              });
            }
          }
        }
      }

      if (nType === "SINGLE_CHOICE") {
        if (answers.length < 2) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.singleMinAnswersUser",
            {},
            "Single-choice needs at least 2 options.",
          );
        }
        if (correctCount !== 1) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.singleOneCorrectUser",
            {},
            "Need exactly one answer with isCorrect: true (and the rest false).",
          );
        }
      }
      if (nType === "MULTIPLE_CHOICE") {
        if (answers.length < 2) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.multiMinAnswersUser",
            {},
            "Multiple-choice needs at least 2 options.",
          );
        }
        if (correctCount < 1) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.multiSomeCorrectUser",
            {},
            "Need at least one correct answer (isCorrect: true).",
          );
        }
      }
      if (nType === "TRUE_FALSE") {
        if (answers.length !== 2) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.tfTwoAnswersUser",
            {},
            "True/false needs exactly 2 options (usually two content lines).",
          );
        }
        if (correctCount !== 1) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.tfOneCorrectUser",
            {},
            "True/false needs exactly one correct option (isCorrect: true).",
          );
        }
      }
      if (nType === "SHORT_ANSWER" || nType === "FILL_IN_BLANK") {
        const hasSample = answers.some(
          (a) =>
            a &&
            typeof a === "object" &&
            !Array.isArray(a) &&
            a.isCorrect === true &&
            typeof a.content === "string" &&
            a.content.trim(),
        );
        if (!hasSample) {
          pushQErr(
            errors,
            trimmed,
            parsed,
            sIdx,
            qIdx,
            safeT,
            "workspace.quiz.pasteImport.validation.shortAnswerSampleUser",
            { type: nType },
            "Need at least one sample answer with isCorrect: true and non-empty content for grading ({{type}}).",
          );
        }
      }
    });
  });

  const ok = errors.length === 0;
  return { ok, parsed, errors, warnings, empty: false };
}

export { PASTE_ADVANCE_TEMPLATE_KEY, BASIC_TYPES, ADVANCE_TYPES };

