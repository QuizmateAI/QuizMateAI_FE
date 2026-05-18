import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, UserCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { getGroupMembers } from '@/api/GroupAPI';

const AUDIENCE_TYPES = [
  { id: 'ALL_MEMBERS', icon: Users },
  { id: 'SPECIFIC_MEMBERS', icon: UserCheck },
];

function unwrap(response) {
  if (response && typeof response === 'object' && 'data' in response) return response.data;
  return response;
}

function pickMembersList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
}

function normalizeMember(member) {
  if (!member || typeof member !== 'object') return null;
  // Workspace members có nhiều shape — userID/userId/id và authorName/userName/email.
  const userId = Number(member.userId ?? member.userID ?? member.id);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  const fullName = String(
    member.fullName
      || member.userName
      || member.name
      || member.username
      || member.email
      || '',
  ).trim();
  const email = String(member.email || '').trim();
  const role = String(member.role || member.memberRole || 'MEMBER').toUpperCase();
  const status = String(member.status || member.memberStatus || 'ACTIVE').toUpperCase();
  return {
    userId,
    label: fullName || email || `User #${userId}`,
    email,
    role,
    status,
    avatarUrl: member.avatarUrl || member.avatar || null,
  };
}

function AssignmentAudiencePicker({
  workspaceId,
  audienceType,
  targetUserIds = [],
  onChange,
  // userId của tác giả — không hiển thị trong list để khớp BE (loại tác giả).
  excludeUserIds = [],
  isDarkMode = false,
  disabled = false,
}) {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState('');

  // Fetch khi cần hiển thị SPECIFIC_MEMBERS picker. ALL_MEMBERS mode bypass
  // fetch để giữ form nhẹ khi không cần list.
  useEffect(() => {
    if (audienceType !== 'SPECIFIC_MEMBERS' || !workspaceId) return undefined;
    let cancelled = false;
    setIsFetching(true);
    setFetchError(null);
    void (async () => {
      try {
        // BE clamp max size 50 nhưng nhóm nhỏ thường < 50; nếu lớn hơn, FE phân
        // trang sau. MVP fetch 1 trang lớn.
        const response = await getGroupMembers(workspaceId, 0, 100);
        if (cancelled) return;
        const raw = unwrap(response);
        const list = pickMembersList(raw);
        const normalized = list
          .map(normalizeMember)
          .filter((m) => m && m.status === 'ACTIVE' && !excludeUserIds.includes(m.userId));
        setMembers(normalized);
      } catch (err) {
        if (!cancelled) setFetchError(err);
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [audienceType, excludeUserIds, workspaceId]);

  const handleSelectType = (nextType) => {
    if (disabled || nextType === audienceType) return;
    onChange?.({ audienceType: nextType, targetUserIds: nextType === 'SPECIFIC_MEMBERS' ? targetUserIds : [] });
  };

  const toggleUser = useCallback((userId) => {
    if (disabled) return;
    const exists = targetUserIds.includes(userId);
    const next = exists ? targetUserIds.filter((id) => id !== userId) : [...targetUserIds, userId];
    onChange?.({ audienceType: 'SPECIFIC_MEMBERS', targetUserIds: next });
  }, [disabled, onChange, targetUserIds]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => (
      m.label.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    ));
  }, [members, search]);

  return (
    <div className="space-y-3">
      <div role="radiogroup" className="grid grid-cols-2 gap-2">
        {AUDIENCE_TYPES.map(({ id, icon: Icon }) => {
          const active = audienceType === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => handleSelectType(id)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors text-left',
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : isDarkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                active && isDarkMode ? 'bg-blue-500/15 text-blue-200 border-blue-500/70' : '',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {t(`groupWorkspace.assignments.audienceTypes.${id}.label`)}
                </p>
                <p className={cn('text-xs leading-tight mt-0.5', active ? 'text-blue-700/70' : (isDarkMode ? 'text-slate-500' : 'text-gray-500'))}>
                  {t(`groupWorkspace.assignments.audienceTypes.${id}.hint`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {audienceType === 'SPECIFIC_MEMBERS' ? (
        <div className={cn(
          'rounded-md border p-3 space-y-2',
          isDarkMode ? 'border-slate-700 bg-slate-900/40' : 'border-gray-200 bg-gray-50',
        )}>
          <div className="relative">
            <Search className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4',
              isDarkMode ? 'text-slate-500' : 'text-gray-400',
            )} />
            <Input
              type="search"
              placeholder={t('groupWorkspace.assignments.form.memberSearchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={disabled || isFetching}
              className={cn(
                'pl-9',
                isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : '',
              )}
            />
          </div>

          <div className={cn(
            'max-h-[220px] overflow-y-auto rounded-md border',
            isDarkMode ? 'border-slate-700 bg-slate-950' : 'border-gray-200 bg-white',
          )}>
            {isFetching ? (
              <div className={cn('flex items-center justify-center gap-2 py-6 text-sm', isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('groupWorkspace.assignments.form.memberLoading')}</span>
              </div>
            ) : null}

            {!isFetching && fetchError ? (
              <p className="px-3 py-4 text-sm text-red-500">
                {t('groupWorkspace.assignments.form.memberLoadFailed')}
              </p>
            ) : null}

            {!isFetching && !fetchError && filteredMembers.length === 0 ? (
              <p className={cn('px-3 py-4 text-sm', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
                {t('groupWorkspace.assignments.form.memberEmpty')}
              </p>
            ) : null}

            {filteredMembers.map((member) => {
              const checked = targetUserIds.includes(member.userId);
              return (
                <label
                  key={member.userId}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 cursor-pointer border-b last:border-0 transition-colors',
                    isDarkMode ? 'border-slate-800 hover:bg-slate-900/70' : 'border-gray-100 hover:bg-gray-50',
                    checked && (isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'),
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleUser(member.userId)}
                    disabled={disabled}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
                      {member.label}
                    </p>
                    {member.email ? (
                      <p className={cn('truncate text-xs', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
                        {member.email}
                      </p>
                    ) : null}
                  </div>
                  {member.role !== 'MEMBER' ? (
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700',
                    )}>
                      {member.role}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>

          <p className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
            {t('groupWorkspace.assignments.form.memberSelectedCount', { count: targetUserIds.length })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default AssignmentAudiencePicker;
