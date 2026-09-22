import { cn } from "@/lib/utils";

/**
 * PUBLICA mark: connected nodes forming an open civic arch — a citizen node
 * linked through verification nodes to a public-service node.
 */
export function PublicaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Publica"
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <linearGradient id="publica-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
      <path
        d="M13 32V17a5 5 0 0 1 5-5h8a8 8 0 0 1 0 16h-8"
        fill="none"
        stroke="url(#publica-mark)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="13" cy="32" r="3.6" fill="currentColor" />
      <circle cx="26" cy="12" r="3.2" fill="currentColor" fillOpacity="0.85" />
      <circle cx="30" cy="28" r="3.2" fill="currentColor" fillOpacity="0.7" />
      <circle cx="36" cy="36" r="2.6" fill="currentColor" fillOpacity="0.5" />
      <path d="M30 28l6 8" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PublicaLogo({
  className,
  tagline = false,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <PublicaMark className="h-8 w-8 text-primary" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-semibold tracking-[0.22em]">PUBLICA</span>
        {tagline ? (
          <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Transparent Governance
          </span>
        ) : null}
      </span>
    </span>
  );
}
