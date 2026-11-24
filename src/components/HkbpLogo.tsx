interface HkbpLogoProps {
  className?: string;
  variant?: 'color' | 'monochrome-light' | 'monochrome-dark';
}

export function HkbpLogo({ className = 'w-10 h-10', variant = 'color' }: HkbpLogoProps) {
  const strokeColor =
    variant === 'monochrome-light'
      ? '#f0f0f1'
      : variant === 'monochrome-dark'
        ? '#1d2327'
        : '#1E3A5F';
  const crossFill =
    variant === 'monochrome-light'
      ? '#ffffff'
      : variant === 'monochrome-dark'
        ? '#1d2327'
        : '#9A3412';
  const ringBg =
    variant === 'monochrome-light'
      ? 'rgba(255,255,255,0.08)'
      : variant === 'monochrome-dark'
        ? 'rgba(29,35,39,0.06)'
        : '#FBF9F5';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo HKBP Ressort Hutaraja"
    >
      <circle cx="32" cy="32" r="29" fill={ringBg} stroke={strokeColor} strokeWidth="2.5" />
      <circle cx="32" cy="32" r="24" stroke={strokeColor} strokeWidth="1" strokeDasharray="2 2" opacity="0.55" />
      {/* Salib utama HKBP */}
      <path
        d="M29.5 13H34.5V26H47.5V31H34.5V51H29.5V31H16.5V26H29.5V13Z"
        fill={crossFill}
      />
      {/* Garis aksen horizontal alkitab/pelayanan di bawah */}
      <path
        d="M20 44C23.5 41.5 27.5 41.5 32 43.5C36.5 41.5 40.5 41.5 44 44"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
