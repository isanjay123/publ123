import { getOcrService } from "./ocr";

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export type PipelineStage = {
  key: string;
  label: string;
  status: "passed" | "attention";
  detail: string;
};

export type VerificationOutcome = {
  verificationStatus: "verified" | "attention";
  pipeline: PipelineStage[];
  extracted: Record<string, string>;
  checks: { tone: "ok" | "warn"; message: string }[];
};

export function extensionOf(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index).toLowerCase();
}

export function isAcceptedFile(fileName: string, mimeType: string) {
  return ACCEPTED_EXTENSIONS.includes(extensionOf(fileName)) || ACCEPTED_MIME_TYPES.includes(mimeType);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Mock document verification pipeline: Upload → Security Validation → OCR →
 * Classification → Information Extraction → Rule Validation → Verification.
 * Deterministic, so the workflow runs without any external OCR provider.
 */
export async function runVerificationPipeline(input: {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  expectedDocument: string;
}): Promise<VerificationOutcome> {
  const ocr = await getOcrService().extract({
    fileName: input.fileName,
    expectedDocument: input.expectedDocument,
  });

  const ext = extensionOf(input.fileName);
  const scannedImage = ext === ".jpg" || ext === ".jpeg" || ext === ".png";
  const tiny = input.fileSizeBytes > 0 && input.fileSizeBytes < 60 * 1024;
  const needsReview = tiny || (scannedImage && ocr.confidence < 0.95);

  const pipeline: PipelineStage[] = [
    { key: "upload", label: "Upload", status: "passed", detail: `${input.fileName} received` },
    {
      key: "security",
      label: "Security validation",
      status: "passed",
      detail: "No executable content, accepted file type",
    },
    {
      key: "ocr",
      label: "Text recognition (OCR)",
      status: "passed",
      detail: `Text layer read with ${(ocr.confidence * 100).toFixed(0)}% confidence`,
    },
    {
      key: "classification",
      label: "Document classification",
      status: "passed",
      detail: `Classified as: ${input.expectedDocument}`,
    },
    {
      key: "extraction",
      label: "Information extraction",
      status: "passed",
      detail: "Holder name, document number and issue date located",
    },
    {
      key: "rules",
      label: "Rule validation",
      status: needsReview ? "attention" : "passed",
      detail: needsReview
        ? "Scan quality is low — an officer will confirm the details manually"
        : "Matches the document rules published for this service",
    },
    {
      key: "verification",
      label: "Verification",
      status: needsReview ? "attention" : "passed",
      detail: needsReview ? "Additional verification required" : "Document accepted for officer review",
    },
  ];

  const checks: VerificationOutcome["checks"] = [
    { tone: "ok", message: "Document detected" },
    { tone: "ok", message: "Required information found" },
    { tone: "ok", message: "Format valid" },
  ];
  if (needsReview) checks.push({ tone: "warn", message: "Additional verification required" });

  return {
    verificationStatus: needsReview ? "attention" : "verified",
    pipeline,
    extracted: Object.fromEntries(Object.entries(ocr.fields).map(([k, v]) => [k, String(v)])),
    checks,
  };
}
