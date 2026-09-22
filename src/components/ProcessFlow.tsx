const STEPS = [
  { label: "Citizen", detail: "Request raised" },
  { label: "Application", detail: "Documents attached" },
  { label: "Department", detail: "Officer assigned" },
  { label: "Verification", detail: "Checks recorded" },
  { label: "Decision", detail: "Outcome published" },
  { label: "Service", detail: "Delivered" },
];

export function ProcessFlow() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-white/60">How a request travels</p>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((step, index) => (
          <li key={step.label} className="relative">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start">
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-xs font-semibold text-white">
                {index + 1}
                <span className="absolute inset-0 rounded-full border border-white/20 motion-safe:animate-ping [animation-duration:3.5s]" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">{step.label}</p>
                <p className="text-xs text-white/60">{step.detail}</p>
              </div>
            </div>
            {index < STEPS.length - 1 ? (
              <span className="pointer-events-none absolute left-9 top-4 hidden h-px w-[calc(100%-1.75rem)] bg-gradient-to-r from-white/40 to-white/5 lg:block" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
