interface IconProps {
  className?: string;
}

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IcRt = ({ className }: IconProps) => (
  <svg viewBox="0 0 32 32" className={className} fill="none">
    <defs>
      <linearGradient id="rtg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00b0f0" />
        <stop offset="0.38" stopColor="#7a5cf5" />
        <stop offset="0.68" stopColor="#f04e9a" />
        <stop offset="1" stopColor="#ff8a3d" />
      </linearGradient>
    </defs>
    <path
      d="M16 3.5a12.5 12.5 0 1 1-12.5 12.5"
      stroke="url(#rtg)"
      strokeWidth="5.4"
      strokeLinecap="round"
    />
    <circle cx="16" cy="16" r="3.4" fill="url(#rtg)" />
  </svg>
);

export const IcMic = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
  </svg>
);

export const IcMicOff = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7M4 4l16 16" />
  </svg>
);

export const IcHeadOff = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 14a8 8 0 0 1 16 0" />
    <rect x="3" y="14" width="4" height="6" rx="1.4" />
    <rect x="17" y="14" width="4" height="6" rx="1.4" />
    <path d="M4 4l16 16" />
  </svg>
);

export const IcRadio = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
  </svg>
);

export const IcCam = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="3" y="7" width="12" height="10" rx="2" />
    <path d="M15 10.5 21 7v10l-6-3.5" />
  </svg>
);

export const IcSnap = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </svg>
);

export const IcExpand = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const IcGrid = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);

export const IcSingle = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="3.5" y="4.5" width="17" height="10" rx="1.2" />
    <path d="M4.5 18.5h4M10.5 18.5h4M16.5 18.5h3" />
  </svg>
);

export const IcVideoOff = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="3" y="7" width="12" height="10" rx="2" />
    <path d="M15 10.5 21 7v10l-6-3.5M4 4l16 16" />
  </svg>
);

export const IcFile = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M6 3h9l4 4v14H6V3Z" />
    <path d="M15 3v5h4M9.5 12h6M9.5 16h6" />
  </svg>
);

export const IcClock = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IcPlus = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IcTrash = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
  </svg>
);

export const IcSave = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M5 4h11l3 3v13H5V4Z" />
    <path d="M8.5 4v5h7V4M8.5 20v-6h7v6" />
  </svg>
);

export const IcWave = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
  </svg>
);

export const IcSignal = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M5 18v-3M10 18v-6M15 18v-9M20 18v-12" />
  </svg>
);

export const IcChevR = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IcTemplate = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <path d="M4 9h16M9 9v11M12.5 13h4M12.5 16.5h4" />
  </svg>
);

export const IcRefresh = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />
  </svg>
);

export const IcPdf = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M6 3h9l4 4v14H6V3Z" />
    <path d="M15 3v5h4M12 10.5v6M9.5 14.5 12 17l2.5-2.5" />
  </svg>
);

export const IcChevL = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const IcGear = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9" />
  </svg>
);

export const IcUsers = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <path d="M15.5 5.4a3.2 3.2 0 0 1 0 5.7M17.6 14.9c1.6.7 2.6 2.2 2.9 4.1" />
  </svg>
);

export const IcLogout = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M14 4H6v16h8M10 12h10M17 8.5l3.5 3.5-3.5 3.5" />
  </svg>
);

export const IcEye = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

export const IcPen = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m14.5 5 4.5 4.5L8.5 20 3.5 20.5 4 15.5 14.5 5Z" />
    <path d="m12.5 7 4.5 4.5" />
  </svg>
);

export const IcShield = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 2.5 4.5 5.3v5.6c0 4.7 3.2 8.8 7.5 10.6 4.3-1.8 7.5-5.9 7.5-10.6V5.3L12 2.5Z" />
    <path d="m8.8 11.8 2.2 2.2 4.2-4.5" />
  </svg>
);

/* фирменный знак «лента» (стилизация) */
export const RtMark = ({ className }: IconProps) => (
  <svg viewBox="0 0 48 48" className={className}>
    <defs>
      <linearGradient id="rtg1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#00b0f0" />
        <stop offset="0.55" stopColor="#7a5cf5" />
        <stop offset="1" stopColor="#f04e9a" />
      </linearGradient>
      <linearGradient id="rtg2" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#ff8a3d" />
        <stop offset="1" stopColor="#f04e9a" />
      </linearGradient>
    </defs>
    <path
      fill="url(#rtg1)"
      d="M8 30 C8 14 18 8 30 8 L40 8 L40 16 L30 16 C22 16 16 20 16 30 L16 40 L8 40 Z"
    />
    <path
      fill="url(#rtg2)"
      d="M40 18 C40 34 30 40 18 40 L8 40 L8 32 L18 32 C26 32 32 28 32 18 L32 8 L40 8 Z"
      opacity="0.9"
    />
  </svg>
);

export const IcClose = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IcPopout = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="4" y="4" width="12" height="12" rx="1.4" />
    <path d="M20 9v10a1 1 0 0 1-1 1H9M14 10l6-6M15 4h5v5" />
  </svg>
);
