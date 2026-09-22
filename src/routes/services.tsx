import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Bot, Building2, CalendarClock, FileText, Send } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { askPublicaAi, getServiceCatalog, type CatalogService } from "@/lib/catalog.functions";
import { submitApplication } from "@/lib/citizen.functions";

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
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();

  const assistant = useQuery({
    queryKey: ["publica-ai", askedQuestion],
    queryFn: () => askPublicaAi({ data: { question: askedQuestion! } }),
    enabled: Boolean(askedQuestion),
  });

  const apply = useMutation({
    mutationFn: (serviceSlug: string) => submitApplication({ data: { serviceSlug } }),
    onSuccess: (result) => {
      toast.success(`Application ${result.applicationNumber} submitted`);
      navigate({ to: "/dashboard" });
    },
    onError: () => toast.error("We couldn't submit that application. Please try again."),
  });

  const departments = Array.from(new Set(services.map((service) => service.department.name))).sort();
  const filtered = services.filter((service) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      service.name.toLowerCase().includes(term) ||
      service.department.name.toLowerCase().includes(term) ||
      service.description.toLowerCase().includes(term)
    );
  });

  function onApply(service: CatalogService) {
    if (!isAuthenticated) {
      navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    apply.mutate(service.slug);
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
            <div className="mt-6 max-w-md">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services or departments"
                aria-label="Search services"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {departments.map((department) => (
                <Badge key={department} variant="secondary" className="font-normal">
                  {department}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        <section id="publica-ai" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-12">
          <div className="surface-card p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold">Talk to Publica AI</h2>
                <p className="text-sm text-muted-foreground">
                  What government service do you need? For example: “I need to apply for a birth
                  certificate.”
                </p>
              </div>
            </div>
            <form
              className="mt-5 flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (question.trim().length < 3) {
                  toast.error("Please describe what you need in a few more words.");
                  return;
                }
                setAskedQuestion(question.trim());
              }}
            >
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Describe your request in your own words"
                aria-label="Ask Publica AI"
              />
              <Button type="submit">
                <Send className="mr-2 h-4 w-4" />
                Ask Publica
              </Button>
            </form>

            {assistant.isFetching ? <LoadingState label="Publica AI is checking the catalogue…" /> : null}
            {assistant.isError ? <ErrorState onRetry={() => assistant.refetch()} /> : null}
            {assistant.data && !assistant.isFetching ? (
              <div className="mt-5 rounded-xl border border-border bg-muted/50 p-5">
                <p className="text-sm">{assistant.data.answer}</p>
                <ul className="mt-4 grid gap-3 md:grid-cols-3">
                  {assistant.data.suggestions.map((suggestion) => (
                    <li key={suggestion.serviceSlug} className="rounded-lg border border-border bg-card p-4">
                      <p className="text-sm font-medium">{suggestion.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.department}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Assistant running in offline demonstration mode — responses come from the published
                  service catalogue.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12">
          {filtered.length === 0 ? (
            <EmptyState
              title="No services match your search"
              description="Try a different word, or browse the full catalogue."
              action={
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  Clear search
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
                    <Button
                      size="sm"
                      onClick={() => onApply(service)}
                      disabled={apply.isPending && apply.variables === service.slug}
                    >
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
