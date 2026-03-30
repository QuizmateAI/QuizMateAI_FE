const BACKOFFICE_THEME_MAP = {
  admin: {
    light: {
      root: 'bg-[#f4efe7]',
      canvas: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,244,236,0.18))]',
      orbPrimary: 'bg-emerald-400/20',
      orbSecondary: 'bg-amber-300/18',
      orbTertiary: 'bg-sky-300/18',
      topbar:
        'border-white/80 bg-white/72 shadow-[0_25px_65px_-28px_rgba(15,23,42,0.3)]',
      panel:
        'border-white/80 bg-white/74 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.35)]',
      panelStrong:
        'border-emerald-200/70 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.9),rgba(245,158,11,0.12))] shadow-[0_35px_90px_-38px_rgba(5,150,105,0.38)]',
      panelMuted: 'border-[#e7dfd3] bg-[#fbf7f0]/88',
      sidebar:
        'border-[#d8e8ed]/80 bg-[linear-gradient(180deg,rgba(229,241,246,0.98),rgba(220,234,238,0.96),rgba(212,229,233,0.94))] shadow-[0_30px_90px_-40px_rgba(15,23,42,0.28)]',
      sectionLabel: 'text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400',
      textPrimary: 'text-slate-950',
      textSecondary: 'text-slate-700',
      textMuted: 'text-slate-500',
      subtleText: 'text-slate-400',
      sidebarTitle: 'text-slate-950',
      sidebarBody: 'text-slate-700',
      sidebarMuted: 'text-slate-500',
      accentSoft: 'border border-emerald-500/15 bg-emerald-500/10 text-emerald-700',
      accentStrong:
        'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_20px_45px_-24px_rgba(16,185,129,0.9)]',
      control: 'border border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white',
      controlActive: 'border border-slate-900/10 bg-slate-900 text-white hover:bg-slate-800',
      profileCard:
        'border border-white/80 bg-white/80 text-slate-900 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.3)]',
      profileGradient: 'from-emerald-500 via-teal-400 to-cyan-400',
      mobileItem: 'border border-white/70 bg-white/75 text-slate-600',
      mobileItemActive: 'border border-emerald-500/10 bg-emerald-600 text-white',
      navItem: 'text-slate-600 hover:bg-white/80 hover:text-slate-950',
      navItemActive:
        'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_20px_50px_-26px_rgba(16,185,129,0.92)]',
      navIcon: 'bg-emerald-500/10 text-emerald-700',
      navIconActive: 'bg-white/15 text-white',
      logoutButton: 'border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15',
      footerNote: 'border border-[#d4e3e8]/80 bg-white/65',
    },
    dark: {
      root: 'bg-[#08131b]',
      canvas: 'bg-[linear-gradient(180deg,rgba(3,7,18,0.45),rgba(3,7,18,0.05))]',
      orbPrimary: 'bg-emerald-500/18',
      orbSecondary: 'bg-cyan-500/12',
      orbTertiary: 'bg-amber-400/10',
      topbar:
        'border-white/10 bg-[#0d1a21]/78 shadow-[0_30px_80px_-34px_rgba(0,0,0,0.75)]',
      panel:
        'border-white/10 bg-[#0e1820]/76 shadow-[0_35px_90px_-42px_rgba(0,0,0,0.8)]',
      panelStrong:
        'border-emerald-400/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(13,26,33,0.92),rgba(250,204,21,0.08))] shadow-[0_35px_90px_-42px_rgba(0,0,0,0.82)]',
      panelMuted: 'border-white/8 bg-[#101c25]/86',
      sidebar:
        'border-white/10 bg-[linear-gradient(180deg,rgba(9,17,24,0.94),rgba(7,14,20,0.9))] shadow-[0_35px_95px_-44px_rgba(0,0,0,0.82)]',
      sectionLabel: 'text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500',
      textPrimary: 'text-[#f7faf7]',
      textSecondary: 'text-slate-200',
      textMuted: 'text-slate-400',
      subtleText: 'text-slate-500',
      sidebarTitle: 'text-[#f7faf7]',
      sidebarBody: 'text-slate-300',
      sidebarMuted: 'text-slate-500',
      accentSoft: 'border border-emerald-400/15 bg-emerald-400/10 text-emerald-200',
      accentStrong:
        'bg-gradient-to-r from-emerald-400 to-cyan-300 text-slate-950 shadow-[0_20px_45px_-24px_rgba(34,211,238,0.7)]',
      control: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/8',
      controlActive:
        'border border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15',
      profileCard: 'border border-white/10 bg-white/5 text-white',
      profileGradient: 'from-emerald-400 via-teal-300 to-cyan-300',
      mobileItem: 'border border-white/8 bg-white/[0.04] text-slate-300',
      mobileItemActive: 'border border-emerald-300/10 bg-emerald-300 text-slate-950',
      navItem: 'text-slate-300 hover:bg-white/6 hover:text-white',
      navItemActive:
        'bg-gradient-to-r from-emerald-400 to-cyan-300 text-slate-950 shadow-[0_22px_55px_-28px_rgba(34,211,238,0.7)]',
      navIcon: 'bg-white/6 text-emerald-200',
      navIconActive: 'bg-black/10 text-slate-950',
      logoutButton: 'border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15',
      footerNote: 'border border-white/8 bg-white/[0.03]',
    },
  },
  superAdmin: {
    light: {
      root: 'bg-[#ece3d6]',
      canvas: 'bg-[linear-gradient(180deg,rgba(255,252,246,0.78),rgba(237,230,218,0.16))]',
      orbPrimary: 'bg-amber-300/22',
      orbSecondary: 'bg-emerald-300/14',
      orbTertiary: 'bg-sky-300/18',
      topbar:
        'border-[#e2d4bf] bg-[rgba(255,252,246,0.78)] shadow-[0_30px_75px_-34px_rgba(32,30,28,0.28)]',
      panel:
        'border-[#e2d4bf] bg-[rgba(255,252,246,0.82)] shadow-[0_35px_85px_-38px_rgba(32,30,28,0.28)]',
      panelStrong:
        'border-[#dac2a1] bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(255,252,246,0.92),rgba(16,185,129,0.1))] shadow-[0_35px_85px_-38px_rgba(30,24,20,0.3)]',
      panelMuted: 'border-[#e7dccb] bg-[#f8f1e7]/88',
      sidebar:
        'border-[#2c4c5f]/70 bg-[linear-gradient(180deg,rgba(15,33,46,0.98),rgba(20,44,59,0.98),rgba(17,36,48,0.96))] shadow-[0_35px_95px_-44px_rgba(0,0,0,0.55)]',
      sectionLabel: 'text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8b95a7]',
      textPrimary: 'text-[#171717]',
      textSecondary: 'text-[#424852]',
      textMuted: 'text-[#6f7580]',
      subtleText: 'text-[#989cab]',
      sidebarTitle: 'text-[#f6efe6]',
      sidebarBody: 'text-slate-200',
      sidebarMuted: 'text-[#94a8b6]',
      accentSoft: 'border border-amber-400/20 bg-amber-400/12 text-amber-700',
      accentStrong:
        'bg-gradient-to-r from-amber-400 via-orange-300 to-emerald-300 text-slate-950 shadow-[0_22px_55px_-28px_rgba(251,191,36,0.7)]',
      control: 'border border-[#ded3c1] bg-white/72 text-[#333] hover:bg-white',
      controlActive: 'border border-slate-900/10 bg-slate-900 text-white hover:bg-slate-800',
      profileCard:
        'border border-white/70 bg-white/80 text-slate-950 shadow-[0_22px_45px_-28px_rgba(15,23,42,0.25)]',
      profileGradient: 'from-amber-400 via-orange-400 to-emerald-300',
      mobileItem: 'border border-white/60 bg-white/72 text-[#4b5563]',
      mobileItemActive: 'border border-amber-300/10 bg-slate-900 text-white',
      navItem: 'text-slate-300 hover:bg-white/6 hover:text-white',
      navItemActive:
        'bg-gradient-to-r from-amber-400 to-emerald-300 text-slate-950 shadow-[0_22px_55px_-28px_rgba(251,191,36,0.66)]',
      navIcon: 'bg-white/6 text-amber-200',
      navIconActive: 'bg-black/10 text-slate-950',
      logoutButton: 'border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15',
      footerNote: 'border border-white/10 bg-white/[0.05]',
    },
    dark: {
      root: 'bg-[#071017]',
      canvas: 'bg-[linear-gradient(180deg,rgba(7,16,23,0.5),rgba(7,16,23,0.08))]',
      orbPrimary: 'bg-amber-400/14',
      orbSecondary: 'bg-emerald-400/12',
      orbTertiary: 'bg-cyan-400/10',
      topbar:
        'border-white/10 bg-[#0d171d]/78 shadow-[0_30px_80px_-34px_rgba(0,0,0,0.8)]',
      panel:
        'border-white/10 bg-[#101a1f]/80 shadow-[0_35px_90px_-42px_rgba(0,0,0,0.82)]',
      panelStrong:
        'border-amber-400/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(16,26,31,0.92),rgba(16,185,129,0.08))] shadow-[0_35px_90px_-42px_rgba(0,0,0,0.82)]',
      panelMuted: 'border-white/8 bg-[#121e24]/88',
      sidebar:
        'border-white/10 bg-[linear-gradient(180deg,rgba(10,17,22,0.96),rgba(6,11,15,0.94))] shadow-[0_35px_95px_-44px_rgba(0,0,0,0.84)]',
      sectionLabel: 'text-[11px] font-semibold uppercase tracking-[0.26em] text-[#6f7b90]',
      textPrimary: 'text-[#f7f1e7]',
      textSecondary: 'text-slate-200',
      textMuted: 'text-slate-400',
      subtleText: 'text-slate-500',
      sidebarTitle: 'text-[#f7f1e7]',
      sidebarBody: 'text-slate-200',
      sidebarMuted: 'text-[#91a0ad]',
      accentSoft: 'border border-amber-400/15 bg-amber-400/10 text-amber-200',
      accentStrong:
        'bg-gradient-to-r from-amber-400 via-orange-300 to-emerald-300 text-slate-950 shadow-[0_22px_55px_-28px_rgba(251,191,36,0.62)]',
      control: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/8',
      controlActive:
        'border border-amber-300/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15',
      profileCard: 'border border-white/10 bg-white/5 text-[#f7f1e7]',
      profileGradient: 'from-amber-400 via-orange-300 to-emerald-300',
      mobileItem: 'border border-white/8 bg-white/[0.04] text-slate-300',
      mobileItemActive: 'border border-amber-300/10 bg-amber-300 text-slate-950',
      navItem: 'text-slate-300 hover:bg-white/6 hover:text-white',
      navItemActive:
        'bg-gradient-to-r from-amber-400 to-emerald-300 text-slate-950 shadow-[0_22px_55px_-28px_rgba(251,191,36,0.62)]',
      navIcon: 'bg-white/6 text-amber-200',
      navIconActive: 'bg-black/10 text-slate-950',
      logoutButton: 'border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15',
      footerNote: 'border border-white/8 bg-white/[0.03]',
    },
  },
};

export function getBackofficeTheme(role, isDarkMode) {
  const roleTheme = BACKOFFICE_THEME_MAP[role] ?? BACKOFFICE_THEME_MAP.admin;
  return roleTheme[isDarkMode ? 'dark' : 'light'];
}
