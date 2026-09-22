import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  FileText,
  TriangleAlert,
} from "lucide-react";

import { StatusBadge } from "@/components/applications/StatusBadge";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApplicationDetail } from "@/lib/applications.functions";
import { formatFileSize } from "@/lib/services/documents";
import {
  formatDate,
  formatDateTime,
  processingDays,
  slaState,
  stageIndexForStatus,
  statusLabel,
  TRACKING_STAGES,
} from "@/lib/status";

export const Route = createFileRoute("/_authenticated/applications/$id")({
  head: () => ({
    meta: [
      { title: "Application tracking — Publica" },
      {
        name: "description",
        content:
          "Follow a Publica application step by step: department, submission date, expected completion, service commitment deadline and recorded action history.",
      },
      { property: "og:title", content: "Application tracking — Publica" },
      { property: "og:description", content: "A transparent, timestamped record of every processing step." },
    ],
  }),
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const [expanded, setExpanded] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplicationDetail({ data: { id } }),
    retry: false,
  });

  if (detail.isLoading) {
    return (
      <Shell>
        <LoadingState label="Loading application record…" />
      </Shell>
    );
  }

  if (detail.isError) {
    return (
      <Shell>
        <ErrorState
          title="This application could not be opened"
          description="It may not exist, or you may not have permission to view it."
          onRetry={() => detail.refetch()}
        />
      </Shell>
    );
  }

  const application = detail.data!;
  const sla = slaState(application.slaDeadline, application.status);
  const currentStage = stageIndexForStatus(application.status);

  return (
    <Shell>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link to="/applications">
          <ArrowLeft className="mr-2 h-4 w-4" /> All applications
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold">{application.applicationNumber}</h1>
            <StatusBadge status={application.status} />
            {application.isDemo ? (
              <Badge variant="secondary" className="font-normal">
                Demo record
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-muted-foreground">
            {application.serviceName} · {application.departmentName}
          </p>
        </div>
        {application.status === "documents_required" && application.isOwn ? (
          <Button asChild>
            <Link to="/apply/$serviceSlug" params={{ serviceSlug: application.serviceSlug }}>
              Upload requested document
            </Link>
          </Button>
        ) : null}
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Fact icon={<Building2 className="h-4 w-4" />} label="Responsible department">
          {application.departmentName}
        </Fact>
        <Fact icon={<CalendarClock className="h-4 w-4" />} label="Submission date">
          {formatDate(application.submittedAt)}
        </Fact>
        <Fact icon={<CalendarClock className="h-4 w-4" />} label="Expected completion">
          {formatDate(application.expectedCompletion)}
        </Fact>
        <Fact icon={<Clock className="h-4 w-4" />} label="Service commitment deadline">
          <span className={sla.tone}>{formatDate(application.slaDeadline)}</span>
          <span className="block text-xs text-muted-foreground">{sla.label}</span>
        </Fact>
        <Fact icon={<Clock className="h-4 w-4" />} label="Current processing time">
          {processingDays(application.submittedAt)} days so far
        </Fact>
      </dl>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="surface-card p-6">
          <h2 className="font-display text-xl font-semibold">Processing timeline</h2>
          <ol className="mt-5 space-y-5">
            {TRACKING_STAGES.map((stage, index) => {
              const done = index < currentStage;
              const active = index === currentStage;
              return (
                <li key={stage.key} className="flex gap-4">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                      done
                        ? "border-success/40 bg-success/10 text-success"
                        : active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <div>
                    <p className={`font-medium ${active ? "text-primary" : ""}`}>{stage.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {done
                        ? "Completed"
                        : active
                          ? "In progress at the responsible department"
                          : "Not started"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {application.status === "rejected" ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-destructive">
              <TriangleAlert className="h-4 w-4" /> This application was rejected. See the action history for
              the recorded reason.
            </p>
          ) : null}
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-xl font-semibold">Documents</h2>
          {application.documents.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No documents attached"
                description="Required documents for this service are listed in the catalogue."
                icon={<FileText className="h-5 w-5" />}
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {application.documents.map((document) => (
                <li key={document.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{document.documentLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.fileName} · {formatFileSize(document.fileSizeBytes)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-normal ${
                        document.verificationStatus === "verified"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-warning/30 bg-warning/10 text-warning"
                      }`}
                    >
                      {document.verificationStatus === "verified" ? "Verified" : "Needs verification"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {application.requiredDocuments.length ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm font-medium">Required for this service</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {application.requiredDocuments.map((document) => (
                  <li key={document}>{document}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="surface-card mt-6 p-6">
        <h2 className="font-display text-xl font-semibold">Action history</h2>
        <p className="text-sm text-muted-foreground">
          Every recorded action with its timestamp, department and reason. Expand an entry for details.
        </p>
        {application.history.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No recorded actions yet" description="Steps appear here as they happen." />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {application.history
              .slice()
              .reverse()
              .map((entry) => {
                const open = expanded === entry.id;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : entry.id)}
                      className="flex w-full items-center justify-between gap-4 py-3 text-left"
                      aria-expanded={open}
                    >
                      <span>
                        <span className="text-sm font-medium">{statusLabel(entry.status)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDateTime(entry.createdAt)} · {entry.actorLabel ?? "Publica"}
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open ? (
                      <div className="pb-4 text-sm text-muted-foreground">
                        <p>
                          <span className="text-foreground">Department:</span>{" "}
                          {entry.actorLabel ?? application.departmentName}
                        </p>
                        <p>
                          <span className="text-foreground">Action:</span> {statusLabel(entry.status)}
                        </p>
                        <p>
                          <span className="text-foreground">Reason:</span>{" "}
                          {entry.note ?? "No reason recorded for this step."}
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </Shell>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card p-4">
      <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium">{children}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
