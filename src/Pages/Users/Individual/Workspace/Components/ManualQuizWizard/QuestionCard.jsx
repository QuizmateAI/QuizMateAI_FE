import React from "react";
import { Trash2, Lock, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AnswerEditor, buildDefaultAnswers, parseMatchingPairs } from "./AnswerEditor";

const QUESTION_TYPE_VALUES = [
  "multipleChoice",
  "multipleSelect",
  // "imageBased", // Tạm ẩn loại câu hỏi kèm ảnh theo yêu cầu
  "trueFalse",
  "shortAnswer",
  "fillBlank",
  "matching",
];

const INPUT_CLS = (isDark) =>
  `w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none transition-all ${
    isDark
      ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
      : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-blue-400"
  }`;

const LABEL_CLS = (isDark) =>
  `block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`;

const hasMeaningfulAnswerData = (question) => {
  const type = String(question?.questionType || "").toLowerCase();
  const answers = Array.isArray(question?.answers) ? question.answers : [];

  if (type === "matching") {
    const pairs = parseMatchingPairs(answers?.[0]?.matchingPairs || answers?.[0]?.content);
    return pairs.some((pair) => String(pair.leftKey || "").trim() || String(pair.rightKey || "").trim());
  }

  return answers.some((answer) => String(answer?.content || "").trim());
};

export function getCardStatus(q) {
  if (!String(q.content || "").trim()) return "empty";
  if (!q.questionType) return "error";

  const type = q.questionType.toLowerCase();
  const answers = q.answers || [];

  if (type === "multiplechoice" || type === "imagebased") {
    if (answers.length < 2) return "error";
    if (!answers.some((answer) => answer.isCorrect)) return "error";
    if (answers.some((answer) => !String(answer.content || "").trim())) return "warning";
    return "ok";
  }
  if (type === "multipleselect") {
    if (answers.length < 2) return "error";
    if (!answers.some((answer) => answer.isCorrect)) return "error";
    if (answers.some((answer) => !String(answer.content || "").trim())) return "warning";
    return "ok";
  }
  if (type === "truefalse") {
    if (answers.length !== 2) return "error";
    if (!answers.some((answer) => answer.isCorrect)) return "error";
    return "ok";
  }
  if (type === "shortanswer" || type === "fillblank") {
    if (answers.length < 1 || !answers.some((answer) => String(answer.content || "").trim())) return "warning";
    return "ok";
  }
  if (type === "matching") {
    const pairs = parseMatchingPairs(answers[0]?.matchingPairs || answers[0]?.content);
    if (pairs.length < 2) return "error";
    if (pairs.some((pair) => !String(pair.leftKey || "").trim() || !String(pair.rightKey || "").trim())) return "warning";
    return "ok";
  }
  return "ok";
}

function QuestionCard({
  question,
  index,
  onChange,
  onDelete,
  canDelete,
  timerMode,
  isDarkMode = false,
  onToggleLock,
  onDurationChange,
}) {
  const { t } = useTranslation();
  const cardId = `question-${question.id}`;
  const status = getCardStatus(question);

  const questionTypeOptions = QUESTION_TYPE_VALUES.map((value) => ({
    value,
    label: t(`workspace.quiz.manualWizard.questionCard.types.${value}`, value),
  }));

  const statusBorderCls = {
    ok: isDarkMode ? "border-emerald-700/50" : "border-emerald-200",
    warning: isDarkMode ? "border-amber-700/50" : "border-amber-200",
    error: isDarkMode ? "border-red-700/50" : "border-red-300",
    empty: isDarkMode ? "border-slate-700" : "border-gray-200",
  }[status];

  const handleTypeChange = (newType) => {
    const normalizedCurrentType = String(question.questionType || "").toLowerCase();
    const normalizedNextType = String(newType || "").toLowerCase();

    if (!normalizedNextType || normalizedCurrentType === normalizedNextType) return;

    const needsConfirm = Boolean(question._questionId) || hasMeaningfulAnswerData(question);
    if (needsConfirm && !window.confirm(t("workspace.quiz.manualWizard.confirm.changeType", "Đổi loại câu hỏi sẽ làm mới phần đáp án hiện tại. Nội dung câu hỏi sẽ được giữ lại. Tiếp tục?"))) {
      return;
    }

    const isReplacingPersistedQuestion = Boolean(question._questionId);

    onChange({
      ...question,
      ...(isReplacingPersistedQuestion
        ? {
            _questionId: null,
            _sectionId: null,
            _replacedQuestionId: question._questionId,
          }
        : null),
      questionType: newType,
      questionTypeId: null,
      answers: buildDefaultAnswers(newType, {
        trueLabel: t("workspace.quiz.manualWizard.answerEditor.trueLabel", "Đúng"),
        falseLabel: t("workspace.quiz.manualWizard.answerEditor.falseLabel", "Sai"),
      }),
    });
  };

  return (
    <section
      id={cardId}
      data-question-id={question.id}
      data-card-status={status}
      className={cn(
        "rounded-xl border-2 p-3 space-y-3 scroll-mt-4 transition-colors",
        statusBorderCls,
        isDarkMode ? "bg-slate-900/60" : "bg-white",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          "shrink-0 mt-5 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold",
          isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600",
        )}>
          {index}
        </span>

        <div className="flex-1">
          <div>
            <label className={LABEL_CLS(isDarkMode)}>
              {t("workspace.quiz.manualWizard.questionCard.typeLabel", "Loại câu")}
            </label>
            <select
              value={question.questionType || ""}
              onChange={(event) => handleTypeChange(event.target.value)}
              title={question._questionId ? t("workspace.quiz.manualWizard.questionCard.replaceNotice", "Câu này sẽ được tạo mới khi lưu vì bạn đã đổi loại câu hỏi của một câu đã tồn tại trước đó.") : undefined}
              aria-label={t("workspace.quiz.manualWizard.questionCard.typeLabel", "Loại câu")}
              className={cn(INPUT_CLS(isDarkMode), "w-full")}
            >
              <option value="" disabled>
                {t("workspace.quiz.manualWizard.questionCard.typePlaceholder", "-- Loại câu hỏi --")}
              </option>
              {questionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!timerMode && (
          <div className="shrink-0 w-24">
            <label className={LABEL_CLS(isDarkMode)}>
              {t("workspace.quiz.manualWizard.questionCard.durationLabel", "Giây")}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="5"
                step="5"
                value={question.duration ?? 60}
                onChange={(event) => onDurationChange?.(question.id, event.target.value)}
                aria-label={t("workspace.quiz.manualWizard.questionCard.durationLabel", "Giây")}
                className={cn(INPUT_CLS(isDarkMode), "w-full text-center")}
              />
              <button
                type="button"
                title={question.timeLocked
                  ? t("workspace.quiz.manualWizard.questionCard.durationUnlock", "Mở khóa thời gian")
                  : t("workspace.quiz.manualWizard.questionCard.durationLock", "Khóa thời gian")}
                aria-label={question.timeLocked
                  ? t("workspace.quiz.manualWizard.questionCard.durationUnlock", "Mở khóa thời gian")
                  : t("workspace.quiz.manualWizard.questionCard.durationLock", "Khóa thời gian")}
                onClick={() => onToggleLock?.(question.id)}
                className={cn(
                  "shrink-0 p-1 rounded-lg transition-colors",
                  question.timeLocked
                    ? "text-amber-500 bg-amber-500/10"
                    : isDarkMode
                      ? "text-slate-500 hover:bg-slate-800"
                      : "text-gray-400 hover:bg-gray-100",
                )}
              >
                {question.timeLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          title={t("workspace.quiz.manualWizard.questionCard.deleteQuestion", "Xóa câu hỏi")}
          aria-label={t("workspace.quiz.manualWizard.questionCard.deleteQuestion", "Xóa câu hỏi")}
          className="shrink-0 mt-5 text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {question._replacedQuestionId && (
        <p className={cn("text-[11px]", isDarkMode ? "text-slate-500" : "text-gray-500")}>
          {t("workspace.quiz.manualWizard.questionCard.replaceNotice", "Câu này sẽ được tạo mới khi lưu vì bạn đã đổi loại câu hỏi của một câu đã tồn tại trước đó.")}
        </p>
      )}

      <div>
        <label className={LABEL_CLS(isDarkMode)}>
          {t("workspace.quiz.manualWizard.questionCard.contentLabel", "Nội dung câu hỏi")} <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={2}
          className={cn(INPUT_CLS(isDarkMode), "resize-none")}
          placeholder={t("workspace.quiz.manualWizard.questionCard.contentPlaceholder", "Nhập nội dung câu hỏi...")}
          aria-label={t("workspace.quiz.manualWizard.questionCard.contentLabel", "Nội dung câu hỏi")}
          value={question.content || ""}
          onChange={(event) => onChange({ ...question, content: event.target.value })}
        />
      </div>

      {question.questionType && (
        <div>
          <label className={LABEL_CLS(isDarkMode)}>
            {t("workspace.quiz.manualWizard.questionCard.answersLabel", "Đáp án")}
          </label>
          <AnswerEditor
            questionType={question.questionType}
            answers={question.answers || []}
            onChange={(nextAnswers) => onChange({ ...question, answers: nextAnswers })}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      <div>
        <label className={LABEL_CLS(isDarkMode)}>
          {t("workspace.quiz.manualWizard.questionCard.explanationLabel", "Giải thích (tùy chọn)")}
        </label>
        <textarea
          rows={1}
          className={cn(INPUT_CLS(isDarkMode), "resize-none")}
          placeholder={t("workspace.quiz.manualWizard.questionCard.explanationPlaceholder", "Giải thích đáp án đúng...")}
          aria-label={t("workspace.quiz.manualWizard.questionCard.explanationLabel", "Giải thích (tùy chọn)")}
          value={question.explanation || ""}
          onChange={(event) => onChange({ ...question, explanation: event.target.value })}
        />
      </div>

      {question.importedFromQuizId && (
        <p className={cn(
          "text-[11px] px-2 py-0.5 rounded-lg inline-block",
          isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500",
        )}>
          {t("workspace.quiz.manualWizard.questionCard.importedFrom", {
            title: question.importedFromQuizTitle || t("workspace.quiz.manualWizard.questionCard.importedFallback", {
              id: question.importedFromQuizId,
              defaultValue: `Quiz #${question.importedFromQuizId}`,
            }),
            defaultValue: `Nhập từ: ${question.importedFromQuizTitle || `Quiz #${question.importedFromQuizId}`}`,
          })}
        </p>
      )}
    </section>
  );
}

export default QuestionCard;
