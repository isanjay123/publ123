import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isAcceptedFile,
  MAX_FILE_SIZE_BYTES,
  runVerificationPipeline,
  type PipelineStage,
} from "@/lib/services/documents";

export type ApplicationListItem = {
  id: string;
  applicationNumber: string;
  status: string;
  serviceName: string;
  serviceSlug: string;
  departmentName: string;
  submittedAt: string;
  expectedCompletion: string | null;
  slaDeadline: string | null;
  isDemo: boolean;
  isOwn: boolean;
};

export type ApplicationDocument = {
  id: string;
  documentLabel: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  verificationStatus: string;
  pipeline: PipelineStage[];
  extracted: Record<string, string>;
  createdAt: string;
};

export type ApplicationHistoryEntry = {
  id: string;
  status: string;
  actorLabel: string | null;
  note: string | null;
  createdAt: string;
};

export type ApplicationDetail = ApplicationListItem & {
  notes: string | null;
  processingTimeDays: number;
  slaDays: number;
  requiredDocuments: string[];
  formData: Record<string, string>;
  history: ApplicationHistoryEntry[];
  documents: ApplicationDocument[];
};

const applicantSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).or(z.literal("")),
  phone: z.string().trim().max(24).or(z.literal("")),
  address: z.string().trim().max(400).or(z.literal("")),
  purpose: z.string().trim().max(400).or(z.literal("")),
  preferredDelivery: z.enum(["digital", "collection", "post"]),
});

function addDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function mapRow(row: any, userId: string): ApplicationListItem {
  return {
    id: row.id,
    applicationNumber: row.application_number,
    status: row.status,
    serviceName: row.services?.name ?? "Government service",
    serviceSlug: row.services?.slug ?? "",
    departmentName: row.departments?.name ?? "Department",
    submittedAt: row.submitted_at,
    expectedCompletion: row.expected_completion,
    slaDeadline: row.sla_deadline,
    isDemo: row.is_demo,
    isOwn: row.citizen_id === userId,
  };
}

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApplicationListItem[]> => {
    const { data, error } = await context.supabase
      .from("applications")
      .select(
        "id, application_number, status, submitted_at, expected_completion, sla_deadline, is_demo, citizen_id, services(name, slug), departments(name)",
      )
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapRow(row, context.userId));
  });

export const getApplicationDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().trim().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }): Promise<ApplicationDetail> => {
    const { supabase, userId } = context;
    const column = data.id.includes("-") && data.id.length === 36 ? "id" : "application_number";
    const { data: row, error } = await supabase
      .from("applications")
      .select(
        "id, application_number, status, submitted_at, expected_completion, sla_deadline, is_demo, citizen_id, notes, form_data, services(name, slug, processing_time_days, sla_days, required_documents), departments(name)",
      )
      .eq(column, data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Application not found.");

    const [{ data: history }, { data: documents }] = await Promise.all([
      supabase
        .from("application_status_history")
        .select("id, status, actor_label, note, created_at")
        .eq("application_id", row.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("application_documents")
        .select(
          "id, document_label, file_name, file_size_bytes, mime_type, verification_status, pipeline, extracted, created_at",
        )
        .eq("application_id", row.id)
        .order("created_at", { ascending: true }),
    ]);

    return {
      ...mapRow(row, userId),
      notes: row.notes,
      processingTimeDays: row.services?.processing_time_days ?? 0,
      slaDays: row.services?.sla_days ?? 0,
      requiredDocuments: row.services?.required_documents ?? [],
      formData: (row.form_data as Record<string, string>) ?? {},
      history: (history ?? []).map((entry) => ({
        id: entry.id,
        status: entry.status,
        actorLabel: entry.actor_label,
        note: entry.note,
        createdAt: entry.created_at,
      })),
      documents: (documents ?? []).map((doc) => ({
        id: doc.id,
        documentLabel: doc.document_label,
        fileName: doc.file_name,
        fileSizeBytes: doc.file_size_bytes,
        mimeType: doc.mime_type,
        verificationStatus: doc.verification_status,
        pipeline: (doc.pipeline as PipelineStage[]) ?? [],
        extracted: (doc.extracted as Record<string, string>) ?? {},
        createdAt: doc.created_at,
      })),
    };
  });

/** Creates or updates a draft application for the multi-step form. */
export const saveApplicationDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid().optional(),
        serviceSlug: z.string().trim().min(2).max(80),
        applicant: applicantSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, department_id")
      .eq("slug", data.serviceSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (serviceError) throw new Error(serviceError.message);
    if (!service) throw new Error("This service is not available.");

    if (data.applicationId) {
      const { data: updated, error } = await supabase
        .from("applications")
        .update({ form_data: data.applicant, updated_at: new Date().toISOString() })
        .eq("id", data.applicationId)
        .eq("citizen_id", userId)
        .select("id, application_number")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!updated) throw new Error("Draft not found.");
      return { applicationId: updated.id, applicationNumber: updated.application_number };
    }

    const applicationNumber = `PUB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`;
    const { data: created, error } = await supabase
      .from("applications")
      .insert({
        application_number: applicationNumber,
        citizen_id: userId,
        service_id: service.id,
        department_id: service.department_id,
        status: "draft",
        form_data: data.applicant,
        notes: "Draft saved — not yet submitted.",
      })
      .select("id, application_number")
      .single();
    if (error) throw new Error(error.message);
    return { applicationId: created.id, applicationNumber: created.application_number };
  });

/** Attaches a document and runs the mock verification pipeline. */
export const uploadApplicationDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        documentLabel: z.string().trim().min(2).max(160),
        fileName: z.string().trim().min(3).max(200),
        mimeType: z.string().trim().max(120),
        fileSizeBytes: z.number().int().min(0).max(MAX_FILE_SIZE_BYTES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!isAcceptedFile(data.fileName, data.mimeType)) {
      throw new Error("Only PDF, JPG, PNG and DOCX files are accepted.");
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, services(required_documents)")
      .eq("id", data.applicationId)
      .eq("citizen_id", userId)
      .maybeSingle();
    if (!application) throw new Error("Application not found.");

    const outcome = await runVerificationPipeline({
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSizeBytes: data.fileSizeBytes,
      expectedDocument: data.documentLabel,
    });

    const { data: inserted, error } = await supabase
      .from("application_documents")
      .insert({
        application_id: data.applicationId,
        citizen_id: userId,
        document_label: data.documentLabel,
        file_name: data.fileName,
        file_size_bytes: data.fileSizeBytes,
        mime_type: data.mimeType || "application/pdf",
        verification_status: outcome.verificationStatus,
        pipeline: outcome.pipeline,
        extracted: outcome.extracted,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { documentId: inserted.id, ...outcome };
  });

export const deleteApplicationDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("application_documents")
      .delete()
      .eq("id", data.documentId)
      .eq("citizen_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Final step of the multi-step form: moves a draft into the official workflow. */
export const submitApplicationDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        declarationAccepted: z.literal(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: application, error: loadError } = await supabase
      .from("applications")
      .select("id, application_number, status, services(name, processing_time_days, sla_days)")
      .eq("id", data.applicationId)
      .eq("citizen_id", userId)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!application) throw new Error("Application not found.");
    if (application.status !== "draft") throw new Error("This application has already been submitted.");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("applications")
      .update({
        status: "submitted",
        submitted_at: now,
        expected_completion: addDays(application.services?.processing_time_days ?? 14),
        sla_deadline: addDays(application.services?.sla_days ?? 21),
        notes: "Awaiting document verification.",
        updated_at: now,
      })
      .eq("id", application.id)
      .eq("citizen_id", userId);
    if (error) throw new Error(error.message);

    await supabase.from("application_status_history").insert({
      application_id: application.id,
      status: "submitted",
      actor_label: "Citizen Portal",
      note: `${application.services?.name ?? "Service"} application submitted online.`,
    });

    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Application submitted",
      body: `${application.application_number} has been submitted and is queued for document verification.`,
      kind: "success",
      application_number: application.application_number,
    });

    return { applicationId: application.id, applicationNumber: application.application_number };
  });
