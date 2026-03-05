import React from 'react';

const IconBase = ({ className = '', children, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const ArrowUpIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </IconBase>
);

export const GlobeIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18" />
    <path d="M12 3a15 15 0 0 0 0 18" />
  </IconBase>
);

export const SunIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </IconBase>
);

export const MoonIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" />
  </IconBase>
);

export const PlayCircleIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m10 9 5 3-5 3Z" />
  </IconBase>
);

export const BrainIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <path d="M9 5a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 5 2.24A3 3 0 0 0 16 16v-1a3 3 0 0 0 0-6V8a3 3 0 0 0-5-2.24A3 3 0 0 0 9 5Z" />
    <path d="M12 8v8" />
    <path d="M8.5 11.5h7" />
  </IconBase>
);

export const MapIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" />
    <path d="M9 4v14" />
    <path d="M15 6v14" />
  </IconBase>
);

export const MicIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <path d="M12 17v4" />
    <path d="M8 21h8" />
  </IconBase>
);

export const CheckIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <path d="m5 12 4 4L19 6" />
  </IconBase>
);

export const CheckCircleIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </IconBase>
);

export const SparklesIcon = ({ className = '', ...props }) => (
  <IconBase className={className} {...props}>
    <path d="M12 3 14.2 8.8 20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z" />
    <path d="m5 3 .8 2 .2.8 2 .8-.8.2-2 .8-.2.8-.8 2-.8-2-.2-.8-2-.8 2-.8.2-.8L5 3Z" />
    <path d="m19 15 .6 1.6L21 17l-1.4.4L19 19l-.6-1.6L17 17l1.4-.4L19 15Z" />
  </IconBase>
);
