import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Loader2, Map, Layers, BookOpen, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

// Cấu hình icon và màu sắc cho từng loại
const TYPE_CONFIG = {
  roadmap: { icon: Map, color: "text-emerald-500" },
  phase: { icon: Layers, color: "text-amber-500" },
  knowledge: { icon: BookOpen, color: "text-violet-500" },
};

/**
 * QuickCreateDialog — popup tạo nhanh Roadmap / Phase / Knowledge
 * @param {boolean} open - Trạng thái hiển thị dialog
 * @param {function} onOpenChange - Callback đóng/mở dialog
 * @param {"roadmap"|"phase"|"knowledge"} type - Loại đối tượng cần tạo
 * @param {boolean} isDarkMode - Chế độ tối
 * @param {function} createFn - Hàm API tạo đối tượng, nhận (data) và trả về response
 * @param {function} onCreated - Callback khi tạo thành công, nhận (newItem)
 */
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
    if (!title.trim()) {
      setError(t("workspace.quiz.quickCreate.titleRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const data = { title: title.trim(), description: description.trim() };
      if (type === "phase") data.studyDurationInDay = studyDurationInDay;
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
                min={1}
              />
            </div>
          )}

          {/* Lỗi */}
          {error && (
            <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
              {error}
            </div>
          )}
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
