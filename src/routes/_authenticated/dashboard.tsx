import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  MessageSquareWarning,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askPublicaAi } from "@/lib/catalog.functions";
import { getCitizenDashboard, type CitizenApplication } from "@/lib/citizen.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Citizen Dashboard — Publica" },
      {
        name: "description",
        content:
          "Your Publica dashboard: active applications, pending documents, notifications and upcoming actions.",
      },
      { property: "og:title", content: "Citizen Dashboard — Publica" },
      { property: "og:description", content: "Your public services, simplified and transparent." },
    ],
  }),
  component: DashboardPage,
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  documents_required: "Documents required",
  verified: "Verified",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

function statusTone(status: string) {
  if (status === "documents_required" || status === "rejected") return "text-destructive";
  if (status === "approved" || status === "completed") return "text-success";
  return "text-accent";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function DashboardPage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);

  const dashboard = useQuery({
    queryKey: ["citizen-dashboard"],
    queryFn: () => getCitizenDashboard(),
  });

  const assistant = useMutation({
    mutationFn: (value: string) => askPublicaAi({ data: { question: value } }),
    onError: () => toast.error("The assistant is unavailable right now."),
  });

  const kpis = dashboard.data?.kpis;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        {dashboard.isLoading ? <LoadingState label="Loading your dashboard…" /> : null}
        {dashboard.isError ? <ErrorState onRetry={() => dashboard.refetch()} /> : null}

        {dashboard.data ? (
          <>
            <header>
              <h1 className="font-display text-3xl font-semibold">
                {greeting()}, {dashboard.data.profile.fullName}
              </h1>
              <p className="mt-2 text-muted-foreground">
                Your public services, simplified and transparent.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dashboard.data.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="font-normal capitalize">
                    {role.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </header>

            <section className="surface-card mt-8 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    What government service do you need?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Example: “I need to apply for a birth certificate.”
                  </p>
                </div>
              </div>
              <form
                className="mt-5 flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = question.trim();
                  if (value.length < 3) {
                    toast.error("Please add a little more detail.");
                    return;
                  }
                  setAskedQuestion(value);
                  assistant.mutate(value);
                }}
              >
                <Input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Describe what you need"
                  aria-label="Ask Publica AI"
                />
                <Button type="submit" disabled={assistant.isPending}>
                  <Search className="mr-2 h-4 w-4" />
                  Search services
                </Button>
              </form>

              {assistant.isPending ? <LoadingState label="Matching your request…" /> : null}
              {assistant.data && askedQuestion ? (
                <div className="mt-5 rounded-xl border border-border bg-muted/50 p-5">
                  <p className="text-sm">{assistant.data.answer}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {assistant.data.suggestions.map((suggestion) => (
                      <Button key={suggestion.serviceSlug} asChild variant="outline" size="sm">
                        <Link to="/services">{suggestion.serviceName}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Active Applications"
                value={kpis?.activeApplications ?? 0}
                icon={<ClipboardList className="h-4 w-4" />}
              />
              <KpiCard
                label="Pending Documents"
                value={kpis?.pendingDocuments ?? 0}
                icon={<FileWarning className="h-4 w-4" />}
              />
              <KpiCard
                label="Completed Applications"
                value={kpis?.completedApplications ?? 0}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <KpiCard
                label="Open Grievances"
                value={kpis?.openGrievances ?? 0}
                icon={<MessageSquareWarning className="h-4 w-4" />}
              />
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <section className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">Recent applications</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/services" })}>
                    New application
                  </Button>
                </div>
                {dashboard.data.applications.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      title="No applications yet"
                      description="Choose a service to submit your first application."
                      action={
                        <Button asChild size="sm">
                          <Link to="/services">Browse services</Link>
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-border">
                    {dashboard.data.applications.map((application) => (
                      <ApplicationRow key={application.id} application={application} />
                    ))}
                  </ul>
                )}
              </section>

              <div className="space-y-6">
                <section className="surface-card p-6">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-accent" />
                    <h2 className="font-display text-lg font-semibold">Notifications</h2>
                  </div>
                  {dashboard.data.notifications.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">Nothing new right now.</p>
                  ) : (
                    <ul className="mt-4 space-y-4">
                      {dashboard.data.notifications.map((notification) => (
                        <li key={notification.id} className="text-sm">
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-muted-foreground">{notification.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(notification.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="surface-card p-6">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-accent" />
                    <h2 className="font-display text-lg font-semibold">Upcoming actions</h2>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm">
                    {dashboard.data.applications
                      .filter((application) =>
                        ["documents_required", "under_review", "submitted"].includes(application.status),
                      )
                      .slice(0, 4)
                      .map((application) => (
                        <li key={`action-${application.id}`}>
                          <p className="font-medium">
                            {application.status === "documents_required"
                              ? `Re-upload documents for ${application.serviceName}`
                              : `Await verification for ${application.serviceName}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Service commitment date {formatDate(application.slaDeadline)}
                          </p>
                        </li>
                      ))}
                    {dashboard.data.applications.length === 0 ? (
                      <li className="text-muted-foreground">No actions required.</li>
                    ) : null}
                  </ul>
                </section>
              </div>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              Cases marked “demo” are fictional records included so the dashboard is populated for review.
            </p>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <article className="surface-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-[0.14em]">{label}</span>
        <span className="rounded-md bg-muted p-1.5">{icon}</span>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold">{value}</p>
    </article>
  );
}

function ApplicationRow({ application }: { application: CitizenApplication }) {
  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{application.serviceName}</p>
          {application.isDemo ? (
            <Badge variant="outline" className="text-[10px] font-normal uppercase">
              demo
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {application.applicationNumber} · {application.departmentName}
        </p>
        {application.notes ? (
          <p className="mt-1 text-xs text-muted-foreground">{application.notes}</p>
        ) : null}
      </div>
      <div className="text-left sm:text-right">
        <p className={`text-sm font-medium ${statusTone(application.status)}`}>
          {STATUS_LABELS[application.status] ?? application.status}
        </p>
        <p className="text-xs text-muted-foreground">
          Expected {formatDate(application.expectedCompletion)}
        </p>
      </div>
    </li>
  );
}
