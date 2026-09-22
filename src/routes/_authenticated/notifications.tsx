import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Info, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listNotifications,
  markAllNotificationsRead,
  setNotificationRead,
} from "@/lib/notifications.functions";
import { formatDateTime } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Publica" },
      {
        name: "description",
        content:
          "Status changes, document requests and service deadline reminders for your Publica applications.",
      },
      { property: "og:title", content: "Notifications — Publica" },
      { property: "og:description", content: "Every update on your government applications in one place." },
    ],
  }),
  component: NotificationsPage,
});

function iconFor(kind: string) {
  if (kind === "warning") return <TriangleAlert className="h-4 w-4 text-warning" />;
  if (kind === "success") return <CheckCheck className="h-4 w-4 text-success" />;
  return <Info className="h-4 w-4 text-primary" />;
}

function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["citizen-dashboard"] });
  };

  const toggleRead = useMutation({
    mutationFn: (input: { id: string; isRead: boolean }) => setNotificationRead({ data: input }),
    onSuccess: invalidate,
    onError: () => toast.error("We couldn't update that notification."),
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidate();
    },
    onError: () => toast.error("We couldn't update your notifications."),
  });

  const rows = notifications.data ?? [];
  const unread = rows.filter((row) => !row.isRead && !row.isDemo).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Notifications</h1>
            <p className="mt-1 text-muted-foreground">
              {unread > 0 ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're up to date."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unread === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {notifications.isLoading ? <LoadingState label="Loading your notifications…" /> : null}
          {notifications.isError ? (
            <ErrorState
              title="We couldn't load your notifications"
              description="Check your connection and try again."
              onRetry={() => notifications.refetch()}
            />
          ) : null}

          {notifications.data && rows.length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="Updates appear here as your applications progress."
              icon={<Bell className="h-5 w-5" />}
            />
          ) : null}

          {rows.map((row) => (
            <article
              key={row.id}
              className={`surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between ${
                row.isRead ? "opacity-80" : ""
              }`}
            >
              <div className="flex gap-3">
                <span className="mt-0.5">{iconFor(row.kind)}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {row.title}
                    {!row.isRead ? (
                      <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                    ) : null}
                    {row.isDemo ? (
                      <Badge variant="secondary" className="font-normal">
                        Demo
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{row.body}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDateTime(row.createdAt)}</span>
                    <span className="capitalize">{row.kind}</span>
                    {row.applicationNumber ? (
                      <Link to="/applications" className="underline">
                        {row.applicationNumber}
                      </Link>
                    ) : null}
                  </p>
                </div>
              </div>
              {!row.isDemo ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRead.mutate({ id: row.id, isRead: !row.isRead })}
                  disabled={toggleRead.isPending}
                >
                  {row.isRead ? "Mark unread" : "Mark read"}
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
