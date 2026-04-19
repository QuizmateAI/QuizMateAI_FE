import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import Step1Config from "./Step1Config";
import Step2Questions from "./Step2Questions";
import { buildDefaultAnswers, parseMatchingPairs } from "./AnswerEditor";
import { createManualQuizBulk, updateManualQuizBulk, getQuizFull } from "@/api/QuizAPI";
import { getQuestionTypes } from "@/api/AIAPI";
import { useToast } from "@/context/ToastContext";
import { unwrapApiData, unwrapApiList } from "@/Utils/apiResponse";
import { mapQuizToWizardState, mapQuizToNewWizardState } from "./wizardHelpers";

const DRAFT_STORAGE_KEY = (workspaceId) => `manualQuizDraft:${workspaceId}`;

const DEFAULT_CONFIG = {
  title: "",
  description: "",
  questionCount: 10,
  timerMode: true,
  duration: 30,
  overallDifficulty: null,
  quizIntent: "REVIEW",
};

function serializeWizardState(config, questions) {
  return JSON.stringify({
    config: config || DEFAULT_CONFIG,
    questions: Array.isArray(questions) ? questions : [],
  });
}

const FRONTEND_TO_BACKEND_TYPE_NAMES = {
  multiplechoice: ["SINGLE_CHOICE"],
  multipleselect: ["MULTIPLE_CHOICE", "MULTIPLE_SELECT"],
  shortanswer: ["SHORT_ANSWER"],
  truefalse: ["TRUE_FALSE"],
  fillblank: ["FILL_IN_BLANK"],
  matching: ["MATCHING"],
  imagebased: ["IMAGED_BASED"],
};

function normalizeQuestionTypeName(value) {
  return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function buildQuestionTypeLookup(questionTypes = []) {
  return (Array.isArray(questionTypes) ? questionTypes : []).reduce((lookup, item) => {
    const rawName = item?.questionType ?? item?.name;
    const questionTypeId = Number(item?.questionTypeId ?? item?.id);
    const normalizedName = normalizeQuestionTypeName(rawName);

    if (normalizedName && Number.isInteger(questionTypeId) && questionTypeId > 0) {
      lookup.set(normalizedName, questionTypeId);
    }
    return lookup;
  }, new Map());
}

function buildQuestionTypeNameByIdLookup(questionTypes = []) {
  return (Array.isArray(questionTypes) ? questionTypes : []).reduce((lookup, item) => {
    const rawName = item?.questionType ?? item?.name;
    const questionTypeId = Number(item?.questionTypeId ?? item?.id);
    const normalizedName = normalizeQuestionTypeName(rawName);

    if (normalizedName && Number.isInteger(questionTypeId) && questionTypeId > 0) {
      lookup.set(questionTypeId, normalizedName);
    }
    return lookup;
  }, new Map());
}

function resolveQuestionTypeId(question, questionTypeLookup, questionTypeNameById) {
  const directQuestionTypeId = Number(question?.questionTypeId);
  const backendTypeNames = FRONTEND_TO_BACKEND_TYPE_NAMES[String(question?.questionType || "").toLowerCase()] || [];

  if (Number.isInteger(directQuestionTypeId) && directQuestionTypeId > 0) {
    const directQuestionTypeName = questionTypeNameById.get(directQuestionTypeId);
    const matchesCurrentUiType =
      !backendTypeNames.length || !directQuestionTypeName || backendTypeNames.includes(directQuestionTypeName);

    if (matchesCurrentUiType) {
      return directQuestionTypeId;
    }

    console.warn("[ManualQuizWizard] Ignoring stale questionTypeId", {
      questionId: question?.id,
      questionType: question?.questionType,
      questionTypeId: directQuestionTypeId,
      resolvedBackendType: directQuestionTypeName,
      expectedBackendTypes: backendTypeNames,
    });
  }

  for (const backendTypeName of backendTypeNames) {
    const resolvedQuestionTypeId = questionTypeLookup.get(backendTypeName);
    if (Number.isInteger(resolvedQuestionTypeId) && resolvedQuestionTypeId > 0) {
      return resolvedQuestionTypeId;
    }
  }

  return null;
}

function buildScaffoldQuestions(count, config) {
  const perQ = count > 0 ? Math.max(5, Math.floor((config.duration * 60) / count)) : 60;
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${Date.now()}-${i}`,
    questionType: "multipleChoice",
    content: "",
    duration: perQ,
    timeLocked: false,
    explanation: "",
    answers: buildDefaultAnswers("multipleChoice"),
  }));
}

function syncQuestionsToCount(existingQuestions, config) {
  const targetCount = Math.max(1, Number(config?.questionCount) || 1);
  const safeExisting = Array.isArray(existingQuestions) ? existingQuestions : [];

  if (safeExisting.length === 0) {
    return buildScaffoldQuestions(targetCount, config);
  }

  if (safeExisting.length === targetCount) {
    return safeExisting;
  }

  if (safeExisting.length > targetCount) {
    return safeExisting.slice(0, targetCount);
  }

  return [...safeExisting, ...buildScaffoldQuestions(targetCount - safeExisting.length, config)];
}

function buildAnswerPayload(q, a) {
  const isMatching = String(q.questionType || "").toLowerCase() === "matching";
  if (isMatching) {
    const matchingPairs = parseMatchingPairs(a?.matchingPairs || a?.content);
    return {
      ...(a._answerId ? { answerId: a._answerId } : {}),
      ...(matchingPairs.length > 0 ? { matchingPairs } : {}),
      isCorrect: true,
    };
  }
  return {
    ...(a._answerId ? { answerId: a._answerId } : {}),
    content: a?.content,
    isCorrect: a?.isCorrect,
  };
}

function buildPayload(config, questions, workspaceId, questionTypes, t) {
  const questionTypeLookup = buildQuestionTypeLookup(questionTypes);
  const questionTypeNameById = buildQuestionTypeNameByIdLookup(questionTypes);
  return {
    workspaceId: Number(workspaceId),
    title: config.title,
    description: config.description || "",
    timerMode: config.timerMode,
    duration: config.timerMode ? (config.duration || 30) * 60 : null,
    quizIntent: "REVIEW",
    overallDifficulty: null,
    sections: [
      {
        content: "Root",
        orderIndex: 1,
        questions: questions.map((q, idx) => {
          const questionTypeId = resolveQuestionTypeId(q, questionTypeLookup, questionTypeNameById);
          if (!questionTypeId) {
            throw new Error(t("workspace.quiz.manualWizard.toasts.missingQuestionType", {
              number: idx + 1,
              defaultValue: `Không xác định được loại câu hỏi cho câu ${idx + 1}.`,
            }));
          }

          return {
            questionTypeId,
            content: q.content,
            explanation: q.explanation || "",
            duration: config.timerMode ? null : (q.duration || 60),
            answers: (q.answers || []).map((a) => buildAnswerPayload(q, a)),
          };
        }),
      },
    ],
  };
}

function buildUpdatePayload(config, questions, editingSectionId, questionTypes, t) {
  const questionTypeLookup = buildQuestionTypeLookup(questionTypes);
  const questionTypeNameById = buildQuestionTypeNameByIdLookup(questionTypes);

  return {
    title: config.title,
    description: config.description || "",
    timerMode: config.timerMode,
    duration: config.timerMode ? (config.duration || 30) * 60 : null,
    sections: [
      {
        ...(editingSectionId ? { sectionId: editingSectionId } : {}),
        content: "Root",
        orderIndex: 1,
        questions: questions.map((q, idx) => {
          const questionTypeId = resolveQuestionTypeId(q, questionTypeLookup, questionTypeNameById);
          if (!questionTypeId) {
            throw new Error(t("workspace.quiz.manualWizard.toasts.missingQuestionType", {
              number: idx + 1,
              defaultValue: `Không xác định được loại câu hỏi cho câu ${idx + 1}.`,
            }));
          }

          return {
            ...(q._questionId ? { questionId: q._questionId } : {}),
            questionTypeId,
            content: q.content,
            explanation: q.explanation || "",
            duration: config.timerMode ? null : (q.duration || 60),
            answers: (q.answers || []).map((a) => buildAnswerPayload(q, a)),
          };
        }),
      },
    ],
  };
}

/**
 * ManualQuizWizard — supports create, edit, and clone modes.
 *
 * Props:
 *  - workspaceId: number
 *  - editingQuizId?: number — if set, loads quiz and edits in-place via update-bulk
 *  - cloneFromQuizId?: number — if set, loads quiz as template and creates new via create-bulk
 *  - onCreateQuiz(quiz): called after successful create (create or clone mode)
 *  - onSaveQuiz(quiz): called after successful update (edit mode)
 *  - onBack(): exit form
 *  - isDarkMode
 */
function ManualQuizWizard({
  workspaceId,
  editingQuizId,
  cloneFromQuizId,
  onCreateQuiz,
  onSaveQuiz,
  onBack,
  isDarkMode = false,
}) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [questions, setQuestions] = useState([]);
  const [questionTypes, setQuestionTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const initialSnapshotRef = useRef(serializeWizardState(DEFAULT_CONFIG, []));

  // Loading state for edit/clone mode — show spinner while fetching quiz data
  const [initialLoading, setInitialLoading] = useState(Boolean(editingQuizId || cloneFromQuizId));

  // Load question types from API
  useEffect(() => {
    let active = true;
    const loadQuestionTypes = async () => {
      try {
        const res = await getQuestionTypes();
        if (active) setQuestionTypes(unwrapApiList(res));
      } catch {
        if (active) setQuestionTypes([]);
      }
    };
    loadQuestionTypes();
    return () => { active = false; };
  }, []);

  // Load existing quiz for edit or clone mode
  useEffect(() => {
    const sourceId = editingQuizId || cloneFromQuizId;
    if (!sourceId) return;

    let active = true;
    setInitialLoading(true);

    const loadQuiz = async () => {
      try {
        const [quizRes, typesRes] = await Promise.all([
          getQuizFull(sourceId),
          getQuestionTypes(),
        ]);

        if (!active) return;

        const quizFull = unwrapApiData(quizRes);
        const types = unwrapApiList(typesRes);
        setQuestionTypes(types);

        const mapFn = editingQuizId ? mapQuizToWizardState : mapQuizToNewWizardState;
        const { config: loadedConfig, questions: loadedQuestions, sectionId } = mapFn(quizFull, types);

        initialSnapshotRef.current = serializeWizardState(loadedConfig, loadedQuestions);
        setConfig(loadedConfig);
        setQuestions(loadedQuestions);
        if (editingQuizId) setEditingSectionId(sectionId);
        setStep(editingQuizId ? 2 : 1);
      } catch (err) {
        if (!active) return;
        console.error("[ManualQuizWizard] Failed to load quiz", err);
        addToast?.({ type: "error", message: t("workspace.quiz.manualWizard.toasts.loadError", "Không thể tải dữ liệu quiz.") });
        onBack?.();
      } finally {
        if (active) setInitialLoading(false);
      }
    };

    loadQuiz();
    return () => { active = false; };
  }, [editingQuizId, cloneFromQuizId, addToast, onBack, t]);

  // Restore draft from localStorage — only in create mode
  useEffect(() => {
    if (editingQuizId || cloneFromQuizId || !workspaceId) return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY(workspaceId));
      if (raw) {
        const draft = JSON.parse(raw);
        const nextConfig = draft.config || DEFAULT_CONFIG;
        const nextQuestions = Array.isArray(draft.questions) ? draft.questions : [];
        initialSnapshotRef.current = serializeWizardState(nextConfig, nextQuestions);
        if (draft.config) setConfig(nextConfig);
        if (nextQuestions.length > 0) {
          setQuestions(nextQuestions);
          setStep(2);
        }
      } else {
        initialSnapshotRef.current = serializeWizardState(DEFAULT_CONFIG, []);
      }
    } catch {
      // ignore malformed draft
      initialSnapshotRef.current = serializeWizardState(DEFAULT_CONFIG, []);
    }
  }, [workspaceId, editingQuizId, cloneFromQuizId]);

  // Autosave draft — only in create mode
  useEffect(() => {
    if (editingQuizId || cloneFromQuizId || !workspaceId || step < 2) return;
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY(workspaceId),
        JSON.stringify({ config, questions }),
      );
    } catch {
      // ignore quota errors
    }
  }, [workspaceId, config, questions, step, editingQuizId, cloneFromQuizId]);

  const isEditMode = Boolean(editingQuizId);
  const isCloneMode = Boolean(cloneFromQuizId);
  const currentSnapshot = serializeWizardState(config, questions);
  const hasUnsavedChanges = currentSnapshot !== initialSnapshotRef.current;

  useEffect(() => {
    if (!hasUnsavedChanges || submitting) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, submitting]);

  const handleExitWizard = useCallback(() => {
    if (!hasUnsavedChanges) {
      onBack?.();
      return;
    }

    const confirmMessage = isEditMode
      ? t("workspace.quiz.manualWizard.confirm.exitEdit", "Bạn có thay đổi chưa lưu. Hủy chỉnh sửa và quay lại?")
      : isCloneMode
        ? t("workspace.quiz.manualWizard.confirm.exitClone", "Bạn có thay đổi chưa lưu. Hủy tạo quiz tương tự và quay lại?")
        : t("workspace.quiz.manualWizard.confirm.exitCreate", "Bạn có thay đổi chưa lưu. Quay lại ngay bây giờ? Bản nháp local sẽ vẫn được giữ.");

    if (window.confirm(confirmMessage)) {
      onBack?.();
    }
  }, [hasUnsavedChanges, isEditMode, isCloneMode, onBack, t]);

  const handleGoToStep2 = useCallback(() => {
    setQuestions((prev) => syncQuestionsToCount(prev, config));
    setStep(2);
  }, [config]);

  const handleBackToStep1 = useCallback(() => {
    const newCount = config.questionCount;
    const current = questions.length;

    if (newCount > current) {
      const extras = buildScaffoldQuestions(newCount - current, config);
      setQuestions((prev) => [...prev, ...extras]);
    } else if (newCount < current) {
      if (!window.confirm(t("workspace.quiz.manualWizard.confirm.trimQuestions", {
        count: current - newCount,
        defaultValue: `Sẽ xóa ${current - newCount} câu cuối. Tiếp tục?`,
      }))) return;
      setQuestions((prev) => prev.slice(0, newCount));
    }
    setStep(1);
  }, [config, questions.length, t]);

  const handleConfigChange = useCallback((nextConfig) => {
    setConfig(nextConfig);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!workspaceId) return;
    setSubmitting(true);
    try {
      if (editingQuizId) {
        // Edit mode — update-bulk
        const payload = buildUpdatePayload(config, questions, editingSectionId, questionTypes, t);
        console.log("[ManualQuizWizard] updateManualQuizBulk payload", payload);
        const res = await updateManualQuizBulk(editingQuizId, payload);
        const updatedQuiz = unwrapApiData(res);
        initialSnapshotRef.current = currentSnapshot;
        try { localStorage.removeItem(DRAFT_STORAGE_KEY(workspaceId)); } catch { /* noop */ }
        addToast?.({
          type: "success",
          message: t("workspace.quiz.manualWizard.toasts.saveUpdateSuccess", {
            title: config.title,
            defaultValue: `Đã cập nhật quiz "${config.title}" thành công!`,
          }),
        });
        onSaveQuiz?.(updatedQuiz);
      } else {
        // Create or clone mode — create-bulk
        const payload = buildPayload(config, questions, workspaceId, questionTypes, t);
        console.log("[ManualQuizWizard] createManualQuizBulk payload", payload);
        const res = await createManualQuizBulk(payload);
        const createdQuiz = unwrapApiData(res);
        initialSnapshotRef.current = currentSnapshot;
        try { localStorage.removeItem(DRAFT_STORAGE_KEY(workspaceId)); } catch { /* noop */ }
        addToast?.({
          type: "success",
          message: t("workspace.quiz.manualWizard.toasts.saveDraftSuccess", {
            title: config.title,
            defaultValue: `Đã lưu quiz "${config.title}" ở trạng thái bản nháp!`,
          }),
        });
        onCreateQuiz?.(createdQuiz);
      }
    } catch (err) {
      console.error("[ManualQuizWizard] submit error", err);
      console.error("[ManualQuizWizard] submit error response", err?.response?.data || err?.data || err);
      const msg = err?.message || err?.data?.message || t("workspace.quiz.manualWizard.toasts.saveError", "Có lỗi khi lưu quiz.");
      addToast?.({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  }, [workspaceId, config, questions, questionTypes, editingQuizId, editingSectionId, addToast, onCreateQuiz, onSaveQuiz, currentSnapshot, t]);

  if (initialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className={cn("w-7 h-7 animate-spin", isDarkMode ? "text-blue-400" : "text-blue-500")} />
      </div>
    );
  }

  const title = isEditMode
    ? t("workspace.quiz.manualWizard.header.editTitle", "Chỉnh sửa quiz thủ công")
    : isCloneMode
      ? t("workspace.quiz.manualWizard.header.cloneTitle", "Tạo quiz tương tự")
      : t("workspace.quiz.manualWizard.header.createTitle", "Tạo quiz thủ công");
  const description = isEditMode
    ? t("workspace.quiz.manualWizard.header.editDescription", "Cập nhật nội dung quiz hiện có rồi lưu lại khi đã sẵn sàng.")
    : isCloneMode
      ? t("workspace.quiz.manualWizard.header.cloneDescription", "Bạn đang tạo một quiz nháp mới dựa trên nội dung của quiz gốc.")
      : t("workspace.quiz.manualWizard.header.createDescription", "Thiết lập cấu hình rồi soạn câu hỏi để lưu quiz ở trạng thái bản nháp.");
  const exitLabel = isEditMode
    ? t("workspace.quiz.manualWizard.header.exitEdit", "Hủy chỉnh sửa")
    : isCloneMode
      ? t("workspace.quiz.manualWizard.header.exitClone", "Hủy tạo mới")
      : t("workspace.quiz.manualWizard.header.exitCreate", "Quay lại");
  const submitLabel = isEditMode
    ? t("workspace.quiz.manualWizard.header.submitEdit", "Lưu thay đổi")
    : t("workspace.quiz.manualWizard.header.submitCreate", "Lưu bản nháp");
  const submittingLabel = isEditMode
    ? t("workspace.quiz.manualWizard.header.submitEditLoading", "Đang lưu...")
    : t("workspace.quiz.manualWizard.header.submitCreateLoading", "Đang lưu nháp...");

  return (
    <div className={cn("h-full flex flex-col", isDarkMode ? "text-slate-100" : "text-gray-900")}>
      <div className={cn(
        "shrink-0 h-12 px-4 border-b flex items-center gap-3",
        isDarkMode ? "border-slate-800" : "border-gray-200",
      )}>
        <button
          type="button"
          onClick={handleExitWizard}
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
            isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100",
          )}
          title={exitLabel}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold truncate", isDarkMode ? "text-slate-100" : "text-gray-900")}>
            {title}
          </p>
          <p className={cn("text-[11px] truncate", isDarkMode ? "text-slate-400" : "text-gray-500")}>
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExitWizard}
          className={cn(
            "shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
            isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100",
          )}
        >
          {exitLabel}
        </button>
      </div>

      {/* Progress line */}
      <div className="shrink-0 flex h-1">
        <div className={cn("flex-1 transition-colors", step >= 1 ? "bg-blue-500" : isDarkMode ? "bg-slate-700" : "bg-gray-200")} />
        <div className={cn("flex-1 transition-colors", step >= 2 ? "bg-blue-500" : isDarkMode ? "bg-slate-700" : "bg-gray-200")} />
      </div>

      {/* Edit/clone mode banner */}
      {(isEditMode || isCloneMode) && (
        <div className={cn(
          "shrink-0 px-4 py-1.5 text-xs font-medium text-center",
          isEditMode
            ? isDarkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"
            : isDarkMode ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700",
        )}>
          {isEditMode
            ? t("workspace.quiz.manualWizard.header.editBanner", "Đang chỉnh sửa quiz")
            : t("workspace.quiz.manualWizard.header.cloneBanner", "Tạo quiz tương tự - nội dung được sao chép từ quiz gốc")}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {step === 1 && (
          <div className="h-full overflow-y-auto px-4">
            <Step1Config
              config={config}
              onConfigChange={handleConfigChange}
              onNext={handleGoToStep2}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {step === 2 && (
          <Step2Questions
            config={config}
            questions={questions}
            setQuestions={setQuestions}
            workspaceId={workspaceId}
            excludeQuizId={editingQuizId || cloneFromQuizId || undefined}
            onBack={handleBackToStep1}
            onSubmit={handleSubmit}
            submitLabel={submitLabel}
            submittingLabel={submittingLabel}
            submitting={submitting}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );
}


export default ManualQuizWizard;
