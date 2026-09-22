import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileUp, Loader2, ShieldAlert, Trash2, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteApplicationDocument,
  saveApplicationDraft,
  submitApplicationDraft,
  uploadApplicationDocument,
} from "@/lib/applications.functions";
import { getServiceCatalog } from "@/lib/catalog.functions";
import { getCitizenDashboard } from "@/lib/citizen.functions";
import {
  ACCEPTED_EXTENSIONS,
  formatFileSize,
  isAcceptedFile,
  MAX_FILE_SIZE_BYTES,
  type PipelineStage,
} from "@/lib/services/documents";

export const Route = createFileRoute("/_authenticated/apply/$serviceSlug")({
  head: () => ({
    meta: [
      { title: "Start an application — Publica" },
      {
        name: "description",
        content:
          "Complete a Publica application in five steps: applicant information, service details, documents, review and submit.",
      },
      { property: "og:title", content: "Start an application — Publica" },
      { property: "og:description", content: "A guided, transparent government application form." },
    ],
  }),
  component: ApplyPage,
});

const STEPS = [
  "Applicant information",
  "Service details",
  "Documents",
  "Review",
  "Submit",
] as const;

type UploadedDocument = {
  id: string;
  label: string;
  fileName: string;
  fileSizeBytes: number;
  verificationStatus: "verified" | "attention";
  pipeline: PipelineStage[];
  checks: { tone: "ok" | "warn"; message: string }[];
};

function ApplyPage() {
  const { serviceSlug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const catalog = useQuery({ queryKey: ["service-catalog"], queryFn: () => getServiceCatalog() });
  const dashboard = useQuery({ queryKey: ["citizen-dashboard"], queryFn: () => getCitizenDashboard() });

  const service = catalog.data?.find((entry) => entry.slug === serviceSlug);

  const [step, setStep] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationNumber, setApplicationNumber] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState<{ label: string; fileName: string; progress: number } | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [declaration, setDeclaration] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const pendingLabel = useRef<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    purpose: "",
    preferredDelivery: "digital" as "digital" | "collection" | "post",
  });

  useEffect(() => {
    const profile = dashboard.data?.profile;
    if (!profile) return;
    setForm((current) =>
      current.fullName
        ? current
        : {
            ...current,
            fullName: profile.fullName ?? "",
            email: profile.email ?? "",
            phone: profile.phone ?? "",
          },
    );
  }, [dashboard.data]);

  const saveDraft = useMutation({
    mutationFn: () =>
      saveApplicationDraft({
        data: {
          ...(applicationId ? { applicationId } : {}),
          serviceSlug,
          applicant: form,
        },
      }),
    onSuccess: (result) => {
      setApplicationId(result.applicationId);
      setApplicationNumber(result.applicationNumber);
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => toast.error("We couldn't save this draft. Please check the form and try again."),
  });

  const upload = useMutation({
    mutationFn: (input: {
      documentLabel: string;
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
    }) => uploadApplicationDocument({ data: { applicationId: applicationId!, ...input } }),
  });

  const removeDocument = useMutation({
    mutationFn: (documentId: string) => deleteApplicationDocument({ data: { documentId } }),
    onSuccess: (_result, documentId) => {
      setDocuments((current) => current.filter((doc) => doc.id !== documentId));
    },
    onError: () => toast.error("We couldn't remove that document."),
  });

  const submit = useMutation({
    mutationFn: () =>
      submitApplicationDraft({ data: { applicationId: applicationId!, declarationAccepted: true } }),
    onSuccess: (result) => {
      toast.success(`Application ${result.applicationNumber} submitted`);
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["citizen-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      navigate({ to: "/applications/$id", params: { id: result.applicationId } });
    },
    onError: () => toast.error("We couldn't submit this application. Please try again."),
  });

  if (catalog.isLoading || dashboard.isLoading) {
    return (
      <Shell>
        <LoadingState label="Preparing the application form…" />
      </Shell>
    );
  }

  if (catalog.isError) {
    return (
      <Shell>
        <ErrorState
          title="We couldn't load this service"
          description="Check your connection and try again."
          onRetry={() => catalog.refetch()}
        />
      </Shell>
    );
  }

  if (!service) {
    return (
      <Shell>
        <EmptyState
          title="Service not found"
          description="This service is not currently available."
          action={
            <Button asChild size="sm">
              <Link to="/services">Back to catalogue</Link>
            </Button>
          }
        />
      </Shell>
    );
  }

  function validateStepOne() {
    if (form.fullName.trim().length < 2) {
      toast.error("Please enter the applicant's full name.");
      return false;
    }
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    return true;
  }

  async function goNext() {
    if (step === 0) {
      if (!validateStepOne()) return;
      await saveDraft.mutateAsync();
      setStep(1);
      return;
    }
    if (step === 1) {
      await saveDraft.mutateAsync();
      setStep(2);
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function pickFile(label: string) {
    pendingLabel.current = label;
    setUploadError(null);
    fileInput.current?.click();
  }

  async function handleFile(file: File) {
    const label = pendingLabel.current ?? service!.requiredDocuments[0] ?? "Supporting document";
    if (!isAcceptedFile(file.name, file.type)) {
      setUploadError(`${file.name} was not accepted. Use PDF, JPG, PNG or DOCX.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`${file.name} is larger than ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`);
      return;
    }

    setUploading({ label, fileName: file.name, progress: 8 });
    const timer = window.setInterval(() => {
      setUploading((current) =>
        current ? { ...current, progress: Math.min(95, current.progress + 11) } : current,
      );
    }, 90);

    try {
      const result = await upload.mutateAsync({
        documentLabel: label,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        fileSizeBytes: file.size,
      });
      setUploading((current) => (current ? { ...current, progress: 100 } : current));
      setDocuments((current) => [
        ...current.filter((doc) => doc.label !== label),
        {
          id: result.documentId,
          label,
          fileName: file.name,
          fileSizeBytes: file.size,
          verificationStatus: result.verificationStatus,
          pipeline: result.pipeline,
          checks: result.checks,
        },
      ]);
    } catch {
      setUploadError(
        `${file.name} could not be verified. The upload failed — you can retry, or continue and submit it later.`,
      );
    } finally {
      window.clearInterval(timer);
      window.setTimeout(() => setUploading(null), 350);
    }
  }

  const missingDocuments = service.requiredDocuments.filter(
    (label) => !documents.some((doc) => doc.label === label),
  );

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{service.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {service.department.name} · approx. {service.processingTimeDays} working days
          </p>
        </div>
        {applicationNumber ? (
          <Badge variant="secondary" className="font-normal">
            Draft {applicationNumber}
          </Badge>
        ) : null}
      </div>

      <ol className="mt-6 grid gap-2 sm:grid-cols-5">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-lg border px-3 py-2 text-xs ${
              index === step
                ? "border-primary bg-primary/10 text-primary"
                : index < step
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border text-muted-foreground"
            }`}
          >
            <span className="font-medium">Step {index + 1}</span>
            <span className="block">{label}</span>
          </li>
        ))}
      </ol>

      <div className="surface-card mt-6 p-6">
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                placeholder="As printed on your identity document"
              />
            </Field>
            <Field label="Email address">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Phone number">
              <Input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <Field label="Residential address">
              <Textarea
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                rows={3}
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">{service.name}</p>
              <p className="mt-1 text-muted-foreground">{service.description}</p>
              <p className="mt-2 text-muted-foreground">
                Service commitment: {service.slaDays} days · Fee:{" "}
                {service.feeCents === 0
                  ? "no published fee"
                  : `${(service.feeCents / 100).toFixed(0)} fee units`}
              </p>
            </div>
            <Field label="Why do you need this service?">
              <Textarea
                value={form.purpose}
                onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                rows={4}
                placeholder="For example: required for school admission"
              />
            </Field>
            <Field label="How would you like to receive the outcome?">
              <Select
                value={form.preferredDelivery}
                onValueChange={(value) =>
                  setForm({ ...form, preferredDelivery: value as typeof form.preferredDelivery })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="digital">Digital copy in Publica</SelectItem>
                  <SelectItem value="collection">Collect from the department office</SelectItem>
                  <SelectItem value="post">By post</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="text-sm text-muted-foreground">
              Accepted formats: {ACCEPTED_EXTENSIONS.join(", ")} · up to{" "}
              {formatFileSize(MAX_FILE_SIZE_BYTES)} per file. Each upload is checked for security, read with
              text recognition, classified and validated against the rules published for this service.
            </p>

            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleFile(file);
              }}
            />

            {uploadError ? (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {uploadError}
              </p>
            ) : null}

            <ul className="mt-5 space-y-4">
              {service.requiredDocuments.map((label) => {
                const uploaded = documents.find((doc) => doc.label === label);
                const active = uploading?.label === label;
                return (
                  <li key={label} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{label}</p>
                        {uploaded ? (
                          <p className="text-xs text-muted-foreground">
                            {uploaded.fileName} · {formatFileSize(uploaded.fileSizeBytes)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No file attached yet</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {uploaded ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument.mutate(uploaded.id)}
                            disabled={removeDocument.isPending}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                          </Button>
                        ) : null}
                        <Button
                          variant={uploaded ? "outline" : "default"}
                          size="sm"
                          onClick={() => pickFile(label)}
                          disabled={Boolean(uploading)}
                        >
                          {active ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <FileUp className="mr-1.5 h-4 w-4" />
                          )}
                          {uploaded ? "Replace" : "Upload"}
                        </Button>
                      </div>
                    </div>

                    {active ? (
                      <div className="mt-3">
                        <Progress value={uploading!.progress} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Uploading {uploading!.fileName} — {uploading!.progress}%
                        </p>
                      </div>
                    ) : null}

                    {uploaded ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <ol className="space-y-1.5">
                          {uploaded.pipeline.map((stage) => (
                            <li key={stage.key} className="flex items-start gap-2 text-xs">
                              {stage.status === "passed" ? (
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                              ) : (
                                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                              )}
                              <span>
                                <span className="font-medium">{stage.label}</span>
                                <span className="block text-muted-foreground">{stage.detail}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                        <ul className="space-y-1.5 text-sm">
                          {uploaded.checks.map((check) => (
                            <li
                              key={check.message}
                              className={check.tone === "ok" ? "text-success" : "text-warning"}
                            >
                              {check.tone === "ok" ? "✓" : "⚠"} {check.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {missingDocuments.length ? (
              <p className="mt-4 text-xs text-muted-foreground">
                {missingDocuments.length} document{missingDocuments.length === 1 ? "" : "s"} still to attach.
                You can continue and add them later — an officer may request them before verification.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <Summary title="Applicant information">
              <SummaryRow label="Full name" value={form.fullName} />
              <SummaryRow label="Email" value={form.email || "—"} />
              <SummaryRow label="Phone" value={form.phone || "—"} />
              <SummaryRow label="Address" value={form.address || "—"} />
            </Summary>
            <Summary title="Service details">
              <SummaryRow label="Service" value={service.name} />
              <SummaryRow label="Department" value={service.department.name} />
              <SummaryRow label="Purpose" value={form.purpose || "—"} />
              <SummaryRow label="Outcome delivery" value={form.preferredDelivery} />
            </Summary>
            <Summary title="Documents">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents attached.</p>
              ) : (
                documents.map((doc) => (
                  <SummaryRow
                    key={doc.id}
                    label={doc.label}
                    value={`${doc.fileName} · ${
                      doc.verificationStatus === "verified" ? "Verified" : "Additional verification required"
                    }`}
                  />
                ))
              )}
            </Summary>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Submitting records this application against your account, assigns it to the{" "}
              {service.department.name} and starts the published service commitment clock.
            </p>
            <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
              <Checkbox
                checked={declaration}
                onCheckedChange={(checked) => setDeclaration(checked === true)}
              />
              <span>
                I confirm the information and documents provided are accurate to the best of my knowledge, and
                I understand that authorized officers make the final decision on this application.
              </span>
            </label>
            <Button
              size="lg"
              disabled={!declaration || !applicationId || submit.isPending}
              onClick={() => submit.mutate()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {submit.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            variant="ghost"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            {step <= 2 ? (
              <Button
                variant="outline"
                onClick={() => {
                  if (!validateStepOne()) return;
                  saveDraft.mutate(undefined, {
                    onSuccess: () => toast.success("Draft saved — you can finish it later."),
                  });
                }}
                disabled={saveDraft.isPending}
              >
                Save draft
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => void goNext()} disabled={saveDraft.isPending}>
                Continue
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Summary({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="font-medium">{title}</p>
      <dl className="mt-3 space-y-1.5">{children}</dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right">{value}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
