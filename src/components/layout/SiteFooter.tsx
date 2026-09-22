import { Link } from "@tanstack/react-router";

import { PublicaLogo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <PublicaLogo tagline />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            A demonstration digital government-services platform. All departments, services and case
            records shown here are fictional.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-display font-semibold">Platform</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/services" className="hover:text-foreground">
                Service catalogue
              </Link>
            </li>
            <li>
              <Link to="/transparency" className="hover:text-foreground">
                Public transparency
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-foreground">
                Citizen sign in
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-display font-semibold">Accountability</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>Service-level commitments published per service</li>
            <li>Every status change is recorded with a timestamp and actor</li>
            <li>Grievance and integrity reporting available to all citizens</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Publica — Transparent Governance. Accountable Services.
      </div>
    </footer>
  );
}
