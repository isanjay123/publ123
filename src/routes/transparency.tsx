import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Gavel, Languages, ShieldAlert, Timer } from "lucide-react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { getServiceCatalog } from "@/lib/catalog.functions";

const catalogQuery = { queryKey: ["service-catalog"], queryFn: () => getServiceCatalog() };

export const Route = createFileRoute("/transparency")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: () => ({
    meta: [
      { title: "Public Transparency — Publica" },
      {
        name: "description",
        content:
          "Published service commitments, audit-trail practice, grievance handling and multilingual access across Publica departments.",
      },
      { property: "og:title", content: "Public Transparency — Publica" },
      {
        property: "og:description",
        content: "Service commitments, audit trails and grievance routes, published for every citizen.",
      },
    ],
  }),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl p-8">
      <ErrorState />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-8">
      <EmptyState title="Not found" />
    </div>
  ),
  component: TransparencyPage,
});

function TransparencyPage() {
  const { data: services } = useSuspenseQuery(catalogQuery);

  const byDepartment = services.reduce<Record<string, typeof services>>((groups, service) => {
    const key = service.department.name;
    groups[key] = [...(groups[key] ?? []), service];
    return groups;
  }, {});

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-12">
            <h1 className="font-display text-3xl font-semibold">Public transparency</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Publica publishes what each department commits to, records who acted on every application,
              and gives citizens a direct route to raise grievances or integrity concerns.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12">
          <h2 className="font-display text-2xl font-semibold">Published service commitments</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {Object.entries(byDepartment).map(([department, departmentServices]) => (
              <article key={department} className="surface-card p-6">
                <h3 className="text-lg font-semibold">{department}</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {departmentServices.map((service) => (
                    <li key={service.id} className="flex items-start justify-between gap-4">
                      <span>{service.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                        <Timer className="h-3.5 w-3.5" />
                        {service.slaDays} days
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-12 md:grid-cols-3">
            <article className="surface-card p-6">
              <span className="inline-flex rounded-lg bg-accent/10 p-2 text-accent">
                <Gavel className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Secure audit trail</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Status changes are appended to a dedicated history table with the acting role, a note and a
                timestamp, so a case can always be reconstructed. Records are protected by access controls
                and retained — they are not claimed to be technically immutable.
              </p>
            </article>
            <article className="surface-card p-6">
              <span className="inline-flex rounded-lg bg-accent/10 p-2 text-accent">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Grievances & integrity</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Citizens can raise a grievance against a delayed application or report an integrity concern.
                Oversight Authority accounts review these independently of the handling department.
              </p>
            </article>
            <article className="surface-card p-6">
              <span className="inline-flex rounded-lg bg-accent/10 p-2 text-accent">
                <Languages className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Multilingual access</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Language preference lives on the citizen profile and travels with notifications and
                interface copy as additional languages are added.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12">
          <div className="surface-card flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
            <p className="max-w-xl text-sm text-muted-foreground">
              Sign in to raise a grievance, track an existing case or follow a decision through to delivery.
            </p>
            <Button asChild>
              <Link to="/auth">Sign in to Publica</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
