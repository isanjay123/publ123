import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  kind: string;
  isRead: boolean;
  createdAt: string;
  applicationNumber: string | null;
  isDemo: boolean;
};

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationItem[]> => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, title, body, kind, is_read, created_at, application_number, is_demo")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      kind: row.kind,
      isRead: row.is_read,
      createdAt: row.created_at,
      applicationNumber: row.application_number ?? null,
      isDemo: row.is_demo,
    }));
  });

export const setNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), isRead: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: data.isRead })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", context.userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
