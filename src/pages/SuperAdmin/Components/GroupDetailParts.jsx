import React from 'react';
import { ChevronRight, Clock3, Mail, RefreshCw, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const GROUP_NAME_PLACEHOLDERS = ['group name null', 'name null', 'null', 'undefined'];
const GROUP_DESCRIPTION_PLACEHOLDERS = ['group description null', 'description null', 'null', 'undefined'];

export function normalizeText(value) {
  if (value == null) return '';

  const trimmed = String(value).trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed || normalized === 'null' || normalized === 'undefined') {
    return '';
  }

  return trimmed;
}

export function formatEnumLabel(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '-';

  return normalized
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveLocale(language) {
  return language === 'en' ? 'en-GB' : 'vi-VN';
}

export function formatDateTime(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return '-';

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function resolveGroupName(group, t) {
  const rawName = normalizeText(group?.groupName || group?.name);
  if (!rawName || GROUP_NAME_PLACEHOLDERS.includes(rawName.toLowerCase())) {
    return t('groupDetail.untitledGroup');
  }
  return rawName;
}

export function resolveGroupDescription(group, t) {
  const rawDescription = normalizeText(group?.description);
  if (!rawDescription || GROUP_DESCRIPTION_PLACEHOLDERS.includes(rawDescription.toLowerCase())) {
    return t('groupDetail.noDescription');
  }
  return rawDescription;
}

export function resolveMembers(group) {
  return Array.isArray(group?.members) ? group.members : [];
}

export function resolveLeaderName(group, members, t) {
  const directLeader = normalizeText(group?.createdByFullName || group?.createdByUsername || group?.leaderName);
  if (directLeader) return directLeader;

  const leaderMember = members.find((member) => String(member?.role || '').toUpperCase() === 'LEADER');
  const leaderName = normalizeText(leaderMember?.fullName || leaderMember?.username);
  return leaderName || t('groupDetail.unknownLeader');
}

export function resolveMemberRoleLabel(role, t) {
  const normalizedRole = normalizeText(role).toLowerCase();
  const translated = normalizedRole ? t(`groupDetail.memberRoles.${normalizedRole}`) : '';

  if (translated && translated !== `groupDetail.memberRoles.${normalizedRole}`) {
    return translated;
  }

  return formatEnumLabel(role || 'member');
}

export function resolveRoleTone(role, isDarkMode) {
  const normalizedRole = String(role || '').toUpperCase();

  if (normalizedRole === 'LEADER') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalizedRole === 'CONTRIBUTOR') {
    return isDarkMode
      ? 'border-sky-500/30 bg-sky-500/12 text-sky-200'
      : 'border-sky-200 bg-sky-50 text-sky-700';
  }

  return isDarkMode
    ? 'border-amber-500/30 bg-amber-500/12 text-amber-200'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

export function resolveActionTone(action, isDarkMode) {
  const normalizedAction = String(action || '').toUpperCase();

  if (normalizedAction.includes('INVITATION') || normalizedAction.includes('ADD') || normalizedAction.includes('JOIN')) {
    return isDarkMode
      ? 'border-sky-500/25 bg-sky-500/12 text-sky-200'
      : 'border-sky-200 bg-sky-50 text-sky-700';
  }

  if (normalizedAction.includes('LEAVE') || normalizedAction.includes('REMOVE') || normalizedAction.includes('DELETE')) {
    return isDarkMode
      ? 'border-rose-500/25 bg-rose-500/12 text-rose-200'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (normalizedAction.includes('UPDATE') || normalizedAction.includes('EDIT')) {
    return isDarkMode
      ? 'border-violet-500/25 bg-violet-500/12 text-violet-200'
      : 'border-violet-200 bg-violet-50 text-violet-700';
  }

  return isDarkMode
    ? 'border-slate-600 bg-slate-800 text-slate-200'
    : 'border-slate-200 bg-slate-100 text-slate-700';
}

export function resolveSubscriptionStatus(subscription, t) {
  return normalizeText(subscription?.status) || t('groupDetail.unknownStatus');
}

export function LoadingState({ isDarkMode, t }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-2xl border px-4 py-4 text-sm', isDarkMode ? 'border-slate-700 bg-slate-900/70 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600')}>
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span>{t('groupDetail.loading', 'Loading...')}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-dashed px-5 py-10 text-center',
        isDarkMode ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-slate-50/80'
      )}
    >
      <div className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-2xl', isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600')}>
        <Icon className="h-5 w-5" />
      </div>
      <p className={cn('mt-4 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{title}</p>
      <p className={cn('mx-auto mt-2 max-w-md text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{description}</p>
    </div>
  );
}

export function SectionFrame({
  eyebrow,
  title,
  description,
  icon: Icon,
  isDarkMode,
  className,
  children,
}) {
  return (
    <section
      className={cn(
        'rounded-[30px] border p-5 sm:p-6',
        isDarkMode
          ? 'border-slate-800 bg-slate-900/85 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.82)]'
          : 'border-slate-200 bg-white shadow-[0_28px_70px_-48px_rgba(15,23,42,0.22)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'rounded-2xl p-3',
              isDarkMode ? 'bg-slate-800 text-sky-200' : 'bg-sky-50 text-sky-700'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {eyebrow ? (
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                {eyebrow}
              </p>
            ) : null}
            <h2 className={cn('mt-1 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{title}</h2>
            {description ? (
              <p className={cn('mt-1.5 max-w-2xl text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function TabButton({
  active,
  icon: Icon,
  label,
  meta,
  isDarkMode,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group rounded-[24px] border px-4 py-4 text-left transition-all duration-200',
        active
          ? isDarkMode
            ? 'border-sky-400/30 bg-sky-500/12 shadow-[0_24px_50px_-36px_rgba(14,165,233,0.45)]'
            : 'border-sky-200 bg-sky-50/90 shadow-[0_24px_50px_-36px_rgba(59,130,246,0.24)]'
          : isDarkMode
            ? 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/85'
            : 'border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'rounded-2xl p-2.5 transition-colors',
              active
                ? isDarkMode
                  ? 'bg-sky-500/15 text-sky-200'
                  : 'bg-white text-sky-700'
                : isDarkMode
                  ? 'bg-slate-800 text-slate-300 group-hover:text-sky-200'
                  : 'bg-slate-100 text-slate-600 group-hover:text-sky-700'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold', active ? (isDarkMode ? 'text-white' : 'text-slate-900') : isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
              {label}
            </p>
            <p className={cn('mt-1 truncate text-xs', active ? (isDarkMode ? 'text-sky-200/90' : 'text-sky-700') : isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              {meta}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
            active
              ? isDarkMode
                ? 'bg-sky-300'
                : 'bg-sky-500'
              : isDarkMode
                ? 'bg-slate-700 group-hover:bg-slate-500'
                : 'bg-slate-200 group-hover:bg-slate-300'
          )}
        />
      </div>
    </button>
  );
}

export function MemberCard({ member, isDarkMode, t, leaderName }) {
  const role = String(member?.role || '').toUpperCase();
  const displayName = normalizeText(member?.fullName || member?.username) || t('groupDetail.unknownLeader');
  const email = normalizeText(member?.email) || t('groupDetail.noEmail');
  const username = normalizeText(member?.username);
  const isLeader = role === 'LEADER' || displayName === leaderName;

  return (
    <article
      className={cn(
        'rounded-[24px] border p-4 transition-colors',
        isLeader
          ? isDarkMode
            ? 'border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(15,23,42,0.88))]'
            : 'border-emerald-200 bg-[linear-gradient(180deg,#f6fffb,#ffffff)]'
          : isDarkMode
            ? 'border-slate-800 bg-slate-950/45 hover:border-slate-700'
            : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'
      )}
    >
      <div className="flex items-start gap-3">
        {member?.avatar ? (
          <img src={member.avatar} alt="" className="h-12 w-12 rounded-2xl object-cover" />
        ) : (
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600')}>
            <User className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {displayName}
              </p>
              <p className={cn('mt-1 truncate text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {username ? `@${username}` : email}
              </p>
            </div>
            <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', resolveRoleTone(role, isDarkMode))}>
              {resolveMemberRoleLabel(role, t)}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600')}>
              <Mail className="mr-1.5 h-3 w-3" />
              {email}
            </Badge>
          </div>
        </div>
      </div>
    </article>
  );
}

export function RoadmapCard({ roadmap, index, isDarkMode, locale }) {
  const title = normalizeText(roadmap?.title || roadmap?.roadmapName) || `Roadmap ${index + 1}`;
  const description = normalizeText(roadmap?.description || roadmap?.goal);
  const status = formatEnumLabel(roadmap?.status || 'ACTIVE');

  return (
    <article
      className={cn(
        'rounded-[24px] border p-5',
        isDarkMode
          ? 'border-slate-800 bg-slate-950/55'
          : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)]'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold', isDarkMode ? 'bg-slate-800 text-sky-200' : 'bg-sky-50 text-sky-700')}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <div className="min-w-0">
            <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{title}</h3>
            {description ? (
              <p className={cn('mt-2 line-clamp-3 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', resolveActionTone(status, isDarkMode))}>
          {status}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(roadmap?.updatedAt || roadmap?.createdAt) ? (
          <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600')}>
            <Clock3 className="mr-1.5 h-3 w-3" />
            {formatDateTime(roadmap?.updatedAt || roadmap?.createdAt, locale)}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}

export function LogCard({ log, isDarkMode, locale }) {
  const action = formatEnumLabel(log?.action || log?.actionType || 'EVENT');
  const description = normalizeText(log?.description || log?.actorEmail || log?.resource) || '-';
  const resource = normalizeText(log?.resource);

  return (
    <article
      className={cn(
        'rounded-[24px] border p-4',
        isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-slate-200 bg-slate-50/90'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', resolveActionTone(action, isDarkMode))}>
          {action}
        </Badge>
        <p className={cn('shrink-0 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
          {formatDateTime(log?.logTime || log?.timestamp || log?.createdAt, locale)}
        </p>
      </div>
      <p className={cn('mt-3 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
        {description}
      </p>
      {resource && resource !== description ? (
        <div className={cn('mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium', isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-500')}>
          <ChevronRight className="mr-1.5 h-3 w-3" />
          {resource}
        </div>
      ) : null}
    </article>
  );
}
