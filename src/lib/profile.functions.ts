import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  slaAlerts: boolean;
};

export type ProfileSettings = {
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  locale: string;
  notificationPrefs: NotificationPreferences;
  mfaEnabled: boolean;
  mfaMethod: string | null;
  roles: string[];
};

const LOCALES = ["en", "ta", "hi", "ml", "te", "kn", "bn", "mr"] as const;

const DEFAULT_PREFS: NotificationPreferences = {
  inApp: true,
  email: true,
  sms: false,
  slaAlerts: true,
};

function normalisePrefs(value: unknown): NotificationPreferences {
  const raw = (value ?? {}) as Partial<NotificationPreferences>;
  return {
    inApp: raw.inApp ?? DEFAULT_PREFS.inApp,
    email: raw.email ?? DEFAULT_PREFS.email,
    sms: raw.sms ?? DEFAULT_PREFS.sms,
    slaAlerts: raw.slaAlerts ?? DEFAULT_PREFS.slaAlerts,
  };
}

export const getProfileSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileSettings> => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string }).email ?? null;

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, phone, address, locale, notification_prefs, mfa_enabled, mfa_method")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    return {
      fullName: profile?.full_name ?? (email ? email.split("@")[0]! : "Citizen"),
      email: profile?.email ?? email,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      locale: profile?.locale ?? "en",
      notificationPrefs: normalisePrefs(profile?.notification_prefs),
      mfaEnabled: profile?.mfa_enabled ?? false,
      mfaMethod: profile?.mfa_method ?? null,
      roles: (roleRows ?? []).map((row) => row.role),
    };
  });

export const updateProfileSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(24).or(z.literal("")),
        address: z.string().trim().max(400).or(z.literal("")),
        locale: z.enum(LOCALES),
        notificationPrefs: z.object({
          inApp: z.boolean(),
          email: z.boolean(),
          sms: z.boolean(),
          slaAlerts: z.boolean(),
        }),
        mfaEnabled: z.boolean(),
        mfaMethod: z.enum(["authenticator_app", "sms", "email"]).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone || null,
        address: data.address || null,
        locale: data.locale,
        notification_prefs: data.notificationPrefs,
        mfa_enabled: data.mfaEnabled,
        mfa_method: data.mfaEnabled ? (data.mfaMethod ?? "authenticator_app") : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
