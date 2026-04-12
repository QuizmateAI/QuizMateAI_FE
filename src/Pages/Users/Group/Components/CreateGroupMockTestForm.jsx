import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { generateGroupMockTestPreview } from "@/api/AIAPI";
import { createFullQuiz } from "@/api/QuizAPI";

function useProgressSim(active) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      return () => { setProgress(0); };
    }
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p === 0) return 8;
        if (p >= 90) return p;
        if (p < 40) return Math.min(90, p + 14);
        if (p < 70) return Math.min(90, p + 8);
        return Math.min(90, p + 3);
      });
    }, 480);
    return () => {
      clearInterval(timerRef.current);
    };
  }, [active]);

  return progress;
}

export default function CreateGroupMockTestForm({
  isDarkMode = false,
  workspaceId,
  onBack,
  onCreated,
}) {
  const { t } = useTranslation();

  const DIFFICULTY_LEVELS = useMemo(() => [
    { value: "easy", label: t("createGroupMockTestForm.difficulty.easy", "Easy") },
    { value: "medium", label: t("createGroupMockTestForm.difficulty.medium", "Medium") },
    { value: "hard", label: t("createGroupMockTestForm.difficulty.hard", "Hard") },
  ], [t]);

  const [mode, setMode] = useState("examName");
  const [examName, setExamName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [duration, setDuration] = useState(60);

  const [genPhase, setGenPhase] = useState("idle");
  const [template, setTemplate] = useState(null);
  const [genError, setGenError] = useState("");
  const [applyError, setApplyError] = useState("");

  const isGenerating = genPhase === "generating";
  const isApplying = genPhase === "applying";
  const simProgress = useProgressSim(isGenerating);

  const inputCls = [
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all",
    isDarkMode
      ? "bg-slate-800 border-slate-700 text-white focus:border-blue-400 placeholder:text-slate-500"
      : "bg-white border-[#BFDBFE] text-gray-900 focus:border-[#0455BF] placeholder:text-gray-400",
  ].join(" ");

  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`;

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setMode(key)}
      className={[
        "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
        mode === key
          ? isDarkMode
            ? "bg-slate-800 text-blue-300 shadow-sm"
            : "bg-white text-[#0455BF] shadow-sm"
          : isDarkMode
            ? "text-slate-400 hover:text-slate-200"
            : "text-gray-500 hover:text-gray-700",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const handleGenerate = useCallback(async () => {
    const prompt =
      mode === "examName"
        ? examName.trim()
        : customPrompt.trim();

    if (!prompt) {
      setGenError(
        mode === "examName"
          ? t("createGroupMockTestForm.errors.missingExamName", "Please enter the exam name.")
          : t("createGroupMockTestForm.errors.missingCustomPrompt", "Please enter your custom request.")
      );
      return;
    }

    setGenError("");
    setApplyError("");
    setTemplate(null);
    setGenPhase("generating");

    try {
      const payload = {
        workspaceId: Number(workspaceId),
        mode: mode === "examName" ? "EXAM_NAME" : "CUSTOM_PROMPT",
        examName: mode === "examName" ? prompt : undefined,
        customPrompt: mode === "custom" ? prompt : undefined,
        difficulty,
        totalQuestions: Number(totalQuestions),
        duration: Number(duration),
      };
      const res = await generateGroupMockTestPreview(payload);
      const data = res?.data?.data ?? res?.data ?? res;
      setTemplate(data);
      setGenPhase("preview");
    } catch (err) {
      console.error("AI generate mock test error:", err);
      setGenError(err?.response?.data?.message || err?.message || t("createGroupMockTestForm.errors.generateFailed", "Failed to generate template. Please try again."));
      setGenPhase("error");
    }
  }, [mode, examName, customPrompt, difficulty, totalQuestions, duration, workspaceId, t]);

  const handleApply = useCallback(async () => {
    if (!template) return;
    setApplyError("");
    setGenPhase("applying");

    try {
      const fallbackTitle = t("createGroupMockTestForm.fallbackTitle", "Mock Test");
      const quizTitle =
        template.title
        || template.name
        || (mode === "examName" ? examName : fallbackTitle)
        || fallbackTitle;

      const sections = Array.isArray(template.sections)
        ? template.sections
        : [];

      const questions = sections.flatMap((sec) =>
        (Array.isArray(sec.questions) ? sec.questions : []).map((q) => ({
          type: q.type || q.questionType || "multipleChoice",
          text: q.text || q.questionText || "",
          difficulty: q.difficulty || difficulty,
          bloomId: q.bloomId || 1,
          duration: 0,
          explanation: q.explanation || "",
          answers: Array.isArray(q.answers)
            ? q.answers
            : [
                { text: "", correct: false },
                { text: "", correct: false },
              ],
          correctAnswer: q.correctAnswer,
        }))
      );

      const result = await createFullQuiz({
        workspaceId: Number(workspaceId),
        roadmapId: null,
        phaseId: null,
        knowledgeId: null,
        title: quizTitle,
        duration: Number(template.duration || duration),
        quizIntent: "REVIEW",
        timerMode: true,
        passingScore: template.passingScore ?? 7.5,
        maxAttempt: template.maxAttempt ?? 1,
        overallDifficulty: template.difficulty || difficulty,
        questions,
        status: "DRAFT",
      });

      setGenPhase("done");
      onCreated?.(result);
    } catch (err) {
      console.error("Apply mock test template error:", err);
      setApplyError(err?.response?.data?.message || err?.message || t("createGroupMockTestForm.errors.createMockTestFailed", "Failed to create mock test. Please try again."));
      setGenPhase("preview");
    }
  }, [template, mode, examName, difficulty, duration, workspaceId, onCreated, t]);

  const sections = template ? (Array.isArray(template.sections) ? template.sections : []) : [];
  const totalQCount = sections.reduce(
    (sum, s) => sum + (Array.isArray(s.questions) ? s.questions.length : (s.questionCount || 0)),
    0
  ) || template?.totalQuestions || totalQuestions;

  return (
    <div className="flex flex-col h-full">
      <div
        className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors ${
          isDarkMode ? "border-slate-800" : "border-[#BFDBFE]"
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-[#EFF6FF] text-gray-600"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardList className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-[#0455BF]"}`} />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
            {t("createGroupMockTestForm.header.title", "Create Mock Test with AI")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          {t(
            "createGroupMockTestForm.description",
            "AI will generate a suitable exam template. The leader can preview and then apply it to create a DRAFT mock test for the group."
          )}
        </p>

        <div
          className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-[#EFF6FF]"}`}
        >
          {tabBtn("examName", t("createGroupMockTestForm.tabs.examName", "Exam name"))}
          {tabBtn("custom", t("createGroupMockTestForm.tabs.custom", "Custom request"))}
        </div>

        {mode === "examName" ? (
          <div>
            <label className={labelCls}>
              {t("createGroupMockTestForm.examName.label", "Exam / test name")}
            </label>
            <input
              className={inputCls}
              placeholder={t(
                "createGroupMockTestForm.examName.placeholder",
                "e.g., TOEIC 900, Mock Math HSG 2025, AWS SAA-C03..."
              )}
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              disabled={isGenerating || isApplying}
            />
            <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              {t(
                "createGroupMockTestForm.examName.hint",
                "AI will generate a template matching the structure and content of this exam."
              )}
            </p>
          </div>
        ) : (
          <div>
            <label className={labelCls}>
              {t("createGroupMockTestForm.custom.label", "Custom request")}
            </label>
            <textarea
              className={`${inputCls} min-h-[90px] resize-none`}
              placeholder={t(
                "createGroupMockTestForm.custom.placeholder",
                "e.g., Create a 30-question test on Python basics, increasing difficulty, focus on syntax and error handling..."
              )}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isGenerating || isApplying}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>
              {t("createGroupMockTestForm.fields.difficulty", "Difficulty")}
            </label>
            <select
              className={inputCls}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={isGenerating || isApplying}
            >
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              {t("createGroupMockTestForm.fields.totalQuestions", "Number of questions")}
            </label>
            <input
              type="number"
              className={inputCls}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              min={5}
              max={200}
              disabled={isGenerating || isApplying}
            />
          </div>
          <div>
            <label className={labelCls}>
              {t("createGroupMockTestForm.fields.duration", "Duration (minutes)")}
            </label>
            <input
              type="number"
              className={inputCls}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={5}
              disabled={isGenerating || isApplying}
            />
          </div>
        </div>

        {(genPhase === "error" || genError) && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"
            }`}
          >
            {genError || t("createGroupMockTestForm.errors.genericGenerate", "An error occurred while generating the template.")}
          </div>
        )}

        {isGenerating && (
          <div
            className={`rounded-xl border p-4 space-y-3 ${
              isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-[#BFDBFE] bg-[#EFF6FF]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-[#0455BF]"} animate-pulse`} />
              <span className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-[#0455BF]"}`}>
                {t("createGroupMockTestForm.generating.title", "AI is generating the template…")}
              </span>
              <span className={`ml-auto text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {simProgress}%
              </span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-700" : "bg-[#BFDBFE]"}`}>
              <div
                className="h-full bg-[#0455BF] rounded-full transition-all duration-500"
                style={{ width: `${simProgress}%` }}
              />
            </div>
            <p className={`text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              {t("createGroupMockTestForm.generating.hint", "This may take 15–40 seconds depending on complexity…")}
            </p>
          </div>
        )}

        {genPhase === "preview" && template && (
          <div
            className={`rounded-xl border space-y-3 overflow-hidden ${
              isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-[#BFDBFE] bg-[#EFF6FF]/60"
            }`}
          >
            <div
              className={`px-4 py-3 border-b flex items-center gap-2 ${
                isDarkMode ? "border-slate-700 bg-slate-800" : "border-[#BFDBFE] bg-white"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
                {t("createGroupMockTestForm.preview.ready", "AI template is ready")}
              </span>
              <button
                type="button"
                onClick={() => { setGenPhase("idle"); setTemplate(null); }}
                className={`ml-auto text-xs underline ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
              >
                {t("createGroupMockTestForm.preview.regenerate", "Regenerate")}
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3">
              <div>
                <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {t("createGroupMockTestForm.preview.examTitle", "Exam name")}
                </p>
                <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {template.title || template.name || (mode === "examName" ? examName : t("createGroupMockTestForm.fallbackTitle", "Mock Test"))}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t("createGroupMockTestForm.preview.stats.questionCount", "Questions"), value: totalQCount },
                  { label: t("createGroupMockTestForm.preview.stats.duration", "Duration"), value: t("createGroupMockTestForm.preview.durationValue", "{{value}} minutes", { value: template.duration || duration }) },
                  { label: t("createGroupMockTestForm.preview.stats.difficulty", "Difficulty"), value: DIFFICULTY_LEVELS.find((d) => d.value === (template.difficulty || difficulty))?.label || difficulty },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className={`rounded-lg px-3 py-2 text-center ${
                      isDarkMode ? "bg-slate-700/60" : "bg-white border border-[#BFDBFE]"
                    }`}
                  >
                    <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>{label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${isDarkMode ? "text-white" : "text-[#0455BF]"}`}>{value}</p>
                  </div>
                ))}
              </div>

              {sections.length > 0 && (
                <div>
                  <p className={`text-xs font-medium mb-1.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {t("createGroupMockTestForm.preview.structure", "Exam structure ({{count}} sections)", { count: sections.length })}
                  </p>
                  <div className="space-y-1.5">
                    {sections.map((sec, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                          isDarkMode ? "bg-slate-700/40 text-slate-300" : "bg-white border border-[#EFF6FF] text-gray-700"
                        }`}
                      >
                        <span className="font-medium truncate max-w-[70%]">
                          {sec.title || sec.name || t("createGroupMockTestForm.preview.sectionFallback", "Section {{index}}", { index: i + 1 })}
                        </span>
                        <span className={`shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
                          {Array.isArray(sec.questions) ? sec.questions.length : (sec.questionCount || 0)} {t("createGroupMockTestForm.preview.questionCountSuffix", "questions")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {template.description && (
                <p className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {template.description}
                </p>
              )}

              {applyError && (
                <div
                  className={`text-xs px-3 py-2 rounded-lg ${
                    isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"
                  }`}
                >
                  {applyError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors ${
          isDarkMode ? "border-slate-800" : "border-[#BFDBFE]"
        }`}
      >
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isGenerating || isApplying}
          className={isDarkMode ? "border-slate-700 text-slate-300" : "border-[#BFDBFE] text-gray-700"}
        >
          {t("createGroupMockTestForm.buttons.cancel", "Cancel")}
        </Button>

        {genPhase !== "preview" ? (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isApplying}
            className="bg-[#0455BF] hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("createGroupMockTestForm.buttons.generating", "Generating…")}
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                {t("createGroupMockTestForm.buttons.generate", "Generate template with AI")}
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleApply}
            disabled={isApplying}
            className="bg-[#0455BF] hover:bg-blue-700 text-white"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("createGroupMockTestForm.buttons.applying", "Creating Draft…")}
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                {t("createGroupMockTestForm.buttons.apply", "Apply & Create Draft")}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
