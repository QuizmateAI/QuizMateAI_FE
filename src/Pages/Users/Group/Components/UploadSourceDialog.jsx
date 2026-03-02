import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { UploadCloud, Link2, FileText, Image, Film, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

// Dialog tải tài liệu lên workspace — hiện khi mới vào workspace hoặc nhấn thêm nguồn
function UploadSourceDialog({ open, onOpenChange, isDarkMode, onUploadFiles, onAddUrl }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [activeTab, setActiveTab] = useState("file");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Xử lý chọn file từ input
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  // Xử lý kéo thả file
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  // Xóa file khỏi danh sách
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Lấy icon theo loại file
  const getFileIcon = (file) => {
    if (file.type?.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
    if (file.type?.includes("image")) return <Image className="w-4 h-4 text-green-500" />;
    if (file.type?.includes("video")) return <Film className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-blue-500" />;
  };

  // Xử lý upload
  const handleUpload = async () => {
    setUploading(true);
    try {
      if (activeTab === "file" && selectedFiles.length > 0) {
        await onUploadFiles?.(selectedFiles);
        setSelectedFiles([]);
      }
      if (activeTab === "url" && urlInput.trim()) {
        await onAddUrl?.(urlInput.trim());
        setUrlInput("");
      }
      onOpenChange(false);
    } catch {
      // Lỗi xử lý ở component cha
    } finally {
      setUploading(false);
    }
  };

  // Reset khi đóng
  const handleOpenChange = (val) => {
    if (!val) {
      setSelectedFiles([]);
      setUrlInput("");
      setActiveTab("file");
    }
    onOpenChange(val);
  };

  const tabClass = (tab) =>
    `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
      activeTab === tab
        ? isDarkMode ? "bg-slate-800 text-blue-300" : "bg-white text-blue-700 shadow-sm"
        : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
    }`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`sm:max-w-[520px] ${fontClass} ${
        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-gray-200 text-gray-900"
      }`}>
        <DialogHeader>
          <DialogTitle className={fontClass}>{t("workspace.upload.title")}</DialogTitle>
          <DialogDescription className={isDarkMode ? "text-slate-400" : "text-gray-500"}>
            {t("workspace.upload.desc")}
          </DialogDescription>
        </DialogHeader>

        {/* Tab chuyển đổi File / URL */}
        <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-900" : "bg-gray-100"}`}>
          <button type="button" onClick={() => setActiveTab("file")} className={tabClass("file")}>
            <UploadCloud className="w-4 h-4 inline mr-1.5" />
            {t("workspace.upload.tabFile")}
          </button>
          <button type="button" onClick={() => setActiveTab("url")} className={tabClass("url")}>
            <Link2 className="w-4 h-4 inline mr-1.5" />
            {t("workspace.upload.tabUrl")}
          </button>
        </div>

        {activeTab === "file" ? (
          <div className="space-y-3">
            {/* Vùng kéo thả */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : isDarkMode ? "border-slate-700 hover:border-slate-600" : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                {t("workspace.upload.dragDrop")}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                {t("workspace.upload.orBrowse")}
              </p>
              <p className={`text-xs mt-2 ${isDarkMode ? "text-slate-600" : "text-gray-400"}`}>
                {t("workspace.upload.supportedFormats")}
              </p>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.mp4,.webm" className="hidden" onChange={handleFileSelect} />
            </div>

            {/* Danh sách file đã chọn */}
            {selectedFiles.length > 0 && (
              <div className={`rounded-lg border max-h-40 overflow-y-auto ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
                {selectedFiles.map((file, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm ${
                    isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(file)}
                      <span className={`truncate ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{file.name}</span>
                      <span className={`text-xs shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded">
                      <X className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`flex gap-2 items-center border rounded-lg px-3 py-2 ${
              isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-gray-50"
            }`}>
              <Link2 className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
              <input
                className={`flex-1 bg-transparent outline-none text-sm ${isDarkMode ? "text-white placeholder:text-slate-500" : "text-gray-900 placeholder:text-gray-400"} ${fontClass}`}
                placeholder={t("workspace.upload.urlPlaceholder")}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
            {t("workspace.upload.cancel")}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || (activeTab === "file" ? selectedFiles.length === 0 : !urlInput.trim())}
            className="bg-[#2563EB] hover:bg-blue-700 text-white"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            {uploading ? t("workspace.upload.uploading") : activeTab === "file" ? t("workspace.upload.tabFile") : t("workspace.upload.addUrl")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UploadSourceDialog;