import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CitizenApplication = {
  id: string;
  applicationNumber: string;
  status: string;
  serviceName: string;
  departmentName: string;
  submittedAt: string;
  expectedCompletion: string | null;
  slaDeadline: string | null;
  notes: string | null;
  isDemo: boolean;
};

export type CitizenNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  isRead: boolean;
  createdAt: string;
};

export type CitizenDashboard = {
  profile: { fullName: string; email: string | null; phone: string | null; locale: string };
  roles: string[];
  kpis: {
    activeApplications: number;
    pendingDocuments: number;
    completedApplications: number;
    openGrievances: number;
  };
  applications: CitizenApplication[];
  notifications: CitizenNotification[];
};

const ACTIVE = ["submitted", "under_review", "documents_required", "verified"];

export const getCitizenDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CitizenDashboard> => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string }).email ?? null;

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, locale")
      .eq("id", userId)
      .maybeSingle();

    let profile = existingProfile;
    if (!profile) {
      const fallbackName =
        ((claims as { user_metadata?: { full_name?: string } }).user_metadata?.full_name ?? "").trim() ||
        (email ? email.split("@")[0]! : "Citizen");
      const { data: created } = await supabase
        .from("profiles")
        .insert({ id: userId, full_name: fallbackName, email })
        .select("full_name, email, phone, locale")
        .maybeSingle();
      profile = created ?? { full_name: fallbackName, email, phone: null, locale: "en" };
      await supabase.from("user_roles").insert({ user_id: userId, role: "citizen" });
    }

    const [{ data: roleRows }, { data: appRows }, { data: notificationRows }, { count: grievanceCount }] =
      await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase
          .from("applications")
          .select(
            "id, application_number, status, submitted_at, expected_completion, sla_deadline, notes, is_demo, services(name), departments(name)",
          )
          .order("submitted_at", { ascending: false })
          .limit(20),
        supabase
          .from("notifications")
          .select("id, title, body, kind, is_read, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("grievances").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);

    const applications: CitizenApplication[] = (appRows ?? []).map((row) => ({
      id: row.id,
      applicationNumber: row.application_number,
      status: row.status,
      serviceName: row.services?.name ?? "Government service",
      departmentName: row.departments?.name ?? "Department",
      submittedAt: row.submitted_at,
      expectedCompletion: row.expected_completion,
      slaDeadline: row.sla_deadline,
      notes: row.notes,
      isDemo: row.is_demo,
    }));

    return {
      profile: {
        fullName: profile.full_name,
        email: profile.email ?? email,
        phone: profile.phone,
        locale: profile.locale,
      },
      roles: (roleRows ?? []).map((row) => row.role),
      kpis: {
        activeApplications: applications.filter((a) => ACTIVE.includes(a.status)).length,
        pendingDocuments: applications.filter((a) => a.status === "documents_required").length,
        completedApplications: applications.filter((a) => a.status === "completed" || a.status === "approved")
          .length,
        openGrievances: grievanceCount ?? 0,
      },
      applications,
      notifications: (notificationRows ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        kind: row.kind,
        isRead: row.is_read,
        createdAt: row.created_at,
      })),
    };
  });

export const updateCitizenProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(24).optional().or(z.literal("")),
        locale: z.enum(["en", "hi", "ta", "fr", "es"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone ? data.phone : null,
        locale: data.locale,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ serviceSlug: z.string().trim().min(2).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, department_id, processing_time_days, sla_days")
      .eq("slug", data.serviceSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (serviceError) throw new Error(serviceError.message);
    if (!service) throw new Error("This service is not available.");

    const now = new Date();
    const addDays = (days: number) =>
      new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);
    const applicationNumber = `PUB-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`;

    const { data: application, error } = await supabase
      .from("applications")
      .insert({
        application_number: applicationNumber,
        citizen_id: userId,
        service_id: service.id,
        department_id: service.department_id,
        status: "submitted",
        expected_completion: addDays(service.processing_time_days),
        sla_deadline: addDays(service.sla_days),
        notes: "Awaiting officer assignment.",
      })
      .select("id, application_number")
      .single();

    if (error) throw new Error(error.message);

    await supabase.from("application_status_history").insert({
      application_id: application.id,
      status: "submitted",
      actor_label: "Citizen Portal",
      note: `${service.name} application submitted online.`,
    });

    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Application submitted",
      body: `${service.name} (${application.application_number}) is now in the queue.`,
      kind: "success",
    });

    return { applicationNumber: application.application_number };
  });
