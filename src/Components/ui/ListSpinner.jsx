const SIZES = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const WRAPPER = {
  section: 'flex items-center justify-center py-16',
  table: 'flex items-center justify-center py-12',
  inline: 'flex items-center justify-center py-4',
};

const SIZE_MAP = { section: 'md', table: 'sm', inline: 'sm' };

export default function ListSpinner({ variant = 'section', size, className = '' }) {
  const s = size || SIZE_MAP[variant] || 'md';
  return (
    <div className={`${WRAPPER[variant] || WRAPPER.section} ${className}`}>
      <svg
        className={`${SIZES[s]} animate-spin text-blue-500 dark:text-blue-400`}
        viewBox="0 0 100 100"
        fill="none"
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const cx = 50 + 30 * Math.cos(rad);
          const cy = 50 + 30 * Math.sin(rad);
          return (
            <circle
              key={deg}
              cx={cx}
              cy={cy}
              r={6}
              fill="currentColor"
              fillOpacity={1 - i * 0.125}
            />
          );
        })}
      </svg>
    </div>
  );
}
