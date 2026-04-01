import React from 'react';
import { AlertTriangle, Clock3, Eye, ShieldCheck, XCircle } from 'lucide-react';

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

function getStatusMeta(status, needReview, isDarkMode, lang) {
  const normalizedStatus = String(status || '').toUpperCase();

  if (['UPLOADING', 'PROCESSING', 'PENDING', 'QUEUED'].includes(normalizedStatus)) {
    return {
      icon: null,
      iconClassName: '',
      isSpinner: true,
      badgeClassName: isDarkMode
        ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
        : 'border-cyan-200 bg-cyan-50 text-cyan-700',
      label: lang === 'en' ? 'AI is checking' : 'AI đang kiểm tra',
    };
  }

  if (['WARN', 'WARNED'].includes(normalizedStatus)) {
    return {
      icon: AlertTriangle,
      iconClassName: '',
      isSpinner: false,
      badgeClassName: isDarkMode
        ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
        : 'border-amber-200 bg-amber-50 text-amber-700',
      label: needReview
        ? (lang === 'en' ? 'Warning, needs review' : 'Warning, chờ duyệt')
        : (lang === 'en' ? 'Warning' : 'Warning'),
    };
  }

  if (normalizedStatus === 'ACTIVE' && needReview) {
    return {
      icon: ShieldCheck,
      iconClassName: '',
      isSpinner: false,
      badgeClassName: isDarkMode
        ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: lang === 'en' ? 'Ready for leader review' : 'Sẵn sàng leader duyệt',
    };
  }

  if (normalizedStatus === 'ERROR') {
    return {
      icon: XCircle,
      iconClassName: '',
      isSpinner: false,
      badgeClassName: isDarkMode
        ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
        : 'border-rose-200 bg-rose-50 text-rose-700',
      label: lang === 'en' ? 'Processing failed' : 'Xử lý thất bại',
    };
  }

  if (['REJECT', 'REJECTED'].includes(normalizedStatus)) {
    return {
      icon: XCircle,
      iconClassName: '',
      isSpinner: false,
      badgeClassName: isDarkMode
        ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
        : 'border-rose-200 bg-rose-50 text-rose-700',
      label: lang === 'en' ? 'Rejected' : 'Bị loại',
    };
  }

  return {
    icon: Clock3,
    iconClassName: '',
    isSpinner: false,
    badgeClassName: isDarkMode
      ? 'border-white/10 bg-white/[0.05] text-slate-200'
      : 'border-slate-200 bg-slate-50 text-slate-700',
    label: lang === 'en' ? 'Pending' : 'Đang chờ',
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

export default function GroupPendingReviewPanel({
  items = [],
  loading = false,
  reviewingMaterialId = null,
  onApprove,
  onReject,
  onOpenItem,
  isDarkMode = false,
  currentLang = 'vi',
  isLeader = false,
}) {
  if (!isLeader && items.length === 0 && !loading) {
    return null;
  }

  const title = isLeader
    ? (currentLang === 'en' ? 'Material review queue' : 'Hàng chờ duyệt tài liệu')
    : (currentLang === 'en' ? 'Your recent uploads' : 'Các tài liệu bạn vừa gửi');
  const description = isLeader
    ? (currentLang === 'en'
      ? 'AI-checked group materials land here before they become visible in the shared source list.'
      : 'Tài liệu group sau khi AI kiểm tra sẽ vào đây trước khi xuất hiện ở danh sách tài liệu chung.')
    : (currentLang === 'en'
      ? 'Track the files you just submitted while AI finishes checking them for the group.'
      : 'Theo dõi các tệp bạn vừa gửi trong lúc AI hoàn tất kiểm tra cho group.');

  return (
    <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
          </div>
          <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>
        </div>
        <span className={`inline-flex h-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
          {loading ? '...' : `${items.length} ${currentLang === 'en' ? 'item(s)' : 'mục'}`}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
            {currentLang === 'en' ? 'Loading material queue...' : 'Đang tải hàng chờ tài liệu...'}
          </div>
        ) : items.length === 0 ? (
          <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
            {isLeader
              ? (currentLang === 'en' ? 'No material is waiting for leader review.' : 'Hiện chưa có tài liệu nào chờ leader duyệt.')
              : (currentLang === 'en' ? 'No recent upload is being tracked in this session.' : 'Hiện chưa có upload nào đang được theo dõi trong phiên này.')}
          </div>
        ) : items.map((item) => {
          const meta = getStatusMeta(item.status, item.needReview, isDarkMode, currentLang);
          const StatusIcon = meta.icon;
          const progress = Math.max(0, Math.min(100, Math.round(Number(item.progress) || 0)));
          const canApprove = Boolean(isLeader && item.canApprove && typeof onApprove === 'function');
          const canReject = Boolean(isLeader && item.canReject && typeof onReject === 'function');
          const isReviewing = Number(reviewingMaterialId) > 0 && Number(reviewingMaterialId) === Number(item.materialId);
          const canOpenItem = Boolean(
            typeof onOpenItem === 'function'
            && (
              item?.canOpenDetail
              ?? (
                Number(item?.materialId ?? item?.id ?? 0) > 0
                && !['UPLOADING', 'PROCESSING', 'PENDING', 'QUEUED', 'ERROR', 'DELETED'].includes(String(item?.status || '').toUpperCase())
              )
            ),
          );

          return (
            <article
              key={item.renderKey || item.key || item.materialId || item.id}
              onClick={canOpenItem ? () => onOpenItem?.(item) : undefined}
              className={`rounded-[24px] border p-4 ${canOpenItem ? 'cursor-pointer transition hover:-translate-y-0.5' : ''} ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/60'} ${canOpenItem ? (isDarkMode ? 'hover:border-cyan-500/40 hover:bg-white/[0.05]' : 'hover:border-cyan-200 hover:bg-white') : ''}`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.badgeClassName}`}>
                      {renderStatusVisual(meta, StatusIcon)}
                      {meta.label}
                    </span>
                    {item.source === 'local' ? (
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}`}>
                        {currentLang === 'en' ? 'Current session' : 'Phiên hiện tại'}
                      </span>
                    ) : null}
                  </div>

                  <h4 className={`mt-3 break-all text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {item.title || item.name || (currentLang === 'en' ? 'Untitled material' : 'Tài liệu chưa có tên')}
                  </h4>

                  <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>{item.ownerLabel || (currentLang === 'en' ? 'Uploaded in group workspace' : 'Tải lên trong group workspace')}</span>
                    {item.uploadedAt ? <span>{formatDateTime(item.uploadedAt, currentLang)}</span> : null}
                  </div>

                  {item.message ? (
                    <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.message}</p>
                  ) : null}

                  {(progress > 0 && progress < 100) || item.status === 'PROCESSING' || item.status === 'UPLOADING' ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                          {currentLang === 'en' ? 'Upload progress' : 'Tiến độ xử lý'}
                        </span>
                        <span className={`font-semibold ${isDarkMode ? 'text-cyan-200' : 'text-cyan-700'}`}>{progress}%</span>
                      </div>
                      <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div
                          className={`h-full rounded-full transition-[width] duration-150 ${isDarkMode ? 'bg-cyan-400' : 'bg-cyan-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {(canOpenItem || canApprove || canReject) ? (
                  <div className="flex flex-wrap items-center gap-2 xl:w-[260px] xl:justify-end">
                    {canOpenItem ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenItem?.(item);
                        }}
                        className={`inline-flex min-w-[120px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isDarkMode ? 'bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}
                      >
                        <Eye className="h-4 w-4" />
                        <span>{currentLang === 'en' ? 'View details' : 'Xem chi tiết'}</span>
                      </button>
                    ) : null}
                    {canApprove ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onApprove?.(item);
                        }}
                        disabled={isReviewing}
                        className={`inline-flex min-w-[104px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isReviewing ? 'cursor-not-allowed opacity-60' : ''} ${isDarkMode ? 'bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                      >
                        <span
                          aria-hidden="true"
                          className="relative inline-flex h-4 w-4 items-center justify-center"
                        >
                          {renderSpinnerSlot(isReviewing)}
                        </span>
                        <span>{currentLang === 'en' ? 'Approve' : 'Duyệt'}</span>
                      </button>
                    ) : null}
                    {canReject ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onReject?.(item);
                        }}
                        disabled={isReviewing}
                        className={`inline-flex min-w-[104px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${isReviewing ? 'cursor-not-allowed opacity-60' : ''} ${isDarkMode ? 'bg-rose-500/15 text-rose-100 hover:bg-rose-500/25' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                      >
                        {currentLang === 'en' ? 'Reject' : 'Từ chối'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
