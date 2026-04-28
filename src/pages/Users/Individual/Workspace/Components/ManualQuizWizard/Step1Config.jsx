import React from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_QUESTIONS = 100;

const INPUT_CLS = (isDark, hasError, surface = "quiz") =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : isDark
        ? `border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 ${surface === "challenge" ? "focus:border-orange-500" : "focus:border-blue-500"}`
        : `border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 ${surface === "challenge" ? "focus:border-orange-400" : "focus:border-blue-400"}`
  }`;

const LABEL_CLS = (isDark) =>
  `block text-sm font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-gray-700"}`;

function Step1Config({ config, onConfigChange, onNext, isDarkMode = false, surface = "quiz" }) {
  const { t } = useTranslation();
  const [errors, setErrors] = React.useState({});
  const isChallengeSurface = surface === "challenge";

  const set = (field, value) => {
    onConfigChange({ ...config, [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!String(config.title || "").trim()) {
      errs.title = isChallengeSurface
        ? t("challengeManualMatchEditor.wizard.step1.errors.titleRequired", "Tên đề challenge không được để trống.")
        : t("workspace.quiz.manualWizard.step1.errors.titleRequired", "Tên quiz không được để trống.");
    }
    if (!config.questionCount || config.questionCount < 1) {
      errs.questionCount = t("workspace.quiz.manualWizard.step1.errors.questionCountRequired", "Số câu hỏi phải ≥ 1.");
    }
    if (config.questionCount > MAX_QUESTIONS) {
      errs.questionCount = t("workspace.quiz.manualWizard.step1.errors.questionCountMax", {
        max: MAX_QUESTIONS,
        defaultValue: `Tối đa ${MAX_QUESTIONS} câu.`,
      });
    }
    if (!config.duration || config.duration < 1) {
      errs.duration = t("workspace.quiz.manualWizard.step1.errors.durationRequired", "Tổng thời gian phải ≥ 1 phút.");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext?.();
  };

  const errorCls = "text-xs text-red-500 mt-1";

  return (
    <div className="space-y-4 py-5">
      <div>
        <h2 className={cn("text-base font-semibold mb-0.5", isDarkMode ? "text-slate-100" : "text-gray-900")}>
          {isChallengeSurface
            ? t("challengeManualMatchEditor.wizard.step1.title", "Cấu hình đề challenge")
            : t("workspace.quiz.manualWizard.step1.title", "Cấu hình quiz thủ công")}
        </h2>
        <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-gray-500")}>
          {isChallengeSurface
            ? t("challengeManualMatchEditor.wizard.step1.description", "Thiết lập tên, số câu và thời gian cho đề challenge.")
            : t("workspace.quiz.manualWizard.step1.description", "Điền thông tin chung rồi soạn câu hỏi ở bước tiếp theo.")}
        </p>
      </div>

      <div>
        <label className={LABEL_CLS(isDarkMode)}>
          {isChallengeSurface
            ? t("challengeManualMatchEditor.wizard.step1.fields.titleLabel", "Tên đề")
            : t("workspace.quiz.manualWizard.step1.fields.titleLabel", "Tên quiz")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          maxLength={100}
          placeholder={isChallengeSurface
            ? t("challengeManualMatchEditor.wizard.step1.fields.titlePlaceholder", "Nhập tên đề challenge...")
            : t("workspace.quiz.manualWizard.step1.fields.titlePlaceholder", "Nhập tên quiz...")}
          aria-label={isChallengeSurface
            ? t("challengeManualMatchEditor.wizard.step1.fields.titleLabel", "Tên đề")
            : t("workspace.quiz.manualWizard.step1.fields.titleLabel", "Tên quiz")}
          value={config.title || ""}
          onChange={(e) => set("title", e.target.value)}
          className={INPUT_CLS(isDarkMode, !!errors.title, surface)}
        />
        {errors.title && <p className={errorCls}>{errors.title}</p>}
      </div>

      <div>
        <label className={LABEL_CLS(isDarkMode)}>
          {isChallengeSurface
            ? t("challengeManualMatchEditor.wizard.step1.fields.descriptionLabel", "Ghi chú")
            : t("workspace.quiz.manualWizard.step1.fields.descriptionLabel", "Mô tả")}
        </label>
        <textarea
          rows={2}
          placeholder={isChallengeSurface
            ? t("challengeManualMatchEditor.wizard.step1.fields.descriptionPlaceholder", "Ghi chú ngắn cho người review...")
            : t("workspace.quiz.manualWizard.step1.fields.descriptionPlaceholder", "Mô tả ngắn về quiz...")}
          aria-label={isChallengeSurface
            ? t("challengeManualMatchEditor.wizard.step1.fields.descriptionLabel", "Ghi chú")
            : t("workspace.quiz.manualWizard.step1.fields.descriptionLabel", "Mô tả")}
          value={config.description || ""}
          onChange={(e) => set("description", e.target.value)}
          className={cn(INPUT_CLS(isDarkMode, false, surface), "resize-none")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS(isDarkMode)}>
            {t("workspace.quiz.manualWizard.step1.fields.questionCountLabel", "Số câu hỏi")} <span className="text-red-500">*</span>
            <span className={cn("ml-1 text-xs font-normal", isDarkMode ? "text-slate-500" : "text-gray-400")}>
              ({t("workspace.quiz.manualWizard.step1.fields.questionCountHint", { max: MAX_QUESTIONS, defaultValue: `tối đa ${MAX_QUESTIONS}` })})
            </span>
          </label>
          <input
            type="number"
            min={1}
            max={MAX_QUESTIONS}
            aria-label={t("workspace.quiz.manualWizard.step1.fields.questionCountLabel", "Số câu hỏi")}
            value={config.questionCount || ""}
            onChange={(e) => set("questionCount", Math.min(MAX_QUESTIONS, parseInt(e.target.value, 10) || 0))}
            className={INPUT_CLS(isDarkMode, !!errors.questionCount, surface)}
            placeholder={t("workspace.quiz.manualWizard.step1.fields.questionCountPlaceholder", "Ví dụ: 20")}
          />
          {errors.questionCount && <p className={errorCls}>{errors.questionCount}</p>}
        </div>

        <div>
          <label className={LABEL_CLS(isDarkMode)}>
            {t("workspace.quiz.manualWizard.step1.fields.durationLabel", "Tổng thời gian (phút)")} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            aria-label={t("workspace.quiz.manualWizard.step1.fields.durationLabel", "Tổng thời gian (phút)")}
            value={config.duration || ""}
            onChange={(e) => set("duration", parseInt(e.target.value, 10) || 0)}
            className={INPUT_CLS(isDarkMode, !!errors.duration, surface)}
            placeholder={t("workspace.quiz.manualWizard.step1.fields.durationPlaceholder", "Ví dụ: 30")}
          />
          {errors.duration && <p className={errorCls}>{errors.duration}</p>}
        </div>
      </div>

      <div>
        <label className={LABEL_CLS(isDarkMode)}>
          {t("workspace.quiz.manualWizard.step1.fields.timerModeLabel", "Chế độ tính giờ")}
        </label>
        <p className={cn("text-xs mb-2", isDarkMode ? "text-slate-500" : "text-gray-400")}>
          {config.timerMode
            ? isChallengeSurface
              ? t("challengeManualMatchEditor.wizard.step1.fields.timerModeHintTotal", "Đồng hồ đếm ngược chung cho lượt thi.")
              : t("workspace.quiz.manualWizard.step1.fields.timerModeHintTotal", "Đồng hồ đếm ngược chung cho toàn bài.")
            : t("workspace.quiz.manualWizard.step1.fields.timerModeHintPerQuestion", {
                duration: config.duration || 0,
                count: config.questionCount || 0,
                seconds: config.questionCount > 0 ? Math.floor((config.duration * 60) / config.questionCount) : 0,
                defaultValue: `Hệ thống tự chia đều ${config.duration || 0} phút cho ${config.questionCount || 0} câu (~${
                  config.questionCount > 0 ? Math.floor((config.duration * 60) / config.questionCount) : 0
                }s/câu). Bạn có thể chỉnh thủ công ở bước 2.`,
              })}
        </p>
        <div className="flex gap-3">
          {[
            { value: true, label: t("workspace.quiz.manualWizard.step1.fields.timerModeTotal", "Toàn bài") },
            { value: false, label: t("workspace.quiz.manualWizard.step1.fields.timerModePerQuestion", "Từng câu") },
          ].map(({ value, label }) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => set("timerMode", value)}
              aria-label={label}
              className={cn(
                "flex-1 rounded-xl border-2 py-2 text-sm font-medium transition-all",
                config.timerMode === value
                  ? isChallengeSurface
                    ? "border-orange-500 bg-orange-500/10 text-orange-600"
                    : "border-blue-500 bg-blue-500/10 text-blue-600"
                  : isDarkMode
                    ? `border-slate-600 text-slate-300 ${isChallengeSurface ? "hover:border-orange-400" : "hover:border-blue-400"}`
                    : `border-gray-200 text-gray-600 ${isChallengeSurface ? "hover:border-orange-400" : "hover:border-blue-400"}`,
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleNext}
        aria-label={isChallengeSurface
          ? t("challengeManualMatchEditor.wizard.step1.nextButton", "Soạn câu hỏi")
          : t("workspace.quiz.manualWizard.step1.nextButton", "Tạo bộ câu hỏi")}
        className={cn(
          "w-full rounded-xl text-white py-3 gap-2 text-sm font-semibold",
          isChallengeSurface ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700",
        )}
      >
        {isChallengeSurface
          ? t("challengeManualMatchEditor.wizard.step1.nextButton", "Soạn câu hỏi")
          : t("workspace.quiz.manualWizard.step1.nextButton", "Tạo bộ câu hỏi")}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default Step1Config;
