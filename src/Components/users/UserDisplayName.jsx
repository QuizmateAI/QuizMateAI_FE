import { cn } from '@/lib/utils';
import { getUserDisplayParts } from '@/Utils/userProfile';

export default function UserDisplayName({
  user,
  fallback = 'User',
  className = '',
  nameClassName = '',
  usernameClassName = '',
  isDarkMode = false,
}) {
  const display = getUserDisplayParts(user, fallback);

  return (
    <span className={cn('inline-flex min-w-0 items-baseline gap-1', className)}>
      <span className={cn('truncate', nameClassName)}>{display.name}</span>
      {display.hasUsernameSuffix && (
        <span className={cn(
          'shrink-0 text-[0.82em] font-normal',
          isDarkMode ? 'text-slate-500' : 'text-slate-400',
          usernameClassName,
        )}>
          #{display.username}
        </span>
      )}
    </span>
  );
}
