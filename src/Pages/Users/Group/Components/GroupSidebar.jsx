import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BookOpen,
  PenLine,
  Map,
  ClipboardList,
  Swords,
  Settings,
} from 'lucide-react';
import LogoLight from '@/assets/LightMode_Logo.webp';
import LogoDark from '@/assets/DarkMode_Logo.webp';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, labelVi: 'Dashboard', labelEn: 'Dashboard', color: 'text-cyan-500', activeBg: 'bg-cyan-500/10' },
  { id: 'members', icon: Users, labelVi: 'Quản lý thành viên', labelEn: 'Members', color: 'text-violet-500', activeBg: 'bg-violet-500/10' },
  { id: 'documents', icon: FolderOpen, labelVi: 'Quản lý tài liệu', labelEn: 'Documents', color: 'text-amber-500', activeBg: 'bg-amber-500/10' },
  { id: 'flashcard', icon: BookOpen, labelVi: 'Flashcard', labelEn: 'Flashcard', color: 'text-emerald-500', activeBg: 'bg-emerald-500/10' },
  { id: 'quiz', icon: PenLine, labelVi: 'Quiz', labelEn: 'Quiz', color: 'text-sky-500', activeBg: 'bg-sky-500/10' },
  { id: 'roadmap', icon: Map, labelVi: 'Roadmap', labelEn: 'Roadmap', color: 'text-fuchsia-500', activeBg: 'bg-fuchsia-500/10' },
  { id: 'mockTest', icon: ClipboardList, labelVi: 'Mock Test', labelEn: 'Mock Test', color: 'text-rose-500', activeBg: 'bg-rose-500/10' },
  { id: 'challenge', icon: Swords, labelVi: 'Challenge', labelEn: 'Challenge', color: 'text-orange-500', activeBg: 'bg-orange-500/10' },
];

function GroupSidebar({
  isDarkMode = false,
  activeSection = 'dashboard',
  onSectionChange,
  groupName = '',
  wsConnected = false,
  memberCount = 0,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const shellClass = isDarkMode
    ? 'bg-[#0a1620]/95 border-white/10 text-white'
    : 'bg-white/80 border-white/60 text-slate-900';

  const hoverClass = isDarkMode
    ? 'hover:bg-white/[0.06]'
    : 'hover:bg-slate-50';

  const activeItemClass = isDarkMode
    ? 'bg-white/[0.08] border-cyan-400/30'
    : 'bg-gradient-to-r from-cyan-50 to-white border-cyan-200';

  const idleItemClass = isDarkMode
    ? 'border-transparent'
    : 'border-transparent';

  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  if (isCollapsed) {
    return (
      <aside className={`flex flex-col items-center w-[68px] shrink-0 h-full rounded-[28px] border backdrop-blur-xl py-4 gap-2 transition-all duration-300 ${shellClass} ${fontClass}`}>
        {/* Logo */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-colors ${hoverClass}`}
          title={currentLang === 'en' ? 'Expand sidebar' : 'Mở rộng sidebar'}
        >
          <img src={isDarkMode ? LogoDark : LogoLight} alt="Logo" className="h-6 w-6 object-contain" />
        </button>

        <div className={`w-8 h-px my-1 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

        {/* Nav items */}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange?.(item.id)}
              title={currentLang === 'en' ? item.labelEn : item.labelVi}
              className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-all duration-200 ${
                isActive
                  ? `${activeItemClass} ${item.activeBg}`
                  : `${idleItemClass} ${hoverClass}`
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? item.color : mutedClass}`} />
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Settings */}
        <button
          type="button"
          onClick={() => onSectionChange?.('settings')}
          title={currentLang === 'en' ? 'Settings' : 'Cài đặt'}
          className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-all duration-200 ${
            activeSection === 'settings'
              ? `${activeItemClass} bg-slate-500/10`
              : `${idleItemClass} ${hoverClass}`
          }`}
        >
          <Settings className={`h-5 w-5 ${activeSection === 'settings' ? 'text-slate-500' : mutedClass}`} />
        </button>
      </aside>
    );
  }

  return (
    <aside className={`flex flex-col w-[260px] shrink-0 h-full rounded-[28px] border backdrop-blur-xl transition-all duration-300 ${shellClass} ${fontClass}`}>
      {/* Group header — click to collapse */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className={`w-full px-5 pt-5 pb-4 text-left transition-colors rounded-t-[28px] cursor-pointer ${hoverClass}`}
        title={currentLang === 'en' ? 'Collapse sidebar' : 'Thu gọn sidebar'}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden ${isDarkMode ? 'bg-white/[0.08]' : 'bg-slate-100'}`}>
            <img src={isDarkMode ? LogoDark : LogoLight} alt="Logo" className="h-6 w-6 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-bold tracking-tight">{groupName || 'Group'}</h2>
              <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>
            <p className={`text-xs ${mutedClass}`}>
              {memberCount} {currentLang === 'en' ? 'members' : 'thành viên'}
            </p>
          </div>
        </div>
      </button>

      <div className={`mx-4 h-px ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const label = currentLang === 'en' ? item.labelEn : item.labelVi;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange?.(item.id)}
              className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 group ${
                isActive
                  ? activeItemClass
                  : `${idleItemClass} ${hoverClass}`
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isActive ? item.activeBg : (isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50')
              }`}>
                <Icon className={`h-[18px] w-[18px] ${isActive ? item.color : mutedClass}`} />
              </span>
              <span className={`text-sm font-medium truncate ${
                isActive
                  ? (isDarkMode ? 'text-white' : 'text-slate-900')
                  : (isDarkMode ? 'text-slate-300' : 'text-slate-600')
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className={`mx-4 h-px ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`} />

      {/* Bottom: Settings */}
      <div className="px-3 py-3">
        <button
          type="button"
          onClick={() => onSectionChange?.('settings')}
          className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
            activeSection === 'settings'
              ? activeItemClass
              : `${idleItemClass} ${hoverClass}`
          }`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            activeSection === 'settings' ? 'bg-slate-500/10' : (isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50')
          }`}>
            <Settings className={`h-[18px] w-[18px] ${activeSection === 'settings' ? 'text-slate-500' : mutedClass}`} />
          </span>
          <span className={`text-sm font-medium ${
            activeSection === 'settings'
              ? (isDarkMode ? 'text-white' : 'text-slate-900')
              : (isDarkMode ? 'text-slate-300' : 'text-slate-600')
          }`}>
            {currentLang === 'en' ? 'Settings' : 'Cài đặt'}
          </span>
        </button>
      </div>
    </aside>
  );
}

export default GroupSidebar;
