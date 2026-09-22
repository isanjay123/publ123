export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "document_verification"
  | "officer_review"
  | "under_review"
  | "documents_required"
  | "verified"
  | "approved"
  | "rejected"
  | "completed";

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  document_verification: "Document Verification",
  officer_review: "Officer Review",
  under_review: "Officer Review",
  documents_required: "Additional Information Required",
  verified: "Department Approval",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Semantic tone classes, all drawn from the Publica design tokens. */
export function statusTone(status: string) {
  switch (status) {
    case "draft":
      return "text-muted-foreground";
    case "documents_required":
    case "rejected":
      return "text-destructive";
    case "approved":
    case "completed":
      return "text-success";
    case "verified":
      return "text-success";
    default:
      return "text-primary";
  }
}

export const ACTIVE_STATUSES = [
  "submitted",
  "document_verification",
  "officer_review",
  "under_review",
  "documents_required",
  "verified",
];

/** Ordered stages shown on the tracking timeline. */
export const TRACKING_STAGES = [
  { key: "submitted", label: "Application Submitted" },
  { key: "document_verification", label: "Document Verification" },
  { key: "officer_review", label: "Officer Review" },
  { key: "verified", label: "Department Approval" },
  { key: "approved", label: "Certificate Generation" },
  { key: "completed", label: "Completed" },
] as const;

export function stageIndexForStatus(status: string) {
  switch (status) {
    case "draft":
      return -1;
    case "submitted":
    case "documents_required":
      return 0;
    case "document_verification":
      return 1;
    case "officer_review":
    case "under_review":
      return 2;
    case "verified":
      return 3;
    case "approved":
      return 4;
    case "completed":
      return 5;
    case "rejected":
      return 2;
    default:
      return 0;
  }
}

export type SlaState = { label: string; tone: string; daysLeft: number | null };

export function slaState(slaDeadline: string | null, status: string): SlaState {
  if (status === "completed" || status === "approved") {
    return { label: "Closed within commitment", tone: "text-success", daysLeft: null };
  }
  if (!slaDeadline) return { label: "No deadline set", tone: "text-muted-foreground", daysLeft: null };
  const days = Math.ceil((new Date(slaDeadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Overdue by ${Math.abs(days)} days`, tone: "text-destructive", daysLeft: days };
  if (days <= 3) return { label: `Due in ${days} days`, tone: "text-warning", daysLeft: days };
  return { label: `${days} days remaining`, tone: "text-muted-foreground", daysLeft: days };
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function processingDays(submittedAt: string | null) {
  if (!submittedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
}
