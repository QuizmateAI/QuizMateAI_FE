import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

/**
 * HomeButton - A reusable button component to navigate back to home
 * 
 * @param {Object} props
 * @param {string} [props.variant='outline'] - Button variant (outline, ghost, default, etc.)
 * @param {string} [props.size='default'] - Button size (sm, default, lg)
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.showIcon=true] - Whether to show the home icon
 * @param {boolean} [props.showText=true] - Whether to show the text label
 * @param {string} [props.label] - Custom label (overrides i18n)
 * @param {Function} [props.onClick] - Custom onClick handler (overrides default navigation)
 * @param {boolean} [props.rounded=false] - Whether to use rounded-full style
 */
export function HomeButton({
  variant = 'outline',
  size = 'default',
  className = '',
  showIcon = true,
  showText = true,
  label,
  onClick,
  rounded = true,
  ...props
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/home');
    }
  };

  const buttonText = label || t('common.home', 'Trang chủ');

  const roundedClass = rounded ? 'rounded-full' : 'rounded-[14px]';
  const toneClass = isDarkMode
    ? 'border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900 hover:text-slate-100'
    : 'border-slate-200 bg-white text-slate-700 shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:bg-slate-50 hover:text-slate-700';

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 px-4 text-sm font-semibold',
        roundedClass,
        toneClass,
        className,
      )}
      aria-label={t('common.goHome', 'Go to Home')}
      {...props}
    >
      {showIcon && <Home className="h-4 w-4" />}
      {showText && <span>{buttonText}</span>}
    </Button>
  );
}

/**
 * FloatingHomeButton - A floating action button variant for home navigation
 * Positioned fixed at bottom-right of the screen
 */
export function FloatingHomeButton({
  className = '',
  onClick,
  ...props
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/home');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDarkMode
          ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-slate-900'
          : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-white'
      } ${className}`}
      aria-label={t('common.goHome', 'Go to Home')}
      {...props}
    >
      <Home className="h-6 w-6" />
    </button>
  );
}

export default HomeButton;
