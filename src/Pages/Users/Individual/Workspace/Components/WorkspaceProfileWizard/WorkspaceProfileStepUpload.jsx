import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { evaluateMaterialFit } from './mockProfileWizardData';

function translateOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function createCopy(t, language) {
  const isEnglish = language === 'en';

  return {
    title: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.title',
      isEnglish ? 'Upload materials and review their fit' : 'Tải tài liệu và kiểm tra độ phù hợp'
    ),
    description: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.description',
      isEnglish
        ? 'Upload the materials you want to study. The UI will review how closely each document matches your knowledge, domain, level, goals, strengths, weaknesses, and exam setup.'
        : 'Tải những tài liệu bạn sẽ dùng trong workspace. Giao diện sẽ đối chiếu từng tài liệu với knowledge, lĩnh vực, trình độ, mục tiêu, điểm mạnh, điểm yếu và kỳ thi bạn đã chọn.'
    ),
    contextTitle: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.contextTitle',
      isEnglish ? 'Current profile context' : 'Ngữ cảnh hồ sơ cá nhân'
    ),
    contextDescription: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.contextDescription',
      isEnglish ? 'These are the signals used to review whether a material belongs in this workspace.' : 'Đây là các tín hiệu được dùng để kiểm tra tài liệu có thực sự khớp với workspace này hay không.'
    ),
    dropTitle: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.dropTitle',
      isEnglish ? 'Drop files here or browse from your device' : 'Kéo thả tài liệu vào đây hoặc chọn từ thiết bị'
    ),
    dropDescription: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.dropDescription',
      isEnglish ? 'You can upload PDF, DOCX, PPTX, XLSX, TXT, image, audio, or video files.' : 'Bạn có thể tải lên PDF, DOCX, PPTX, XLSX, TXT, ảnh, âm thanh hoặc video.'
    ),
    browse: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.browse',
      isEnglish ? 'Choose materials' : 'Chọn tài liệu'
    ),
    queueTitle: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.queueTitle',
      isEnglish ? 'Ready to upload' : 'Tệp sẵn sàng tải lên'
    ),
    queueEmpty: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.queueEmpty',
      isEnglish ? 'No files selected yet.' : 'Bạn chưa chọn tệp nào.'
    ),
    reviewTitle: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.reviewTitle',
      isEnglish ? 'Material-fit review' : 'Đánh giá mức độ phù hợp của tài liệu'
    ),
    reviewDescription: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.reviewDescription',
      isEnglish ? 'Each row explains why a document matches or does not match the profile above.' : 'Mỗi dòng sẽ giải thích vì sao tài liệu khớp hoặc chưa khớp với hồ sơ ở trên.'
    ),
    statusTitle: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.statusTitle',
      isEnglish ? 'Validation and upload status' : 'Trạng thái kiểm tra và tải tài liệu'
    ),
    statusDescription: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.statusDescription',
      isEnglish ? 'Only materials that pass the profile check will be added to the workspace and unlock step 4.' : 'Chỉ các tài liệu vượt qua bước kiểm tra hồ sơ mới được thêm vào workspace và mở bước 4.'
    ),
    summaryValid: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.summaryValid',
      isEnglish ? 'Valid in workspace' : 'Đã hợp lệ trong workspace'
    ),
    summaryReady: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.summaryReady',
      isEnglish ? 'Ready to upload' : 'Đạt để tải lên'
    ),
    summaryReplace: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.summaryReplace',
      isEnglish ? 'Needs replacement' : 'Cần thay thế'
    ),
    emptyTitle: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.emptyTitle',
      isEnglish ? 'Upload at least one material to continue' : 'Tải lên ít nhất một tài liệu để tiếp tục'
    ),
    emptyDescription: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.emptyDescription',
      isEnglish ? 'The next step only makes sense when the workspace already has materials to study from.' : 'Bước tiếp theo chỉ có ý nghĩa khi workspace đã có tài liệu để hệ thống bám vào.'
    ),
    fileInputAria: translateOrFallback(
      t,
      'workspace.profileConfig.stepUpload.fileInputAria',
      isEnglish ? 'Choose materials to upload' : 'Chọn tài liệu để tải lên'
    ),
    pendingBadge: isEnglish ? 'Pending upload' : 'Chờ tải lên',
    uploadedBadge: isEnglish ? 'Uploaded' : 'Đã có trong workspace',
    tone: {
      strong: isEnglish ? 'Strong match' : 'Khớp tốt',
      partial: isEnglish ? 'Partial match' : 'Khớp một phần',
      weak: isEnglish ? 'Needs review' : 'Cần xem lại',
      processing: isEnglish ? 'Processing' : 'Đang xử lý',
      critical: isEnglish ? 'Flagged' : 'Có cảnh báo',
    },
    labels: {
      knowledge: translateOrFallback(t, 'workspace.profileConfig.fields.knowledgeInput', isEnglish ? 'Knowledge' : 'Kiến thức'),
      domain: translateOrFallback(t, 'workspace.profileConfig.fields.primaryDomain', isEnglish ? 'Domain' : 'Lĩnh vực'),
      level: translateOrFallback(t, 'workspace.profileConfig.fields.currentLevel', isEnglish ? 'Current level' : 'Trình độ hiện tại'),
      goal: translateOrFallback(t, 'workspace.profileConfig.fields.learningGoal', isEnglish ? 'Goal' : 'Mục tiêu'),
      weakAreas: translateOrFallback(t, 'workspace.profileConfig.fields.weakAreas', isEnglish ? 'Weakness' : 'Điểm yếu'),
      strongAreas: translateOrFallback(t, 'workspace.profileConfig.fields.strongAreas', isEnglish ? 'Strength' : 'Điểm mạnh'),
      exam: isEnglish ? 'Exam' : 'Kỳ thi',
    },
  };
}

function formatBytes(size = 0) {
  const numericSize = Number(size);
  if (!Number.isFinite(numericSize) || numericSize <= 0) return '';
  return `${(numericSize / 1024 / 1024).toFixed(1)} MB`;
}

function getFileTypeLabel(material) {
  const fileType = (material?.type || material?.materialType || '').toLowerCase();

  if (fileType.includes('pdf')) return 'PDF';
  if (fileType.includes('word') || fileType.includes('doc')) return 'DOCX';
  if (fileType.includes('presentation') || fileType.includes('ppt')) return 'PPTX';
  if (fileType.includes('sheet') || fileType.includes('xls')) return 'XLSX';
  if (fileType.includes('image')) return 'IMAGE';
  if (fileType.includes('video')) return 'VIDEO';
  if (fileType.includes('audio')) return 'AUDIO';
  if (material?.name?.includes('.')) return material.name.split('.').pop().toUpperCase();
  return 'FILE';
}

function truncateText(value, maxLength = 64) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function toneStyles(tone, isDarkMode) {
  const toneMap = {
    strong: isDarkMode
      ? 'border-emerald-400/30 bg-emerald-500/10'
      : 'border-emerald-200 bg-emerald-50',
    partial: isDarkMode
      ? 'border-sky-400/30 bg-sky-500/10'
      : 'border-sky-200 bg-sky-50',
    weak: isDarkMode
      ? 'border-amber-400/30 bg-amber-500/10'
      : 'border-amber-200 bg-amber-50',
    processing: isDarkMode
      ? 'border-violet-400/30 bg-violet-500/10'
      : 'border-violet-200 bg-violet-50',
    critical: isDarkMode
      ? 'border-rose-400/30 bg-rose-500/10'
      : 'border-rose-200 bg-rose-50',
  };

  return toneMap[tone] || toneMap.weak;
}

function buildMaterialSummary(report, copy, isEnglish) {
  const labels = report.matchedContexts.map((item) => copy.labels[item.key]).filter(Boolean);
  const backendReason = report.backendReason;

  if (report.isPendingUpload) {
    return isEnglish
      ? 'This file is still waiting to be checked and uploaded. It will only be added to the workspace if it matches the current learning profile.'
      : 'Tệp này vẫn đang chờ được kiểm tra và tải lên. Hệ thống chỉ thêm vào workspace nếu nó khớp với hồ sơ học tập hiện tại.';
  }

  if (report.tone === 'processing') {
    return isEnglish
      ? 'The material has been uploaded and is waiting for deeper processing. The fit preview below is based on the profile signals currently available.'
      : 'Tài liệu đã được tải lên và đang chờ xử lý sâu hơn. Phần đánh giá bên dưới đang bám theo các tín hiệu hồ sơ hiện có.';
  }

  if (report.tone === 'critical') {
    const baseText = isEnglish
      ? 'This material already has a warning from the system or does not yet show a clear connection to the workspace profile.'
      : 'Tài liệu này đang có cảnh báo từ hệ thống hoặc chưa cho thấy liên hệ rõ ràng với hồ sơ của workspace.';
    if (backendReason) {
      return `${baseText} ${isEnglish ? 'Reason:' : 'Lý do:'} ${backendReason}`;
    }
    return baseText;
  }

  if (labels.length === 0) {
    return isEnglish
      ? 'The file name does not yet show a clear connection to your knowledge, domain, level, or learning target.'
      : 'Tên tài liệu hiện chưa cho thấy liên hệ rõ với kiến thức, lĩnh vực, trình độ hoặc mục tiêu học tập của bạn.';
  }

  if (report.tone === 'strong') {
    return isEnglish
      ? `This material stays closely connected to ${labels.join(', ')}, so it fits the current workspace well.`
      : `Tài liệu này bám khá sát ${labels.join(', ')}, nên phù hợp để đưa vào workspace hiện tại.`;
  }

  return isEnglish
    ? `This material already connects to ${labels.join(', ')}, but you should still review the content quality after upload.${backendReason ? ` Reason: ${backendReason}` : ''}`
    : `Tài liệu này đã có liên hệ với ${labels.join(', ')}, nhưng bạn nên kiểm tra lại nội dung sau khi tải lên.${backendReason ? ` Lý do: ${backendReason}` : ''}`;
}

function WorkspaceProfileStepUpload({
  t,
  language = 'vi',
  isDarkMode,
  values,
  errors,
  selectedExam,
  uploadedMaterials = [],
  pendingFiles = [],
  uploadCheckState = 'idle',
  uploadCheckProgress = 0,
  uploadCheckMessage = '',
  uploadablePendingCount = 0,
  blockedPendingCount = 0,
  validUploadedMaterialCount = 0,
  disabled = false,
  uploading = false,
  onAddFiles,
  onRemovePendingFile,
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const copy = createCopy(t, language);
  const isEnglish = language === 'en';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const surfaceClass = isDarkMode
    ? 'border-white/10 bg-white/[0.04] text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const progressToneClass = uploadCheckState === 'success'
    ? isDarkMode
      ? 'border-emerald-400/20 bg-emerald-500/10'
      : 'border-emerald-200 bg-emerald-50'
    : uploadCheckState === 'checking' || uploadCheckState === 'uploading' || uploadCheckState === 'processing'
      ? isDarkMode
        ? 'border-cyan-400/20 bg-cyan-500/10'
        : 'border-cyan-200 bg-cyan-50'
      : uploadCheckState === 'blocked' || uploadCheckState === 'error'
        ? isDarkMode
          ? 'border-amber-400/20 bg-amber-500/10'
          : 'border-amber-200 bg-amber-50'
        : isDarkMode
          ? 'border-white/10 bg-white/[0.04]'
          : 'border-slate-200 bg-slate-50';

  const profileSignals = [
    values.knowledgeInput ? { label: copy.labels.knowledge, value: values.knowledgeInput } : null,
    values.inferredDomain ? { label: copy.labels.domain, value: values.inferredDomain } : null,
    values.currentLevel ? { label: copy.labels.level, value: values.currentLevel } : null,
    values.learningGoal ? { label: copy.labels.goal, value: values.learningGoal } : null,
    values.strongAreas ? { label: copy.labels.strongAreas, value: values.strongAreas } : null,
    values.weakAreas ? { label: copy.labels.weakAreas, value: values.weakAreas } : null,
    selectedExam?.name || values.mockExamName ? { label: copy.labels.exam, value: selectedExam?.name || values.mockExamName } : null,
  ].filter(Boolean);

  const reviewItems = useMemo(() => {
    const pending = pendingFiles.map((file, index) => ({
      id: `pending-${file.name}-${file.size}-${file.lastModified}-${index}`,
      name: file.name,
      type: file.type,
      size: file.size,
      isPendingUpload: true,
      status: 'PENDING_UPLOAD',
    }));

    return [...pending, ...uploadedMaterials];
  }, [pendingFiles, uploadedMaterials]);

  const reviewedMaterials = useMemo(
    () => reviewItems.map((item) => {
      const report = evaluateMaterialFit(item, values, selectedExam);
      return {
        item,
        report: {
          ...report,
          backendReason: item.moderationSummary || null,
        },
      };
    }),
    [reviewItems, values, selectedExam]
  );

  function handleFileSelection(event) {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length > 0) {
      onAddFiles(nextFiles);
    }
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const nextFiles = Array.from(event.dataTransfer.files || []);
    if (nextFiles.length > 0) {
      onAddFiles(nextFiles);
    }
  }

  return (
    <div className="space-y-6">
      <section className={cn('rounded-[28px] border p-5 sm:p-6', surfaceClass)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              isDarkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'
            )}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{copy.contextTitle}</h3>
            <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{copy.contextDescription}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {profileSignals.map((signal) => (
            <span
              key={`${signal.label}-${signal.value}`}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold',
                isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-700'
              )}
            >
              {signal.label}: {truncateText(signal.value)}
            </span>
          ))}
        </div>
      </section>

      <section className={cn('rounded-[28px] border p-5 sm:p-6', surfaceClass)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-600'
            )}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{copy.statusTitle}</h3>
            <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{copy.statusDescription}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50')}>
            <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', mutedClass)}>{copy.summaryValid}</p>
            <p className="mt-2 text-2xl font-bold">{validUploadedMaterialCount}</p>
          </div>
          <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50')}>
            <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', mutedClass)}>{copy.summaryReady}</p>
            <p className="mt-2 text-2xl font-bold">{uploadablePendingCount}</p>
          </div>
          <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-amber-400/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50')}>
            <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', mutedClass)}>{copy.summaryReplace}</p>
            <p className="mt-2 text-2xl font-bold">{blockedPendingCount}</p>
          </div>
        </div>

        {uploadCheckState !== 'idle' || pendingFiles.length > 0 || validUploadedMaterialCount > 0 ? (
          <div className={cn('mt-5 rounded-[24px] border px-4 py-4', progressToneClass)}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                {uploadCheckMessage
                  || (pendingFiles.length > 0
                    ? (uploadablePendingCount > 0
                      ? (isEnglish
                        ? `${uploadablePendingCount} selected file(s) passed the first check and can be uploaded.`
                        : `Có ${uploadablePendingCount} tệp đang chọn đã vượt qua kiểm tra sơ bộ và có thể tải lên.`)
                      : (isEnglish
                        ? 'The selected files have not passed the first check yet.'
                        : 'Các tệp đang chọn chưa vượt qua kiểm tra sơ bộ.'))
                    : validUploadedMaterialCount > 0
                      ? (isEnglish
                        ? 'The workspace already has valid study materials for the roadmap.'
                        : 'Workspace hiện đã có tài liệu hợp lệ để đi tiếp với lộ trình.')
                      : '')}
              </p>
              {uploadCheckState === 'checking' || uploadCheckState === 'uploading' || uploadCheckState === 'processing' ? (
                <span className="shrink-0 text-xs font-semibold">{Math.max(0, Math.min(100, Number(uploadCheckProgress) || 0))}%</span>
              ) : null}
            </div>
            {uploadCheckState === 'checking' || uploadCheckState === 'uploading' || uploadCheckState === 'processing' ? (
              <div className={cn('mt-3 h-2 overflow-hidden rounded-full', isDarkMode ? 'bg-slate-950/70' : 'bg-white/80')}>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    uploadCheckState === 'processing'
                      ? 'bg-[linear-gradient(90deg,#22d3ee,#38bdf8,#22d3ee)] bg-[length:200%_100%] animate-pulse'
                      : 'bg-cyan-500'
                  )}
                  style={{ width: `${Math.max(8, Math.min(100, Number(uploadCheckProgress) || 0))}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={cn('rounded-[28px] border p-5 sm:p-6', surfaceClass)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{copy.dropTitle}</h3>
            <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{copy.dropDescription}</p>
          </div>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-all',
              isDarkMode ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-900 text-white hover:bg-slate-800'
            )}
          >
            {copy.browse}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          aria-label={copy.fileInputAria}
          className="sr-only"
          accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.png,.jpg,.jpeg,.mp3,.mp4"
          onChange={handleFileSelection}
        />

        <div
          role="presentation"
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'mt-5 rounded-[24px] border-2 border-dashed px-6 py-10 text-center transition-all',
            dragOver
              ? isDarkMode
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-cyan-400 bg-cyan-50'
              : isDarkMode
                ? 'border-slate-700 bg-slate-950/60'
                : 'border-slate-200 bg-slate-50'
          )}
        >
          {uploading ? <Loader2 className="mx-auto h-9 w-9 animate-spin text-cyan-500" /> : <UploadCloud className="mx-auto h-9 w-9 text-cyan-500" />}
          <p className="mt-4 text-sm font-semibold">{copy.dropTitle}</p>
          <p className={cn('mt-2 text-xs leading-5', mutedClass)}>{copy.dropDescription}</p>
        </div>

        {errors.materials ? <p className="mt-3 text-sm font-medium text-red-400">{errors.materials}</p> : null}

        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold">{copy.queueTitle}</p>
          {pendingFiles.length === 0 ? (
            <div
              className={cn(
                'rounded-[20px] border border-dashed px-4 py-4 text-sm',
                isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
              )}
            >
              {copy.queueEmpty}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3',
                    isDarkMode ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                        isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-600'
                      )}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{file.name}</p>
                      <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                        {getFileTypeLabel(file)} {formatBytes(file.size) ? `• ${formatBytes(file.size)}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={disabled || uploading}
                    onClick={() => onRemovePendingFile(index)}
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-xl',
                      isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-white'
                    )}
                  >
                    <X className="h-4 w-4 text-rose-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={cn('rounded-[28px] border p-5 sm:p-6', surfaceClass)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600'
            )}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{copy.reviewTitle}</h3>
            <p className={cn('mt-1 text-sm leading-6', mutedClass)}>{copy.reviewDescription}</p>
          </div>
        </div>

        {reviewedMaterials.length === 0 ? (
          <div
            className={cn(
              'mt-5 rounded-[24px] border border-dashed p-6 text-center',
              isDarkMode ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
            )}
          >
            <AlertTriangle className={cn('mx-auto h-8 w-8', isDarkMode ? 'text-slate-500' : 'text-slate-400')} />
            <p className="mt-4 text-sm font-semibold">{copy.emptyTitle}</p>
            <p className={cn('mt-2 text-sm leading-6', mutedClass)}>{copy.emptyDescription}</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {reviewedMaterials.map(({ item, report }) => (
              <div
                key={report.id}
                className={cn('rounded-[24px] border p-4', toneStyles(report.tone, isDarkMode))}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{report.name}</p>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          isDarkMode ? 'bg-slate-950/70 text-slate-200' : 'bg-white text-slate-700'
                        )}
                      >
                        {getFileTypeLabel(item)}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          report.tone === 'strong'
                            ? isDarkMode ? 'bg-emerald-950/70 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                            : report.tone === 'partial'
                              ? isDarkMode ? 'bg-sky-950/70 text-sky-200' : 'bg-sky-100 text-sky-700'
                              : report.tone === 'processing'
                                ? isDarkMode ? 'bg-violet-950/70 text-violet-200' : 'bg-violet-100 text-violet-700'
                                : report.tone === 'critical'
                                  ? isDarkMode ? 'bg-rose-950/70 text-rose-200' : 'bg-rose-100 text-rose-700'
                                  : isDarkMode ? 'bg-amber-950/70 text-amber-200' : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {report.isPendingUpload ? (isEnglish ? 'Awaiting validation' : 'Chờ kiểm tra') : copy.tone[report.tone]}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-slate-700'
                        )}
                      >
                        {item.isPendingUpload ? copy.pendingBadge : copy.uploadedBadge}
                      </span>
                    </div>
                    <p className={cn('mt-2 text-sm leading-6', mutedClass)}>{buildMaterialSummary(report, copy, isEnglish)}</p>
                  </div>
                  {report.tone === 'strong' ? (
                    <CheckCircle2 className={cn('mt-0.5 h-5 w-5 shrink-0', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')} />
                  ) : null}
                </div>

                {report.matchedContexts.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.matchedContexts.map((context) => (
                      <span
                        key={`${report.id}-${context.key}`}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          isDarkMode ? 'bg-slate-950/70 text-slate-200' : 'bg-white text-slate-700'
                        )}
                      >
                        {copy.labels[context.key]}: {truncateText(context.value, 36)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default WorkspaceProfileStepUpload;
