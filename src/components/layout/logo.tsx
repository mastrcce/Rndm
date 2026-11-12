export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1f4d33" />
      <path d="M13 6h6v2.5l2 3.5v12.5A2.5 2.5 0 0 1 18.5 27h-5A2.5 2.5 0 0 1 11 24.5V12l2-3.5z" fill="#fdfbf6" />
      <path d="M11 16.5c2-1 3.5-1 5 0s3 1 5 0V24.5A2.5 2.5 0 0 1 18.5 27h-5A2.5 2.5 0 0 1 11 24.5z" fill="#c2d1b2" />
      <path d="M22.5 7.5c2.6.2 4 1.8 4 4.3-2.6 0-4.1-1.6-4-4.3z" fill="#a3b88e" />
    </svg>
  );
}
