import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';

export default function PolicyTOC({ headings }) {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!headings || headings.length === 0) return undefined;
    const ids = headings.map((h) => h.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-100px 0px -65% 0px', threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (!headings || headings.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className={`hidden lg:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border p-5 ${
        isDarkMode
          ? 'bg-slate-900/40 border-slate-800'
          : 'bg-white border-slate-200'
      }`}
    >
      <h4
        className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        {t('policies.tableOfContents', 'On this page')}
      </h4>
      <ul className="space-y-1">
        {headings
          .filter((h) => h.level === 2 || h.level === 3)
          .map((h) => {
            const isActive = activeId === h.id;
            const indent = h.level === 3 ? 'pl-5' : 'pl-2';
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const target = document.getElementById(h.id);
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      setActiveId(h.id);
                    }
                  }}
                  className={`block py-1.5 ${indent} text-sm border-l-2 transition-colors ${
                    isActive
                      ? isDarkMode
                        ? 'border-blue-400 text-white font-medium'
                        : 'border-blue-600 text-slate-900 font-medium'
                      : isDarkMode
                        ? 'border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400'
                  }`}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
