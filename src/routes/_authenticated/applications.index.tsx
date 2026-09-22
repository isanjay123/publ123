import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";

import { StatusBadge } from "@/components/applications/StatusBadge";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
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
import { listApplications } from "@/lib/applications.functions";
import { formatDate, slaState, statusLabel } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => ({
    meta: [
      { title: "My applications — Publica" },
      {
        name: "description",
        content: "Track every Publica application with its department, status and service commitment deadline.",
      },
      { property: "og:title", content: "My applications — Publica" },
      { property: "og:description", content: "Applications, statuses and deadlines in one place." },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const applications = useQuery({
    queryKey: ["applications"],
    queryFn: () => listApplications(),
  });

  const rows = (applications.data ?? []).filter((row) => {
    const term = query.trim().toLowerCase();
    const matchesTerm =
      !term ||
      row.applicationNumber.toLowerCase().includes(term) ||
      row.serviceName.toLowerCase().includes(term) ||
      row.departmentName.toLowerCase().includes(term);
    const matchesStatus = status === "all" || row.status === status;
    return matchesTerm && matchesStatus;
  });

  const statuses = Array.from(new Set((applications.data ?? []).map((row) => row.status)));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">My applications</h1>
            <p className="mt-1 text-muted-foreground">
              Every application, its responsible department and its service commitment status.
            </p>
          </div>
          <Button asChild>
            <Link to="/services">Start a new application</Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by application ID, service or department"
              className="pl-9"
              aria-label="Search applications"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-64" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {statusLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6">
          {applications.isLoading ? <LoadingState label="Loading your applications…" /> : null}
          {applications.isError ? (
            <ErrorState
              title="We couldn't reach the application service"
              description="Check your connection and try again."
              onRetry={() => applications.refetch()}
            />
          ) : null}

          {applications.data && rows.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Browse the service catalogue to start your first application."
              icon={<FileText className="h-5 w-5" />}
              action={
                <Button asChild size="sm">
                  <Link to="/services">Explore services</Link>
                </Button>
              }
            />
          ) : null}

          {rows.length > 0 ? (
            <div className="surface-card overflow-hidden">
              <div className="hidden grid-cols-[1.2fr_1.4fr_1.2fr_1fr_1fr] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
                <span>Application ID</span>
                <span>Service</span>
                <span>Department</span>
                <span>Submitted</span>
                <span>Service commitment</span>
              </div>
              <ul className="divide-y divide-border">
                {rows.map((row) => {
                  const sla = slaState(row.slaDeadline, row.status);
                  return (
                    <li key={row.id}>
                      <Link
                        to="/applications/$id"
                        params={{ id: row.id }}
                        className="grid gap-2 px-5 py-4 transition hover:bg-muted/50 lg:grid-cols-[1.2fr_1.4fr_1.2fr_1fr_1fr] lg:items-center lg:gap-4"
                      >
                        <span className="flex flex-wrap items-center gap-2 font-medium">
                          {row.applicationNumber}
                          {row.isDemo ? (
                            <Badge variant="secondary" className="font-normal">
                              Demo
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-sm">
                          {row.serviceName}
                          <span className="ml-2 lg:hidden">
                            <StatusBadge status={row.status} />
                          </span>
                        </span>
                        <span className="text-sm text-muted-foreground">{row.departmentName}</span>
                        <span className="text-sm text-muted-foreground">{formatDate(row.submittedAt)}</span>
                        <span className={`text-sm ${sla.tone}`}>{sla.label}</span>
                        <span className="hidden lg:col-span-5 lg:block">
                          <StatusBadge status={row.status} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Applications marked “Demo” are fictional records included to demonstrate the workflow. Publica keeps
          a recorded, timestamped history of every step; it does not claim that history is technically
          immutable.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
