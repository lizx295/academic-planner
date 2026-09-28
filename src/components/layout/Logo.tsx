export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.5" y="3.5" width="19" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 8.5h10M7 12h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16.6" cy="16.4" r="2.4" fill="none" className="fill-accent" />
    </svg>
  );
}