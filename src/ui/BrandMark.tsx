interface Props {
  className?: string;
  size?: number;
}

/** Original mark: stacked container blocks on a whale silhouette (not a trademark copy). */
export function BrandMark({ className, size = 28 }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="learnDocker"
    >
      <defs>
        <linearGradient id="ldWhale" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2496ED" />
          <stop offset="100%" stopColor="#0B4C8C" />
        </linearGradient>
        <linearGradient id="ldBox" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      {/* whale body */}
      <path
        d="M8 38c2-10 12-18 28-18 14 0 24 6 28 14 1 2-1 4-3 4H12c-3 0-5-1-4-4z"
        fill="url(#ldWhale)"
      />
      <path
        d="M8 38c1 6 6 10 14 10h28c8 0 12-4 12-10"
        fill="none"
        stroke="#1B5E9E"
        strokeWidth="2"
        opacity=".35"
      />
      {/* tail */}
      <path d="M8 36c-4 2-6 6-5 10 3-1 6-2 9-2-2-3-3-6-4-8z" fill="#1B5E9E" />
      {/* container stack (signature) */}
      <rect x="18" y="18" width="10" height="8" rx="1.5" fill="url(#ldBox)" />
      <rect x="30" y="18" width="10" height="8" rx="1.5" fill="url(#ldBox)" opacity=".9" />
      <rect x="24" y="10" width="10" height="8" rx="1.5" fill="url(#ldBox)" />
      <rect x="36" y="10" width="10" height="8" rx="1.5" fill="url(#ldBox)" opacity=".75" />
      {/* eye / water hint */}
      <circle cx="48" cy="32" r="2.2" fill="#0B1220" opacity=".55" />
      <path d="M12 44h8" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      <path d="M24 46h14" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity=".35" />
    </svg>
  );
}
