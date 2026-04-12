import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { generateMockTest } from "@/api/AIAPI";
import { createFullQuiz } from "@/api/QuizAPI";

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Trung bình" },
  { value: "hard", label: "Khó" },
];

// Simulate AI polling progress animation
function useProgressSim(active) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      // Reset progress when inactive (via functional update, avoids sync setState warning)
      timerRef.current = null;
      return () => { setProgress(0); };
    }
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p === 0) return 8; // first tick: initialize
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

/**
 * CreateGroupMockTestForm
 * AI-only mock test creation for group workspace.
 * Leader picks one of two modes:
 *   - "examName" → nhập tên kỳ thi để AI tạo template tương ứng
 *   - "custom"   → nhập prompt tuỳ chỉnh
 * Flow: AI tạo template → leader xem trước → Áp dụng & Tạo Draft
 */
export default function CreateGroupMockTestForm({
  isDarkMode = false,
  workspaceId,
  onBack,
  onCreated, // callback(quiz) khi đã tạo xong draft
}) {
  // ── UI state ──
  const [mode, setMode] = useState("examName"); // "examName" | "custom"
  const [examName, setExamName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [duration, setDuration] = useState(60);

  // ── Generation state ──
  const [genPhase, setGenPhase] = useState("idle"); // "idle" | "generating" | "preview" | "applying" | "done" | "error"
  const [template, setTemplate] = useState(null); // raw AI result
  const [genError, setGenError] = useState("");
  const [applyError, setApplyError] = useState("");

  const isGenerating = genPhase === "generating";
  const isApplying = genPhase === "applying";
  const simProgress = useProgressSim(isGenerating);

  // ── Input helpers ──
  const inputCls = [
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all",
    isDarkMode
      ? "bg-slate-800 border-slate-700 text-white focus:border-blue-400 placeholder:text-slate-500"
      : "bg-white border-[#BFDBFE] text-gray-900 focus:border-[#0455BF] placeholder:text-gray-400",
  ].join(" ");

  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`;

  // ── Mode tab ──
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

  // ── Generate template ──
  const handleGenerate = useCallback(async () => {
    const prompt =
      mode === "examName"
        ? examName.trim()
        : customPrompt.trim();

    if (!prompt) {
      setGenError(
        mode === "examName"
          ? "Vui lòng nhập tên kỳ thi."
          : "Vui lòng nhập yêu cầu tuỳ chỉnh."
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
      const res = await generateMockTest(payload);
      const data = res?.data?.data ?? res?.data ?? res;
      setTemplate(data);
      setGenPhase("preview");
    } catch (err) {
      console.error("AI generate mock test error:", err);
      setGenError(err?.response?.data?.message || err?.message || "Tạo template thất bại. Vui lòng thử lại.");
      setGenPhase("error");
    }
  }, [mode, examName, customPrompt, difficulty, totalQuestions, duration, workspaceId]);

  // ── Apply template → create DRAFT ──
  const handleApply = useCallback(async () => {
    if (!template) return;
    setApplyError("");
    setGenPhase("applying");

    try {
      // Normalise template fields from AI response
      const quizTitle =
        template.title
        || template.name
        || (mode === "examName" ? examName : "Mock Test")
        || "Mock Test";

      const sections = Array.isArray(template.sections)
        ? template.sections
        : [];

      // Build questions from sections
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
      setApplyError(err?.response?.data?.message || err?.message || "Tạo mock test thất bại. Vui lòng thử lại.");
      setGenPhase("preview");
    }
  }, [template, mode, examName, difficulty, duration, workspaceId, onCreated]);

  // ── Section breakdown display ──
  const sections = template ? (Array.isArray(template.sections) ? template.sections : []) : [];
  const totalQCount = sections.reduce(
    (sum, s) => sum + (Array.isArray(s.questions) ? s.questions.length : (s.questionCount || 0)),
    0
  ) || template?.totalQuestions || totalQuestions;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
            Tạo Mock Test bằng AI
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Intro */}
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          AI sẽ tạo template đề thi phù hợp. Leader có thể xem trước rồi áp dụng để tạo bài mock test (DRAFT) cho nhóm.
        </p>

        {/* Mode tabs */}
        <div
          className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-[#EFF6FF]"}`}
        >
          {tabBtn("examName", "Tên kỳ thi")}
          {tabBtn("custom", "Yêu cầu tuỳ chỉnh")}
        </div>

        {/* Input fields */}
        {mode === "examName" ? (
          <div>
            <label className={labelCls}>Tên kỳ thi / đề thi</label>
            <input
              className={inputCls}
              placeholder="VD: TOEIC 900, Thi thử THPTQG Toán 2025, AWS SAA-C03..."
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              disabled={isGenerating || isApplying}
            />
            <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              AI sẽ tạo template phù hợp với cấu trúc và nội dung của kỳ thi này.
            </p>
          </div>
        ) : (
          <div>
            <label className={labelCls}>Yêu cầu tuỳ chỉnh</label>
            <textarea
              className={`${inputCls} min-h-[90px] resize-none`}
              placeholder="VD: Tạo bài kiểm tra 30 câu về Lập trình Python cơ bản, độ khó tăng dần, tập trung vào cú pháp và xử lý lỗi..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isGenerating || isApplying}
            />
          </div>
        )}

        {/* Config */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Độ khó</label>
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
            <label className={labelCls}>Số câu hỏi</label>
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
            <label className={labelCls}>Thời gian (phút)</label>
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

        {/* Generation error */}
        {(genPhase === "error" || genError) && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"
            }`}
          >
            {genError || "Có lỗi xảy ra khi tạo template."}
          </div>
        )}

        {/* Progress bar while generating */}
        {isGenerating && (
          <div
            className={`rounded-xl border p-4 space-y-3 ${
              isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-[#BFDBFE] bg-[#EFF6FF]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-[#0455BF]"} animate-pulse`} />
              <span className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-[#0455BF]"}`}>
                AI đang tạo template…
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
              Quá trình có thể mất 15–40 giây tuỳ độ phức tạp…
            </p>
          </div>
        )}

        {/* Template preview */}
        {genPhase === "preview" && template && (
          <div
            className={`rounded-xl border space-y-3 overflow-hidden ${
              isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-[#BFDBFE] bg-[#EFF6FF]/60"
            }`}
          >
            {/* Preview header */}
            <div
              className={`px-4 py-3 border-b flex items-center gap-2 ${
                isDarkMode ? "border-slate-700 bg-slate-800" : "border-[#BFDBFE] bg-white"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
                Template AI đã sẵn sàng
              </span>
              <button
                type="button"
                onClick={() => { setGenPhase("idle"); setTemplate(null); }}
                className={`ml-auto text-xs underline ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
              >
                Tạo lại
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3">
              {/* Title */}
              <div>
                <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  Tên bài thi
                </p>
                <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {template.title || template.name || (mode === "examName" ? examName : "Mock Test")}
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Số câu", value: totalQCount },
                  { label: "Thời gian", value: `${template.duration || duration} phút` },
                  { label: "Độ khó", value: DIFFICULTY_LEVELS.find((d) => d.value === (template.difficulty || difficulty))?.label || difficulty },
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

              {/* Sections breakdown */}
              {sections.length > 0 && (
                <div>
                  <p className={`text-xs font-medium mb-1.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    Cấu trúc đề ({sections.length} phần)
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
                          {sec.title || sec.name || `Phần ${i + 1}`}
                        </span>
                        <span className={`shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
                          {Array.isArray(sec.questions) ? sec.questions.length : (sec.questionCount || 0)} câu
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {template.description && (
                <p className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {template.description}
                </p>
              )}

              {/* Apply error */}
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

      {/* Footer */}
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
          Huỷ
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
                Đang tạo…
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Tạo template với AI
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
                Đang tạo Draft…
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Áp dụng &amp; Tạo Draft
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
