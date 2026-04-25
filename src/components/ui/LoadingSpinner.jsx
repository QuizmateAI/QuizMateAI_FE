import './LoadingSpinner.css';

const TEXT_COUNT = 9;

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-950">
      <div className="loader">
        {Array.from({ length: TEXT_COUNT }, (_, i) => (
          <div key={i} className="text">
            <span>QuizMate AI</span>
          </div>
        ))}
        <div className="line" />
      </div>
    </div>
  );
}
