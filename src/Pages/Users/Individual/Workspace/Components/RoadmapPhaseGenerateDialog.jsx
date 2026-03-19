import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import {
  AlertTriangle,
  Ban,
  CheckSquare,
  FileText,
  Film,
  Image,
  Loader2,
  Plus,
  Square,
  UploadCloud,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

function getFileIcon(file) {
  if (file?.type?.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  if (file?.type?.includes("image")) return <Image className="w-4 h-4 text-green-500" />;
  if (file?.type?.includes("video")) return <Film className="w-4 h-4 text-purple-500" />;
  return <FileText className="w-4 h-4 text-blue-500" />;
}

function getMaterialIconByStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "ERROR") return <AlertTriangle className="w-4 h-4 text-red-500" />;
  if (normalized === "WARN" || normalized === "WARNED") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (normalized === "REJECT" || normalized === "REJECTED") return <Ban className="w-4 h-4 text-red-600" />;
  if (normalized === "PROCESSING" || normalized === "UPLOADING" || normalized === "PENDING" || normalized === "QUEUED") {
    return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
  }
  return <FileText className="w-4 h-4 text-blue-500" />;
}

function isMaterialSelectable(material) {
  return String(material?.status || "").toUpperCase() === "ACTIVE";
}

function normalizeMaterialIds(ids = []) {
  return Array.from(new Set((ids || [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)));
}

function RoadmapPhaseGenerateDialog({
  open,
  onOpenChange,
  isDarkMode = false,
  materials = [],
  defaultSelectedMaterialIds = [],
  onSubmit,
  submitting = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState(normalizeMaterialIds(defaultSelectedMaterialIds));

  const selectableMaterialIds = useMemo(
    () => materials.filter(isMaterialSelectable).map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0),
    [materials]
  );

  const allSelectableChecked = selectableMaterialIds.length > 0
    && selectableMaterialIds.every((id) => selectedMaterialIds.includes(id));

  const canSubmit = selectedFiles.length > 0 || selectedMaterialIds.length > 0;

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setSelectedFiles([]);
      setSelectedMaterialIds(normalizeMaterialIds(defaultSelectedMaterialIds));
    }
    onOpenChange?.(nextOpen);
  };

  const handleSelectFiles = (event) => {
    const files = Array.from(event?.target?.files || []);
    if (!files.length) return;
    setSelectedFiles((current) => [...current, ...files]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event?.dataTransfer?.files || []);
    if (!files.length) return;
    setSelectedFiles((current) => [...current, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const toggleMaterialSelection = (materialId) => {
    setSelectedMaterialIds((current) => {
      if (current.includes(materialId)) {
        return current.filter((item) => item !== materialId);
      }
      return [...current, materialId];
    });
  };

  const handleToggleSelectAll = () => {
    if (allSelectableChecked) {
      setSelectedMaterialIds((current) => current.filter((item) => !selectableMaterialIds.includes(item)));
      return;
    }
    setSelectedMaterialIds((current) => normalizeMaterialIds([...current, ...selectableMaterialIds]));
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    await onSubmit?.({
      files: selectedFiles,
      materialIds: normalizeMaterialIds(selectedMaterialIds),
    });
    setSelectedFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`sm:max-w-[620px] ${fontClass} ${
        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-gray-200 text-gray-900"
      }`}>
        <DialogHeader>
          <DialogTitle className={fontClass}>{t("workspace.roadmap.phaseDialog.title", "Tạo phase roadmap")}</DialogTitle>
          <DialogDescription className={isDarkMode ? "text-slate-400" : "text-gray-500"}>
            {t("workspace.roadmap.phaseDialog.description", "Tải thêm tài liệu hoặc chọn tài liệu đã có để AI tạo phase.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-blue-500 bg-blue-50/40"
                : isDarkMode
                  ? "border-slate-700 hover:border-slate-600"
                  : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <label className="cursor-pointer inline-flex flex-col items-center">
              <UploadCloud className={`w-8 h-8 mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                {t("workspace.upload.dragDrop")}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                {t("workspace.upload.orBrowse")}
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.png,.mp3,.mp4"
                className="hidden"
                onChange={handleSelectFiles}
              />
            </label>
          </div>

          {selectedFiles.length > 0 ? (
            <div className={`rounded-lg border max-h-36 overflow-y-auto ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className={`flex items-center justify-between px-3 py-2 text-sm ${isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(file)}
                    <span className={`truncate ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{file.name}</span>
                    <span className={`text-xs shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 rounded hover:bg-red-100"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className={`rounded-lg border ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
            <div className={`px-3 py-2 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
              <p className={`text-sm font-semibold ${fontClass}`}>
                {t("workspace.roadmap.phaseDialog.existingMaterials", "Tài liệu đã tải lên")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleToggleSelectAll}
                disabled={selectableMaterialIds.length === 0}
                className="h-7 px-2 text-xs"
              >
                {allSelectableChecked
                  ? t("workspace.sources.deselectAll", "Bỏ chọn tất cả")
                  : t("workspace.sources.selectAll", "Chọn tất cả")}
              </Button>
            </div>

            <div className="max-h-52 overflow-y-auto p-2 space-y-1">
              {materials.length === 0 ? (
                <div className={`px-3 py-2 text-xs rounded ${isDarkMode ? "text-slate-400 bg-slate-900" : "text-gray-500 bg-gray-50"}`}>
                  {t("workspace.roadmap.phaseDialog.noMaterialYet", "Chưa có tài liệu. Hãy tải tài liệu để tạo phase.")}
                </div>
              ) : (
                materials.map((material) => {
                  const id = Number(material?.id);
                  const selectable = Number.isInteger(id) && id > 0 && isMaterialSelectable(material);
                  const checked = selectedMaterialIds.includes(id);
                  return (
                    <button
                      key={material?.id || material?.name}
                      type="button"
                      onClick={() => selectable && toggleMaterialSelection(id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left border transition-colors ${
                        checked
                          ? isDarkMode
                            ? "border-blue-700 bg-blue-950/30"
                            : "border-blue-200 bg-blue-50"
                          : isDarkMode
                            ? "border-slate-800 hover:bg-slate-900"
                            : "border-gray-200 hover:bg-gray-50"
                      } ${!selectable ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      {checked ? <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
                      {getMaterialIconByStatus(material?.status)}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{material?.name || material?.title}</p>
                        <p className={`text-[11px] uppercase ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>{material?.status || "UNKNOWN"}</p>
                      </div>
                      {!selectable ? (
                        <span className={`text-[10px] ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
                          {t("workspace.roadmap.phaseDialog.onlyActive", "Chỉ chọn ACTIVE")}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            {t("workspace.roadmap.phaseDialog.selectionCount", "Đã chọn {{count}} tài liệu", { count: selectedMaterialIds.length })}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t("workspace.upload.cancel", "Hủy")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="bg-[#2563EB] hover:bg-blue-700 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {submitting
                ? t("workspace.roadmap.phaseDialog.creating", "Đang tạo phase...")
                : t("workspace.roadmap.phaseDialog.createButton", "Tạo phase")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoadmapPhaseGenerateDialog;
