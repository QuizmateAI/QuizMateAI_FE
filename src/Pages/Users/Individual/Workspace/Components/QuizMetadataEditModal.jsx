import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog";
import { cn } from "@/lib/utils";
import { updateQuiz } from "@/api/QuizAPI";
import { unwrapApiData } from "@/Utils/apiResponse";

const INPUT_CLS = (isDark, hasError) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : isDark
        ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
        : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-blue-400"
  }`;

const LABEL_CLS = (isDark) =>
  `block text-sm font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-gray-700"}`;

/**
 * Modal chỉnh sửa metadata quiz: title, description, timerMode, duration.
 * Props:
 *  - open, onClose
 *  - quiz: quiz object hiện tại
 *  - onSaved(updatedFields): callback trả về các trường đã cập nhật
 *  - isDarkMode
 */
function QuizMetadataEditModal({ open, onClose, quiz, onSaved, isDarkMode = false }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timerMode, setTimerMode] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !quiz) return;
    setTitle(quiz.title || "");
    setDescription(quiz.description || "");
    setTimerMode(quiz.timerMode ?? true);
    const rawDuration = Number(quiz.duration) || 0;
    setDurationMinutes(Math.max(1, Math.round(rawDuration / 60)));
    setError("");
  }, [open, quiz]);

  const handleSave = async () => {
    if (!String(title).trim()) {
      setError(t("workspace.quiz.metadataEditModal.nameRequired"));
      return;
    }
    if (!durationMinutes || durationMinutes < 1) {
      setError(t("workspace.quiz.metadataEditModal.durationMin"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const quizId = quiz?.quizId;
      const payload = {
        title: title.trim(),
        description: description.trim(),
        timerMode,
        duration: durationMinutes * 60,
      };
      const res = await updateQuiz(quizId, payload);
      const updated = unwrapApiData(res);
      onSaved?.({ title: payload.title, description: payload.description, timerMode, duration: payload.duration, ...updated });
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("workspace.quiz.metadataEditModal.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && !v && onClose?.()}>
      <DialogContent
        className={cn(
          "max-w-md rounded-2xl",
          isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900",
        )}
      >
        <DialogHeader>
          <DialogTitle className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
            {t("workspace.quiz.edit.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className={LABEL_CLS(isDarkMode)}>
              {t("workspace.quiz.metadataEditModal.nameLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLS(isDarkMode, false)}
              placeholder={t("workspace.quiz.metadataEditModal.namePlaceholder")}
            />
          </div>

          <div>
            <label className={LABEL_CLS(isDarkMode)}>{t("workspace.quiz.metadataEditModal.descriptionLabel")}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(INPUT_CLS(isDarkMode, false), "resize-none")}
              placeholder={t("workspace.quiz.metadataEditModal.descriptionPlaceholder")}
            />
          </div>

          <div>
            <label className={LABEL_CLS(isDarkMode)}>{t("workspace.quiz.metadataEditModal.timerModeLabel")}</label>
            <div className="flex gap-2">
              {[
                { value: true, label: t("workspace.quiz.metadataEditModal.timerModeWholeQuiz") },
                { value: false, label: t("workspace.quiz.metadataEditModal.timerModePerQuestion") },
              ].map(({ value, label }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setTimerMode(value)}
                  className={cn(
                    "flex-1 rounded-xl border-2 py-2 text-sm font-medium transition-all",
                    timerMode === value
                      ? "border-blue-500 bg-blue-500/10 text-blue-600"
                      : isDarkMode
                        ? "border-slate-600 text-slate-300 hover:border-blue-400"
                        : "border-gray-200 text-gray-600 hover:border-blue-400",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL_CLS(isDarkMode)}>
              {t("workspace.quiz.metadataEditModal.durationLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              className={INPUT_CLS(isDarkMode, false)}
              placeholder={t("workspace.quiz.metadataEditModal.durationPlaceholder")}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => onClose?.()}
            className={cn("rounded-full", isDarkMode && "border-slate-600 text-slate-200 hover:bg-slate-800")}
          >
            {t("workspace.quiz.edit.cancel")}
          </Button>
          <Button
            disabled={saving}
            onClick={handleSave}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? t("workspace.quiz.edit.saving") : t("workspace.quiz.edit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuizMetadataEditModal;
