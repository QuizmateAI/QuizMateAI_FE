import React from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const INPUT_CLS = (isDark) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDark
      ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
      : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-blue-400"
  }`;

const normalizeMatchingPairsInput = (raw) => {
  if (!raw) return [];

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  const pairs = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.pairs)
      ? parsed.pairs
      : Array.isArray(parsed?.matchingPairs)
        ? parsed.matchingPairs
        : [];

  return pairs
    .map((pair) => ({
      leftKey: String(pair?.leftKey ?? pair?.left ?? "").trim(),
      rightKey: String(pair?.rightKey ?? pair?.right ?? "").trim(),
    }))
    .filter((pair) => pair.leftKey || pair.rightKey);
};

const confirmRemove = (message) => window.confirm(message);

export const parseMatchingPairs = (raw) => normalizeMatchingPairsInput(raw);

export const serializeMatchingPairs = (pairs) =>
  JSON.stringify({
    pairs: normalizeMatchingPairsInput(Array.isArray(pairs) ? pairs : []),
  });

function McqEditor({ answers, onChange, isDarkMode, t }) {
  const addAnswer = () => {
    if (answers.length >= 6) return;
    onChange([...answers, { content: "", isCorrect: false }]);
  };

  const removeAnswer = (idx) => {
    if (answers.length <= 2) return;
    if (!confirmRemove(t("workspace.quiz.manualWizard.confirm.removeOption", "Xóa lựa chọn này?"))) return;
    onChange(answers.filter((_, i) => i !== idx));
  };

  const setCorrect = (idx) => {
    onChange(answers.map((answer, index) => ({ ...answer, isCorrect: index === idx })));
  };

  const setContent = (idx, value) => {
    onChange(answers.map((answer, index) => (index === idx ? { ...answer, content: value } : answer)));
  };

  return (
    <div className="space-y-2">
      {answers.map((answer, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCorrect(idx)}
            title={t("workspace.quiz.manualWizard.answerEditor.singleCorrect", "Chọn đáp án đúng")}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.singleCorrect", "Chọn đáp án đúng")}
            className={cn(
              "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
              answer.isCorrect
                ? "border-emerald-500 bg-emerald-500 text-white"
                : isDarkMode
                  ? "border-slate-500 hover:border-emerald-400"
                  : "border-gray-300 hover:border-emerald-400",
            )}
          >
            {answer.isCorrect && <Check className="w-3.5 h-3.5" />}
          </button>

          <input
            className={INPUT_CLS(isDarkMode)}
            placeholder={t("workspace.quiz.manualWizard.answerEditor.optionPlaceholder", {
              number: idx + 1,
              defaultValue: `Lựa chọn ${idx + 1}`,
            })}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.optionPlaceholder", {
              number: idx + 1,
              defaultValue: `Lựa chọn ${idx + 1}`,
            })}
            value={answer.content}
            onChange={(event) => setContent(idx, event.target.value)}
          />

          <button
            type="button"
            onClick={() => removeAnswer(idx)}
            disabled={answers.length <= 2}
            title={t("workspace.quiz.manualWizard.answerEditor.removeOption", "Xóa lựa chọn")}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.removeOption", "Xóa lựa chọn")}
            className="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {answers.length < 6 && (
        <button
          type="button"
          onClick={addAnswer}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors",
            isDarkMode ? "text-blue-400 hover:bg-slate-800" : "text-blue-600 hover:bg-blue-50",
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {t("workspace.quiz.manualWizard.answerEditor.addOption", "Thêm lựa chọn")}
        </button>
      )}

      <p className={cn("text-[11px]", isDarkMode ? "text-slate-500" : "text-gray-400")}>
        {t("workspace.quiz.manualWizard.answerEditor.singleHint", "Nhấn vào vòng tròn để chọn đáp án đúng.")}
      </p>
    </div>
  );
}

function MsEditor({ answers, onChange, isDarkMode, t }) {
  const addAnswer = () => {
    if (answers.length >= 6) return;
    onChange([...answers, { content: "", isCorrect: false }]);
  };

  const removeAnswer = (idx) => {
    if (answers.length <= 2) return;
    if (!confirmRemove(t("workspace.quiz.manualWizard.confirm.removeOption", "Xóa lựa chọn này?"))) return;
    onChange(answers.filter((_, i) => i !== idx));
  };

  const toggleCorrect = (idx) => {
    onChange(answers.map((answer, index) => (index === idx ? { ...answer, isCorrect: !answer.isCorrect } : answer)));
  };

  const setContent = (idx, value) => {
    onChange(answers.map((answer, index) => (index === idx ? { ...answer, content: value } : answer)));
  };

  return (
    <div className="space-y-2">
      {answers.map((answer, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleCorrect(idx)}
            title={t("workspace.quiz.manualWizard.answerEditor.multiCorrect", "Bật đáp án đúng")}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.multiCorrect", "Bật đáp án đúng")}
            className={cn(
              "shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
              answer.isCorrect
                ? "border-emerald-500 bg-emerald-500 text-white"
                : isDarkMode
                  ? "border-slate-500 hover:border-emerald-400"
                  : "border-gray-300 hover:border-emerald-400",
            )}
          >
            {answer.isCorrect && <Check className="w-3.5 h-3.5" />}
          </button>

          <input
            className={INPUT_CLS(isDarkMode)}
            placeholder={t("workspace.quiz.manualWizard.answerEditor.optionPlaceholder", {
              number: idx + 1,
              defaultValue: `Lựa chọn ${idx + 1}`,
            })}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.optionPlaceholder", {
              number: idx + 1,
              defaultValue: `Lựa chọn ${idx + 1}`,
            })}
            value={answer.content}
            onChange={(event) => setContent(idx, event.target.value)}
          />

          <button
            type="button"
            onClick={() => removeAnswer(idx)}
            disabled={answers.length <= 2}
            title={t("workspace.quiz.manualWizard.answerEditor.removeOption", "Xóa lựa chọn")}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.removeOption", "Xóa lựa chọn")}
            className="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {answers.length < 6 && (
        <button
          type="button"
          onClick={addAnswer}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors",
            isDarkMode ? "text-blue-400 hover:bg-slate-800" : "text-blue-600 hover:bg-blue-50",
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {t("workspace.quiz.manualWizard.answerEditor.addOption", "Thêm lựa chọn")}
        </button>
      )}

      <p className={cn("text-[11px]", isDarkMode ? "text-slate-500" : "text-gray-400")}>
        {t("workspace.quiz.manualWizard.answerEditor.multiHint", "Ô vuông cho phép chọn nhiều đáp án đúng.")}
      </p>
    </div>
  );
}

function TrueFalseEditor({ answers, onChange, isDarkMode, t }) {
  const ensureTwoOptions = (currentAnswers) => {
    const base = [
      { content: t("workspace.quiz.manualWizard.answerEditor.trueLabel", "Đúng"), isCorrect: false },
      { content: t("workspace.quiz.manualWizard.answerEditor.falseLabel", "Sai"), isCorrect: false },
    ];

    if (Array.isArray(currentAnswers) && currentAnswers.length === 2) {
      return currentAnswers.map((answer, index) => ({
        ...answer,
        content: answer.content || base[index].content,
      }));
    }

    return base;
  };

  const normalized = ensureTwoOptions(answers);

  const setCorrect = (idx) => {
    onChange(normalized.map((answer, index) => ({ ...answer, isCorrect: index === idx })));
  };

  return (
    <div className="flex gap-3">
      {normalized.map((answer, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => setCorrect(idx)}
          aria-label={answer.content}
          className={cn(
            "flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all",
            answer.isCorrect
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
              : isDarkMode
                ? "border-slate-600 text-slate-300 hover:border-emerald-400"
                : "border-gray-200 text-gray-600 hover:border-emerald-400",
          )}
        >
          {answer.content}
        </button>
      ))}
    </div>
  );
}

function TextAnswerEditor({
  answers,
  onChange,
  isDarkMode,
  t,
  placeholderKey,
  fallbackPlaceholder,
}) {
  const addAnswer = () => {
    if (answers.length >= 5) return;
    onChange([...answers, { content: "", isCorrect: true }]);
  };

  const removeAnswer = (idx) => {
    if (answers.length <= 1) return;
    if (!confirmRemove(t("workspace.quiz.manualWizard.confirm.removeSampleAnswer", "Xóa đáp án mẫu này?"))) return;
    onChange(answers.filter((_, i) => i !== idx));
  };

  const setContent = (idx, value) => {
    onChange(answers.map((answer, index) => (index === idx ? { ...answer, content: value } : answer)));
  };

  return (
    <div className="space-y-2">
      <p className={cn("text-[11px] font-medium", isDarkMode ? "text-slate-400" : "text-gray-500")}>
        {t("workspace.quiz.manualWizard.answerEditor.textHint", "Thêm các đáp án mẫu chấp nhận (trim + lowercase + bỏ dấu khi so sánh).")}
      </p>

      {answers.map((answer, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            className={INPUT_CLS(isDarkMode)}
            placeholder={t(placeholderKey, { number: idx + 1, defaultValue: `${fallbackPlaceholder} ${idx + 1}` })}
            aria-label={t(placeholderKey, { number: idx + 1, defaultValue: `${fallbackPlaceholder} ${idx + 1}` })}
            value={answer.content}
            onChange={(event) => setContent(idx, event.target.value)}
          />

          <button
            type="button"
            onClick={() => removeAnswer(idx)}
            disabled={answers.length <= 1}
            title={t("workspace.quiz.manualWizard.answerEditor.removeSampleAnswer", "Xóa đáp án mẫu")}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.removeSampleAnswer", "Xóa đáp án mẫu")}
            className="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {answers.length < 5 && (
        <button
          type="button"
          onClick={addAnswer}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors",
            isDarkMode ? "text-blue-400 hover:bg-slate-800" : "text-blue-600 hover:bg-blue-50",
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {t("workspace.quiz.manualWizard.answerEditor.addSampleAnswer", "Thêm đáp án mẫu")}
        </button>
      )}
    </div>
  );
}

function MatchingEditor({ answers, onChange, isDarkMode, t }) {
  const pairs = parseMatchingPairs(answers?.[0]?.matchingPairs || answers?.[0]?.content);

  const savePairs = (nextPairs) => {
    onChange([{
      matchingPairs: nextPairs,
      content: serializeMatchingPairs(nextPairs),
      isCorrect: true,
    }]);
  };

  const addPair = () => {
    if (pairs.length >= 8) return;
    savePairs([...pairs, { leftKey: "", rightKey: "" }]);
  };

  const removePair = (idx) => {
    if (pairs.length <= 2) return;
    if (!confirmRemove(t("workspace.quiz.manualWizard.confirm.removePair", "Xóa cặp ghép này?"))) return;
    savePairs(pairs.filter((_, i) => i !== idx));
  };

  const setPairField = (idx, field, value) => {
    savePairs(pairs.map((pair, index) => (index === idx ? { ...pair, [field]: value } : pair)));
  };

  return (
    <div className="space-y-2">
      <p className={cn("text-[11px] font-medium", isDarkMode ? "text-slate-400" : "text-gray-500")}>
        {t("workspace.quiz.manualWizard.answerEditor.matchingHint", "Nhập cặp ghép (trái -> phải). Tối thiểu 2 cặp.")}
      </p>

      {pairs.map((pair, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            className={INPUT_CLS(isDarkMode)}
            placeholder={t("workspace.quiz.manualWizard.answerEditor.matchingLeftPlaceholder", {
              number: idx + 1,
              defaultValue: `Vế trái ${idx + 1}`,
            })}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.matchingLeftPlaceholder", {
              number: idx + 1,
              defaultValue: `Vế trái ${idx + 1}`,
            })}
            value={pair.leftKey}
            onChange={(event) => setPairField(idx, "leftKey", event.target.value)}
          />

          <span className={cn("shrink-0 text-sm", isDarkMode ? "text-slate-400" : "text-gray-400")}>-&gt;</span>

          <input
            className={INPUT_CLS(isDarkMode)}
            placeholder={t("workspace.quiz.manualWizard.answerEditor.matchingRightPlaceholder", {
              number: idx + 1,
              defaultValue: `Vế phải ${idx + 1}`,
            })}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.matchingRightPlaceholder", {
              number: idx + 1,
              defaultValue: `Vế phải ${idx + 1}`,
            })}
            value={pair.rightKey}
            onChange={(event) => setPairField(idx, "rightKey", event.target.value)}
          />

          <button
            type="button"
            onClick={() => removePair(idx)}
            disabled={pairs.length <= 2}
            title={t("workspace.quiz.manualWizard.answerEditor.removePair", "Xóa cặp")}
            aria-label={t("workspace.quiz.manualWizard.answerEditor.removePair", "Xóa cặp")}
            className="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {pairs.length < 8 && (
        <button
          type="button"
          onClick={addPair}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors",
            isDarkMode ? "text-blue-400 hover:bg-slate-800" : "text-blue-600 hover:bg-blue-50",
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {t("workspace.quiz.manualWizard.answerEditor.addPair", "Thêm cặp")}
        </button>
      )}
    </div>
  );
}

export function AnswerEditor({ questionType, answers, onChange, isDarkMode = false }) {
  const { t } = useTranslation();
  const type = String(questionType || "").toLowerCase();

  if (type === "multiplechoice" || type === "imagebased") {
    return <McqEditor answers={answers} onChange={onChange} isDarkMode={isDarkMode} t={t} />;
  }
  if (type === "multipleselect") {
    return <MsEditor answers={answers} onChange={onChange} isDarkMode={isDarkMode} t={t} />;
  }
  if (type === "truefalse") {
    return <TrueFalseEditor answers={answers} onChange={onChange} isDarkMode={isDarkMode} t={t} />;
  }
  if (type === "shortanswer") {
    return (
      <TextAnswerEditor
        answers={answers}
        onChange={onChange}
        isDarkMode={isDarkMode}
        t={t}
        placeholderKey="workspace.quiz.manualWizard.answerEditor.sampleAnswerPlaceholder"
        fallbackPlaceholder="Đáp án mẫu"
      />
    );
  }
  if (type === "fillblank") {
    return (
      <TextAnswerEditor
        answers={answers}
        onChange={onChange}
        isDarkMode={isDarkMode}
        t={t}
        placeholderKey="workspace.quiz.manualWizard.answerEditor.fillBlankPlaceholder"
        fallbackPlaceholder="Từ/cụm từ điền vào"
      />
    );
  }
  if (type === "matching") {
    return <MatchingEditor answers={answers} onChange={onChange} isDarkMode={isDarkMode} t={t} />;
  }

  return (
    <p className="text-sm text-slate-400">
      {t("workspace.quiz.manualWizard.answerEditor.chooseTypeHint", "Chọn loại câu hỏi để nhập đáp án.")}
    </p>
  );
}

export function buildDefaultAnswers(questionType, labels = {}) {
  const type = String(questionType || "").toLowerCase();
  const trueLabel = labels.trueLabel || "Đúng";
  const falseLabel = labels.falseLabel || "Sai";

  if (type === "multiplechoice" || type === "imagebased") {
    return [
      { content: "", isCorrect: true },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
    ];
  }
  if (type === "multipleselect") {
    return [
      { content: "", isCorrect: true },
      { content: "", isCorrect: true },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
    ];
  }
  if (type === "truefalse") {
    return [
      { content: trueLabel, isCorrect: true },
      { content: falseLabel, isCorrect: false },
    ];
  }
  if (type === "shortanswer" || type === "fillblank") {
    return [{ content: "", isCorrect: true }];
  }
  if (type === "matching") {
    return [{
      matchingPairs: [
        { leftKey: "", rightKey: "" },
        { leftKey: "", rightKey: "" },
      ],
      content: serializeMatchingPairs([
        { leftKey: "", rightKey: "" },
        { leftKey: "", rightKey: "" },
      ]),
      isCorrect: true,
    }];
  }
  return [];
}

export default AnswerEditor;
