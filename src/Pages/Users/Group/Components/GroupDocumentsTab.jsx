import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  FileText,
  Film,
  FolderOpen,
  Image,
  Link2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';

import GroupPendingReviewPanel from '@/Pages/Users/Group/Group_leader/GroupPendingReviewPanel';
import SourceDetailView from './SourceDetailView';

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'WARNED') return 'WARN';
  if (normalized === 'REJECTED') return 'REJECT';
  return normalized;
}

function formatDateTime(value, lang = 'vi') {
  if (!value) return lang === 'en' ? 'No date' : 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === 'en' ? 'No date' : 'Chưa cập nhật';
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMaterialType(type, lang = 'vi') {
  const normalized = String(type || '').toLowerCase();
  if (!normalized) return lang === 'en' ? 'File' : 'Tệp';
  if (normalized.includes('pdf')) return 'PDF';
  if (normalized.includes('wordprocessingml') || normalized.includes('msword') || normalized.includes('doc')) return 'DOCX';
  if (normalized.includes('spreadsheetml') || normalized.includes('excel') || normalized.includes('xls')) return 'XLSX';
  if (normalized.includes('presentationml') || normalized.includes('powerpoint') || normalized.includes('ppt')) return 'PPTX';
  if (normalized.includes('image')) return lang === 'en' ? 'Image' : 'Hình ảnh';
  if (normalized.includes('video')) return lang === 'en' ? 'Video' : 'Video';
  if (normalized === 'url') return 'URL';
  if (normalized.includes('audio')) return lang === 'en' ? 'Audio' : 'Âm thanh';
  if (normalized.includes('text')) return 'TXT';
  return normalized.toUpperCase();
}

function getMaterialIcon(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('image')) return Image;
  if (normalized.includes('video')) return Film;
  if (normalized === 'url') return Link2;
  return FileText;
}

function getSharedMaterialRenderKey(material, index) {
  const materialId = Number(material?.id ?? material?.materialId ?? 0);
  if (Number.isInteger(materialId) && materialId > 0) {
    return `shared:material:${materialId}`;
  }

  const taskId = String(material?.taskId ?? material?.websocketTaskId ?? '').trim();
  if (taskId) {
    return `shared:task:${taskId}`;
  }

  const title = String(material?.title ?? material?.name ?? 'untitled').trim() || 'untitled';
  const uploadedAt = String(material?.uploadedAt ?? '').trim();
  return `shared:fallback:${title}:${uploadedAt}:${index}`;
}

function canOpenMaterialDetail(material) {
  const normalizedStatus = normalizeStatus(material?.status);
  const materialId = Number(material?.materialId ?? material?.id ?? 0);
  if (!Number.isInteger(materialId) || materialId <= 0) return false;
  return !['UPLOADING', 'PROCESSING', 'PENDING', 'QUEUED', 'ERROR', 'DELETED'].includes(normalizedStatus);
}

function toDetailSource(material) {
  if (!material) return null;
  const materialId = Number(material?.materialId ?? material?.id ?? 0);
  return {
    ...material,
    id: Number.isInteger(materialId) && materialId > 0 ? materialId : material?.id,
    materialId: Number.isInteger(materialId) && materialId > 0 ? materialId : material?.materialId,
    name: material?.title ?? material?.name ?? '',
    title: material?.title ?? material?.name ?? '',
    type: material?.type ?? material?.materialType ?? '',
    uploadedAt: material?.uploadedAt ?? null,
    needReview: material?.needReview ?? ['ACTIVE', 'WARN'].includes(normalizeStatus(material?.status)),
  };
}

function renderSpinnerSlot(isVisible, sizeClassName = 'h-4 w-4', borderClassName = 'border-2') {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 rounded-full border-current border-r-transparent transition-opacity ${borderClassName} ${sizeClassName} ${isVisible ? 'animate-spin opacity-100' : 'opacity-0'}`}
    />
  );
}

function renderStatusVisual(meta, StatusIcon) {
  const IconComponent = StatusIcon || Clock3;

  return (
    <span aria-hidden="true" className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      {renderSpinnerSlot(Boolean(meta?.isSpinner), 'h-3.5 w-3.5', 'border-[1.75px]')}
      <IconComponent className={`h-3.5 w-3.5 transition-opacity ${meta?.iconClassName || ''} ${meta?.isSpinner ? 'opacity-0' : 'opacity-100'}`} />
    </span>
  );
}

function renderActionVisual(isBusy, IconComponent, iconClassName = 'h-4 w-4') {
  return (
    <span aria-hidden="true" className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      {renderSpinnerSlot(Boolean(isBusy))}
      <IconComponent className={`${iconClassName} transition-opacity ${isBusy ? 'opacity-0' : 'opacity-100'}`} />
    </span>
  );
}

function renderBusySlot(isBusy) {
  return (
    <span aria-hidden="true" className="relative inline-flex h-4 w-4 items-center justify-center">
      {renderSpinnerSlot(Boolean(isBusy))}
    </span>
  );
}

function getStatusMeta(status, isDarkMode, currentLang) {
  const normalized = normalizeStatus(status);

  if (['UPLOADING', 'PROCESSING', 'PENDING', 'QUEUED'].includes(normalized)) {
    return {
      label: currentLang === 'en' ? 'AI checking' : 'AI đang kiểm tra',
      badgeClassName: isDarkMode
        ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
        : 'border-cyan-200 bg-cyan-50 text-cyan-700',
      icon: null,
      isSpinner: true,
    };
  }

  if (normalized === 'ACTIVE') {
    return {
      label: currentLang === 'en' ? 'Shared' : 'Đang dùng chung',
      badgeClassName: isDarkMode
        ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
      isSpinner: false,
    };
  }

  if (normalized === 'WARN') {
    return {
      label: currentLang === 'en' ? 'Warning' : 'Warning',
      badgeClassName: isDarkMode
        ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
        : 'border-amber-200 bg-amber-50 text-amber-700',
      icon: AlertTriangle,
      isSpinner: false,
    };
  }

  if (normalized === 'ERROR') {
    return {
      label: currentLang === 'en' ? 'Failed' : 'Thất bại',
      badgeClassName: isDarkMode
        ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
        : 'border-rose-200 bg-rose-50 text-rose-700',
      icon: XCircle,
      isSpinner: false,
    };
  }

  if (normalized === 'REJECT') {
    return {
      label: currentLang === 'en' ? 'Rejected' : 'Bị từ chối',
      badgeClassName: isDarkMode
        ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
        : 'border-rose-200 bg-rose-50 text-rose-700',
      icon: Ban,
      isSpinner: false,
    };
  }

  return {
    label: currentLang === 'en' ? 'Pending' : 'Đang chờ',
    badgeClassName: isDarkMode
      ? 'border-white/10 bg-white/[0.05] text-slate-200'
      : 'border-slate-200 bg-slate-50 text-slate-700',
    icon: Clock3,
    isSpinner: false,
  };
}

function matchesSharedFilter(status, filterKey) {
  const normalized = normalizeStatus(status);
  if (filterKey === 'shared') return normalized === 'ACTIVE';
  if (filterKey === 'warning') return normalized === 'WARN';
  if (filterKey === 'processing') return ['UPLOADING', 'PROCESSING', 'PENDING', 'QUEUED'].includes(normalized);
  if (filterKey === 'issues') return ['ERROR', 'REJECT'].includes(normalized);
  return true;
}

function isIssueStatus(status) {
  return ['ERROR', 'REJECT'].includes(normalizeStatus(status));
}

function isProcessingStatus(status) {
  return ['UPLOADING', 'PROCESSING', 'PENDING', 'QUEUED'].includes(normalizeStatus(status));
}

function isWarningStatus(status) {
  return normalizeStatus(status) === 'WARN';
}

export default function GroupDocumentsTab({
  isDarkMode = false,
  currentLang = 'vi',
  isLeader = false,
  canUploadSource = false,
  sources = [],
  pendingItems = [],
  pendingLoading = false,
  reviewingMaterialId = null,
  onOpenUpload,
  onRefresh,
  onApprove,
  onReject,
  onDeleteSource,
}) {
  const [searchValue, setSearchValue] = useState('');
  const [sharedFilter, setSharedFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('documents');
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState(null);

  const sharedMaterials = Array.isArray(sources) ? sources : [];
  const reviewQueueItems = Array.isArray(pendingItems) ? pendingItems : [];

  const warningItems = useMemo(
    () => reviewQueueItems.filter((item) => isWarningStatus(item?.status)),
    [reviewQueueItems],
  );
  const activeRequestItems = useMemo(
    () => reviewQueueItems.filter((item) => {
      const normalized = normalizeStatus(item?.status);
      return !['WARN', 'ERROR', 'REJECT', 'DELETED'].includes(normalized);
    }),
    [reviewQueueItems],
  );
  const issueQueueItems = useMemo(
    () => reviewQueueItems.filter((item) => isIssueStatus(item?.status)),
    [reviewQueueItems],
  );
  const processingItems = useMemo(
    () => reviewQueueItems.filter((item) => isProcessingStatus(item?.status)),
    [reviewQueueItems],
  );

  const filteredSharedMaterials = useMemo(() => {
    const normalizedQuery = String(searchValue || '').trim().toLowerCase();
    return sharedMaterials.filter((item) => {
      if (!matchesSharedFilter(item?.status, sharedFilter)) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        item?.title,
        item?.name,
        item?.materialType,
        item?.status,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [searchValue, sharedFilter, sharedMaterials]);

  const filterOptions = [
    { key: 'all', label: currentLang === 'en' ? 'All' : 'Tất cả' },
    { key: 'shared', label: currentLang === 'en' ? 'Shared' : 'Đang dùng' },
    { key: 'warning', label: 'Warning' },
    { key: 'processing', label: currentLang === 'en' ? 'Processing' : 'Đang xử lý' },
    { key: 'issues', label: currentLang === 'en' ? 'Issues' : 'Lỗi / từ chối' },
  ];
  const pendingTabCount = reviewQueueItems.length;

  const handleRefresh = async () => {
    if (typeof onRefresh !== 'function' || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteMaterial = async (material) => {
    const materialId = Number(material?.materialId ?? material?.id ?? 0);
    if (!Number.isInteger(materialId) || materialId <= 0 || typeof onDeleteSource !== 'function') return;

    const confirmed = globalThis.confirm?.(
      currentLang === 'en'
        ? `Delete "${material?.title || material?.name || 'this material'}" from the group workspace?`
        : `Xóa "${material?.title || material?.name || 'tài liệu này'}" khỏi group workspace?`,
    );

    if (!confirmed) return;

    setDeletingMaterialId(materialId);
    try {
      await onDeleteSource(materialId);
    } finally {
      setDeletingMaterialId(null);
    }
  };

  const handleOpenMaterialDetail = (material) => {
    if (!canOpenMaterialDetail(material)) return;
    setViewingMaterial(toDetailSource(material));
  };

  const handleDetailSourceUpdated = async (updatedSource) => {
    setViewingMaterial((current) => {
      if (!current) return current;
      const currentId = Number(current?.id ?? current?.materialId ?? 0);
      const nextId = Number(updatedSource?.id ?? updatedSource?.materialId ?? 0);
      if (!Number.isInteger(currentId) || currentId <= 0 || currentId !== nextId) {
        return current;
      }
      return toDetailSource({ ...current, ...updatedSource });
    });

    if (typeof onRefresh === 'function') {
      await onRefresh();
    }
  };

  return (
    <div className="space-y-5">
      <section className={`relative overflow-hidden rounded-[32px] border px-6 py-4 lg:px-7 lg:py-5 ${isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-white/80 bg-white/90'}`}>
        <div className={`pointer-events-none absolute inset-0 ${
          isDarkMode
            ? 'bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_24%),radial-gradient(circle_at_85%_10%,rgba(249,115,22,0.12),transparent_22%)]'
            : 'bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_24%),radial-gradient(circle_at_85%_10%,rgba(249,115,22,0.08),transparent_22%)]'
        }`} />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}`}>
                {currentLang === 'en' ? 'Documents hub' : 'Trung tâm tài liệu'}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                {isLeader
                  ? (currentLang === 'en' ? 'Leader control' : 'Leader quản lý')
                  : (currentLang === 'en' ? 'Member requests' : 'Member gửi yêu cầu')}
              </span>
            </div>
            <h2 className={`mt-3 text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {currentLang === 'en' ? 'Manage group learning materials in one place' : 'Quản lý tài liệu học tập của group trong một nơi'}
            </h2>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {currentLang === 'en'
                ? 'Upload shared documents, review member requests, and separate warning materials that still need a leader decision.'
                : 'Tải tài liệu dùng chung, theo dõi yêu cầu member gửi lên, và tách riêng các tài liệu warning vẫn đang chờ leader quyết định.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${refreshing ? 'cursor-not-allowed opacity-70' : ''} ${isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {renderActionVisual(refreshing, RefreshCw)}
              {currentLang === 'en' ? 'Refresh' : 'Làm mới'}
            </button>
            <button
              type="button"
              onClick={() => onOpenUpload?.()}
              disabled={!canUploadSource}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${!canUploadSource ? 'cursor-not-allowed opacity-60' : ''} ${isDarkMode ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
            >
              <UploadCloud className="h-4 w-4" />
              {currentLang === 'en' ? 'Upload materials' : 'Tải tài liệu'}
            </button>
          </div>
        </div>
      </section>

      <section className={`rounded-[28px] border p-2 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white/85'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('documents');
              setViewingMaterial(null);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'documents'
              ? (isDarkMode ? 'bg-cyan-500 text-slate-950' : 'bg-cyan-600 text-white')
              : (isDarkMode ? 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.10]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            <span>{currentLang === 'en' ? 'Documents' : 'Tài liệu'}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activeTab === 'documents'
              ? (isDarkMode ? 'bg-slate-950/15 text-inherit' : 'bg-white/20 text-white')
              : (isDarkMode ? 'bg-white/[0.08] text-slate-100' : 'bg-white text-slate-700')
            }`}
            >
              {sharedMaterials.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('pending');
              setViewingMaterial(null);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'pending'
              ? (isDarkMode ? 'bg-amber-400 text-slate-950' : 'bg-amber-500 text-slate-950')
              : (isDarkMode ? 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.10]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{currentLang === 'en' ? 'Pending review' : 'Chờ duyệt'}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activeTab === 'pending'
              ? 'bg-black/10 text-inherit'
              : (isDarkMode ? 'bg-white/[0.08] text-slate-100' : 'bg-white text-slate-700')
            }`}
            >
              {pendingTabCount}
            </span>
          </button>
        </div>
      </section>

      {viewingMaterial ? (
        <section className={`min-h-[680px] overflow-hidden rounded-[28px] border ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <SourceDetailView
            isDarkMode={isDarkMode}
            source={viewingMaterial}
            onBack={() => setViewingMaterial(null)}
            onSourceUpdated={handleDetailSourceUpdated}
          />
        </section>
      ) : null}

      {!viewingMaterial && activeTab === 'pending' && warningItems.length > 0 ? (
        <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-amber-400/20 bg-amber-400/10' : 'border-amber-200 bg-amber-50/80'}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${isDarkMode ? 'text-amber-100' : 'text-amber-700'}`} />
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-amber-50' : 'text-amber-900'}`}>
                  {currentLang === 'en' ? 'Warning materials waiting for review' : 'Tài liệu warning đang chờ duyệt'}
                </h3>
              </div>
              <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-amber-100/85' : 'text-amber-800'}`}>
                {currentLang === 'en'
                  ? 'These materials were flagged by AI and should be reviewed first before they enter the shared library.'
                  : 'Đây là các tài liệu bị AI gắn cờ warning. Nên xử lý trước khi đưa vào thư viện tài liệu chung.'}
              </p>
            </div>
            <span className={`inline-flex h-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-black/20 text-amber-100' : 'bg-white text-amber-700'}`}>
              {warningItems.length} {currentLang === 'en' ? 'warning item(s)' : 'mục warning'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {warningItems.map((item) => {
              const isReviewing = Number(reviewingMaterialId) > 0 && Number(reviewingMaterialId) === Number(item?.materialId);
              const progress = Math.max(0, Math.min(100, Math.round(Number(item?.progress) || 0)));
              const canOpenDetail = canOpenMaterialDetail(item);
              return (
                <article
                  key={`warning:${item.renderKey || item.key || item.materialId || item.id}`}
                  onClick={canOpenDetail ? () => handleOpenMaterialDetail(item) : undefined}
                  className={`rounded-[22px] border p-4 ${canOpenDetail ? 'cursor-pointer transition hover:-translate-y-0.5' : ''} ${isDarkMode ? 'border-amber-300/15 bg-black/15' : 'border-amber-200 bg-white/80'} ${canOpenDetail ? (isDarkMode ? 'hover:border-amber-400/40 hover:bg-black/25' : 'hover:border-amber-300 hover:bg-white') : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold break-all ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {item.title || item.name || (currentLang === 'en' ? 'Untitled material' : 'Tài liệu chưa có tên')}
                      </p>
                      <p className={`mt-2 text-xs ${isDarkMode ? 'text-amber-100/80' : 'text-amber-800'}`}>
                        {item.ownerLabel || (currentLang === 'en' ? 'Submitted to the group review queue' : 'Được gửi vào hàng chờ duyệt của group')}
                      </p>
                      {item.uploadedAt ? (
                        <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDateTime(item.uploadedAt, currentLang)}
                        </p>
                      ) : null}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-amber-500/15 text-amber-100' : 'bg-amber-100 text-amber-700'}`}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Warning
                    </span>
                  </div>

                  {item.message ? (
                    <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.message}
                    </p>
                  ) : null}

                  {canOpenDetail ? (
                    <p className={`mt-3 text-xs font-medium ${isDarkMode ? 'text-amber-100' : 'text-amber-700'}`}>
                      {currentLang === 'en' ? 'Open to inspect the AI moderation details before deciding.' : 'Mở tài liệu để xem chi tiết AI kiểm duyệt trước khi quyết định.'}
                    </p>
                  ) : null}

                  {progress > 0 && progress < 100 ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                          {currentLang === 'en' ? 'Processing progress' : 'Tiến độ xử lý'}
                        </span>
                        <span className={`font-semibold ${isDarkMode ? 'text-amber-100' : 'text-amber-700'}`}>{progress}%</span>
                      </div>
                      <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-amber-100'}`}>
                        <div
                          className={`h-full rounded-full ${isDarkMode ? 'bg-amber-300' : 'bg-amber-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {isLeader && typeof onApprove === 'function' && typeof onReject === 'function' ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onApprove(item);
                        }}
                        disabled={isReviewing}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isReviewing ? 'cursor-not-allowed opacity-60' : ''} ${isDarkMode ? 'bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                      >
                        {renderBusySlot(isReviewing)}
                        {currentLang === 'en' ? 'Approve warning' : 'Duyệt warning'}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onReject(item);
                        }}
                        disabled={isReviewing}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isReviewing ? 'cursor-not-allowed opacity-60' : ''} ${isDarkMode ? 'bg-rose-500/15 text-rose-100 hover:bg-rose-500/25' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                      >
                        {currentLang === 'en' ? 'Reject' : 'Từ chối'}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!viewingMaterial ? (
        <div className="grid gap-5">
        {activeTab === 'documents' ? (
        <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FolderOpen className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentLang === 'en' ? 'Shared material library' : 'Thư viện tài liệu chung'}
                </h3>
              </div>
              <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {currentLang === 'en'
                  ? 'Track every file already attached to the group workspace and quickly filter by current status.'
                  : 'Theo dõi toàn bộ tài liệu đã gắn vào group workspace và lọc nhanh theo trạng thái hiện tại.'}
              </p>
            </div>
            <span className={`inline-flex h-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
              {filteredSharedMaterials.length}/{sharedMaterials.length}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'}`}>
              <Search className={`h-4 w-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={currentLang === 'en' ? 'Search documents...' : 'Tìm tài liệu...'}
                className={`w-full min-w-[220px] bg-transparent text-sm outline-none ${isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const active = sharedFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSharedFilter(option.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active
                      ? (isDarkMode ? 'bg-cyan-400/15 text-cyan-100' : 'bg-cyan-50 text-cyan-700')
                      : (isDarkMode ? 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredSharedMaterials.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-8 text-sm text-center ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
                {currentLang === 'en'
                  ? 'No shared document matches the current filter.'
                  : 'Chưa có tài liệu nào khớp với bộ lọc hiện tại.'}
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {filteredSharedMaterials.map((material, index) => {
                  const Icon = getMaterialIcon(material?.type || material?.materialType);
                  const meta = getStatusMeta(material?.status, isDarkMode, currentLang);
                  const StatusIcon = meta.icon;
                  const progress = Math.max(0, Math.min(100, Math.round(Number(material?.progress) || 0)));
                  const deleting = Number(deletingMaterialId) === Number(material?.id ?? material?.materialId);
                  const canOpenDetail = canOpenMaterialDetail(material);
                  const renderKey = getSharedMaterialRenderKey(material, index);

                  return (
                    <article
                      key={renderKey}
                      onClick={canOpenDetail ? () => handleOpenMaterialDetail(material) : undefined}
                      className={`rounded-[22px] border p-4 ${canOpenDetail ? 'cursor-pointer transition hover:-translate-y-0.5' : ''} ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/60'} ${canOpenDetail ? (isDarkMode ? 'hover:border-cyan-500/40 hover:bg-white/[0.05]' : 'hover:border-cyan-200 hover:bg-white') : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-white/[0.07] text-cyan-100' : 'bg-white text-cyan-700'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.badgeClassName}`}>
                              {renderStatusVisual(meta, StatusIcon)}
                              {meta.label}
                            </span>
                            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'bg-white/[0.05] text-slate-300' : 'bg-white text-slate-600'}`}>
                              {formatMaterialType(material?.type || material?.materialType, currentLang)}
                            </span>
                          </div>
                          <p className={`mt-3 break-all text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {material?.title || material?.name || (currentLang === 'en' ? 'Untitled material' : 'Tài liệu chưa có tên')}
                          </p>
                          <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {material?.uploadedAt ? <span>{formatDateTime(material.uploadedAt, currentLang)}</span> : null}
                            {material?.size ? <span>{material.size}</span> : null}
                          </div>
                          {canOpenDetail ? (
                            <p className={`mt-3 text-xs font-medium ${isDarkMode ? 'text-cyan-200' : 'text-cyan-700'}`}>
                              {currentLang === 'en' ? 'Click to open AI review and extracted content.' : 'Bấm để mở đánh giá AI và nội dung trích xuất.'}
                            </p>
                          ) : null}
                          {isProcessingStatus(material?.status) && progress > 0 ? (
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                                  {currentLang === 'en' ? 'Processing progress' : 'Tiến độ xử lý'}
                                </span>
                                <span className={`font-semibold ${isDarkMode ? 'text-cyan-200' : 'text-cyan-700'}`}>{progress}%</span>
                              </div>
                              <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                <div
                                  className={`h-full rounded-full ${isDarkMode ? 'bg-cyan-400' : 'bg-cyan-500'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                        {typeof onDeleteSource === 'function' ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteMaterial(material);
                            }}
                            disabled={deleting}
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${deleting ? 'cursor-not-allowed opacity-60' : ''} ${isDarkMode ? 'bg-rose-500/10 text-rose-200 hover:bg-rose-500/15' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                            title={currentLang === 'en' ? 'Delete material' : 'Xóa tài liệu'}
                          >
                            {renderActionVisual(deleting, Trash2)}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        ) : null}

        {activeTab === 'pending' ? (
        <div className="space-y-5">
          <GroupPendingReviewPanel
            items={activeRequestItems}
            loading={pendingLoading}
            reviewingMaterialId={reviewingMaterialId}
            onApprove={onApprove}
            onReject={onReject}
            onOpenItem={handleOpenMaterialDetail}
            isDarkMode={isDarkMode}
            currentLang={currentLang}
            isLeader={isLeader}
          />

          {issueQueueItems.length > 0 ? (
            <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-rose-400/20 bg-rose-400/10' : 'border-rose-200 bg-rose-50/80'}`}>
              <div className="flex items-center gap-2">
                <XCircle className={`h-5 w-5 ${isDarkMode ? 'text-rose-100' : 'text-rose-700'}`} />
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-rose-50' : 'text-rose-900'}`}>
                  {currentLang === 'en' ? 'Materials that need attention' : 'Tài liệu cần xử lý lại'}
                </h3>
              </div>
              <div className="mt-4 space-y-3">
                {issueQueueItems.map((item) => {
                  const canOpenDetail = canOpenMaterialDetail(item);
                  return (
                  <article
                    key={`issue:${item.renderKey || item.key || item.materialId || item.id}`}
                    onClick={canOpenDetail ? () => handleOpenMaterialDetail(item) : undefined}
                    className={`rounded-[22px] border p-4 ${canOpenDetail ? 'cursor-pointer transition hover:-translate-y-0.5' : ''} ${isDarkMode ? 'border-rose-300/15 bg-black/15' : 'border-rose-200 bg-white/80'} ${canOpenDetail ? (isDarkMode ? 'hover:border-rose-400/40 hover:bg-black/25' : 'hover:border-rose-300 hover:bg-white') : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`break-all text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {item.title || item.name || (currentLang === 'en' ? 'Untitled material' : 'Tài liệu chưa có tên')}
                        </p>
                        <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {item.message || (currentLang === 'en' ? 'This material could not enter the group library.' : 'Tài liệu này chưa thể vào thư viện của group.')}
                        </p>
                        {canOpenDetail ? (
                          <p className={`mt-3 text-xs font-medium ${isDarkMode ? 'text-rose-100' : 'text-rose-700'}`}>
                            {currentLang === 'en' ? 'Open the material to inspect the moderation outcome.' : 'Mở tài liệu để xem rõ lý do kiểm duyệt và trạng thái AI.'}
                          </p>
                        ) : null}
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-rose-500/15 text-rose-100' : 'bg-rose-100 text-rose-700'}`}>
                        {normalizeStatus(item?.status) === 'REJECT'
                          ? (currentLang === 'en' ? 'Rejected' : 'Từ chối')
                          : (currentLang === 'en' ? 'Failed' : 'Thất bại')}
                      </span>
                    </div>
                  </article>
                );
                })}
              </div>
            </section>
          ) : null}
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
