import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, UserCircle2 } from 'lucide-react';

export default function MemberPickerDropdown({
  value,
  onChange,
  members = [],
  placeholder = 'Select a member…',
  emptyHint = 'No member available.',
  disabled = false,
  isDarkMode = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-focus search input khi mở
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  const selected = useMemo(
    () => members.find((m) => String(m.id) === String(value ?? '')) || null,
    [members, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const haystack = `${m.label || ''} ${m.subLabel || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [members, search]);

  const buttonCls = `flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    isDarkMode
      ? 'border-slate-600 bg-slate-800 text-white hover:border-slate-500'
      : 'border-gray-200 bg-white text-slate-900 hover:border-gray-300'
  } ${open ? (isDarkMode ? 'border-orange-400/60 ring-1 ring-orange-400/40' : 'border-orange-400 ring-1 ring-orange-200') : ''}`;

  const panelCls = `absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border shadow-lg ${
    isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
  }`;

  const renderAvatar = (m, size = 'h-7 w-7') => {
    if (m?.avatarUrl) {
      return (
        <img
          src={m.avatarUrl}
          alt=""
          className={`${size} shrink-0 rounded-full object-cover`}
        />
      );
    }
    const initial = (m?.label || '?').trim().charAt(0).toUpperCase();
    return (
      <span
        className={`${size} flex shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
        }`}
      >
        {initial}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={buttonCls}
      >
        {selected ? (
          <>
            {renderAvatar(selected)}
            <div className="min-w-0 flex-1">
              <div className={`truncate text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {selected.label}
              </div>
              {selected.subLabel ? (
                <div className={`truncate text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selected.subLabel}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <UserCircle2 className={`h-5 w-5 shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className={`flex-1 truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {placeholder}
            </span>
          </>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
        />
      </button>

      {open ? (
        <div className={panelCls}>
          <div className={`flex items-center gap-2 border-b px-3 py-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
            <Search className={`h-4 w-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className={`w-full bg-transparent text-sm outline-none ${
                isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className={`px-3 py-3 text-center text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {search ? 'Không có kết quả phù hợp.' : emptyHint}
              </li>
            ) : (
              filtered.map((m) => {
                const isSelected = String(m.id) === String(value ?? '');
                const itemDisabled = Boolean(m.disabled);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={itemDisabled}
                      title={itemDisabled && m.warning ? m.warning : undefined}
                      onClick={() => {
                        if (itemDisabled) return;
                        onChange(String(m.id));
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                        itemDisabled
                          ? 'cursor-not-allowed opacity-50'
                          : isSelected
                            ? (isDarkMode ? 'bg-orange-500/15 text-orange-100' : 'bg-orange-50 text-orange-900')
                            : (isDarkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-900')
                      }`}
                    >
                      {renderAvatar(m)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{m.label}</span>
                          {m.warning ? (
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              isDarkMode ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {m.warning}
                            </span>
                          ) : null}
                        </div>
                        {m.subLabel ? (
                          <div className={`truncate text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {m.subLabel}
                          </div>
                        ) : null}
                      </div>
                      {isSelected && !itemDisabled ? (
                        <Check className={`h-4 w-4 shrink-0 ${isDarkMode ? 'text-orange-300' : 'text-orange-500'}`} />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
