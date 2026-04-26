import './LoadingSpinner.css';
import i18n from '@/i18n';

const TEXT_COUNT = 9;

export default function LoadingSpinner() {
  const spinnerLabel = i18n.t('common.loadingSpinner.brandLabel', {
    defaultValue: 'QuizMate AI',
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-950">
      <div className="loader">
        {Array.from({ length: TEXT_COUNT }, (_, i) => (
          <div key={i} className="text">
            <span>{spinnerLabel}</span>
          </div>
        ))}
        <div className="line" />
      </div>
    </div>
  );
}
