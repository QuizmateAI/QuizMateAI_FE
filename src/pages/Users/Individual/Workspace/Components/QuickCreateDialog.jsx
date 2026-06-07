import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Map, Layers, BookOpen, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import ToastError from "@/components/system/ToastError";

// Cấu hình icon và màu sắc cho từng loại
const TYPE_CONFIG = {
  roadmap: { icon: Map, color: "text-emerald-500" },
  phase: { icon: Layers, color: "text-amber-500" },
  knowledge: { icon: BookOpen, color: "text-violet-500" },
};

const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 2000;
const STUDY_DURATION_MIN_DAY = 1;

function QuickCreateDialog({ open, onOpenChange, type = "roadmap", isDarkMode = false, createFn, onCreated }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studyDurationInDay, setStudyDurationInDay] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.roadmap;
  const IconComponent = config.icon;

  // Reset form khi đóng dialog
  const handleOpenChange = (val) => {
    if (!val) {
      setTitle("");
      setDescription("");
      setStudyDurationInDay(7);
      setError("");
    }
    onOpenChange(val);
  };

  // Xử lý submit tạo mới
  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setError(t("workspace.quiz.quickCreate.titleRequired"));
      return;
    }
    if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      setError(t("workspace.quiz.quickCreate.titleTooLong", {
        max: TITLE_MAX_LENGTH,
        defaultValue: `Tiêu đề không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`,
      }));
      return;
    }
    if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      setError(t("workspace.quiz.quickCreate.descriptionTooLong", {
        max: DESCRIPTION_MAX_LENGTH,
        defaultValue: `Mô tả không được vượt quá ${DESCRIPTION_MAX_LENGTH} ký tự.`,
      }));
      return;
    }
    if (type === "phase") {
      const numericDuration = Number(studyDurationInDay);
      if (!Number.isInteger(numericDuration) || numericDuration < STUDY_DURATION_MIN_DAY) {
        setError(t("workspace.quiz.quickCreate.studyDurationInvalid", {
          min: STUDY_DURATION_MIN_DAY,
          defaultValue: `Số ngày học phải là số nguyên ≥ ${STUDY_DURATION_MIN_DAY}.`,
        }));
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const data = { title: trimmedTitle, description: trimmedDescription };
      if (type === "phase") data.studyDurationInDay = Number(studyDurationInDay);
      const res = await createFn(data);
      const newItem = res?.data || res;
      onCreated?.(newItem);
      handleOpenChange(false);
    } catch (err) {
      console.error("Lỗi tạo nhanh:", err);
      setError(err?.response?.data?.message || t("workspace.quiz.quickCreate.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;

  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`sm:max-w-md ${isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${fontClass}`}>
            <IconComponent className={`w-5 h-5 ${config.color}`} />
            {t(`workspace.quiz.quickCreate.${type}.title`)}
          </DialogTitle>
          <DialogDescription className={`${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t(`workspace.quiz.quickCreate.${type}.desc`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Tên */}
          <div>
            <label className={labelCls}>{t("workspace.quiz.quickCreate.name")}</label>
            <input
              className={inputCls}
              placeholder={t(`workspace.quiz.quickCreate.${type}.namePlaceholder`)}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX_LENGTH}
              autoFocus
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className={labelCls}>{t("workspace.quiz.quickCreate.description")}</label>
            <textarea
              className={`${inputCls} min-h-[60px] resize-none`}
              placeholder={t(`workspace.quiz.quickCreate.${type}.descPlaceholder`)}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
          </div>

          {/* Số ngày học — chỉ hiển thị cho Phase */}
          {type === "phase" && (
            <div>
              <label className={labelCls}>{t("workspace.quiz.quickCreate.phase.studyDuration")}</label>
              <input
                type="number"
                className={inputCls}
                value={studyDurationInDay}
                onChange={(e) => setStudyDurationInDay(Number(e.target.value))}
                min={STUDY_DURATION_MIN_DAY}
              />
            </div>
          )}

          {/* Lỗi */}
          <ToastError message={error} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}
            className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
            {t("workspace.quiz.quickCreate.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-[#2563EB] hover:bg-blue-700 text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {submitting ? t("workspace.quiz.quickCreate.creating") : t("workspace.quiz.quickCreate.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuickCreateDialog;
