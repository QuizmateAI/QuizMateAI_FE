// Màn hình loading đơn giản hiển thị trong lúc bootstrap group workspace
// (route /workspace/group/new sau khi BE đã tạo + đang chuẩn bị state).
// Tách khỏi GroupWorkspacePage để giảm size page và dễ tái sử dụng.

import { useTranslation } from 'react-i18next';

export default function GroupBootstrapLoading({ isDarkMode = false, pageShellClass = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`relative flex h-screen items-center justify-center overflow-hidden transition-colors duration-300 ${pageShellClass}`}>
      <div className={`pointer-events-none absolute inset-0 ${
        isDarkMode
          ? 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_26%),radial-gradient(circle_at_85%_10%,rgba(245,158,11,0.14),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.12),transparent_28%)]'
          : 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(249,115,22,0.12),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.10),transparent_30%)]'
      }`} />
      <div className={`relative flex min-w-[320px] flex-col items-center gap-4 rounded-[28px] border px-8 py-10 shadow-2xl ${
        isDarkMode ? 'border-white/10 bg-[#09131a]/92 text-white' : 'border-white/80 bg-white/92 text-slate-900'
      }`}>
        <span
          aria-hidden="true"
          className="inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent border-2 h-10 w-10 text-cyan-500"
        />
        <div className="text-center">
          <p className="text-lg font-semibold">{t('groupWorkspace.bootstrap.title')}</p>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('groupWorkspace.bootstrap.description')}
          </p>
        </div>
      </div>
    </div>
  );
}
