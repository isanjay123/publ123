import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bot, Building2, CalendarClock, FileText, Search } from "lucide-react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/useSession";
import { getServiceCatalog, type CatalogService } from "@/lib/catalog.functions";

const catalogQuery = {
  queryKey: ["service-catalog"],
  queryFn: () => getServiceCatalog(),
};

export const Route = createFileRoute("/services")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: () => ({
    meta: [
      { title: "Service Catalogue — Publica" },
      {
        name: "description",
        content:
          "Browse Publica government services: certificates, licences, permits, vehicle registration and welfare schemes, with documents and processing times.",
      },
      { property: "og:title", content: "Service Catalogue — Publica" },
      {
        property: "og:description",
        content: "Every Publica service with its department, processing window and required documents.",
      },
    ],
  }),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl p-8">
      <ErrorState description="The service catalogue could not be loaded right now." />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-8">
      <EmptyState title="Not found" />
    </div>
  ),
  component: ServicesPage,
});

function formatFee(cents: number) {
  return cents === 0 ? "No fee" : `${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} fee units`;
}

function ServicesPage() {
  const { data: services } = useSuspenseQuery(catalogQuery);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();

  const departments = Array.from(new Set(services.map((service) => service.department.name))).sort();
  const filtered = services.filter((service) => {
    const term = query.trim().toLowerCase();
    const matchesTerm =
      !term ||
      service.name.toLowerCase().includes(term) ||
      service.department.name.toLowerCase().includes(term) ||
      service.description.toLowerCase().includes(term) ||
      service.requiredDocuments.some((document) => document.toLowerCase().includes(term));
    const matchesDepartment = department === "all" || service.department.name === department;
    return matchesTerm && matchesDepartment;
  });

  function onApply(service: CatalogService) {
    if (!isAuthenticated) {
      navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    navigate({ to: "/apply/$serviceSlug", params: { serviceSlug: service.slug } });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-12">
            <h1 className="font-display text-3xl font-semibold">Service catalogue</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {services.length} services across {departments.length} departments. Each entry lists the
              department, published processing window and the documents you need before you begin.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search services, documents or departments"
                  aria-label="Search services"
                  className="pl-9"
                />
              </div>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="sm:w-72" aria-label="Filter by department">
                  <Building2 className="mr-2 h-4 w-4 shrink-0" />
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setDepartment("all")}>
                <Badge variant={department === "all" ? "default" : "secondary"} className="font-normal">
                  All departments
                </Badge>
              </button>
              {departments.map((name) => (
                <button key={name} type="button" onClick={() => setDepartment(name)}>
                  <Badge variant={department === name ? "default" : "secondary"} className="font-normal">
                    {name}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="publica-ai" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-12">
          <div className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold">Not sure which service you need?</h2>
                <p className="text-sm text-muted-foreground">
                  Ask Publica AI — for example, “I need to apply for a birth certificate.”
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/ai-assistant">Talk to Publica AI</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12">
          {filtered.length === 0 ? (
            <EmptyState
              title="No services match your search"
              description="Try a different word, or browse the full catalogue."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setDepartment("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((service) => (
                <article key={service.id} className="surface-card flex flex-col p-6">
                  <Badge variant="outline" className="w-fit font-normal">
                    <Building2 className="mr-1.5 h-3 w-3" />
                    {service.department.name}
                  </Badge>
                  <h3 className="mt-4 text-lg font-semibold">{service.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>

                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      <dt className="sr-only">Processing time</dt>
                      <dd>
                        Approx. {service.processingTimeDays} working days · service commitment{" "}
                        {service.slaDays} days
                      </dd>
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <FileText className="mt-0.5 h-4 w-4" />
                      <div>
                        <dt className="font-medium text-foreground">Required documents</dt>
                        <dd>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {service.requiredDocuments.map((document) => (
                              <li key={document}>{document}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    </div>
                  </dl>

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">{formatFee(service.feeCents)}</span>
                    <Button size="sm" onClick={() => onApply(service)}>
                      {isAuthenticated ? "Apply" : "Sign in to apply"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-8 text-xs text-muted-foreground">
            Need something that isn't listed?{" "}
            <Link to="/transparency" className="underline">
              See how Publica handles grievances and integrity reports
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
