const TONES = {
  amber: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
  blue: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white',
  rose: 'bg-gradient-to-br from-rose-500 to-pink-500 text-white',
  violet: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white',
};

export default function LocalAvatar({ label, initials, tone = 'blue', className = '', textClassName = '' }) {
  const palette = TONES[tone] || TONES.blue;

  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-full font-black uppercase shadow-md ${palette} ${className}`}
    >
      <span className={textClassName}>{initials}</span>
    </div>
  );
}
