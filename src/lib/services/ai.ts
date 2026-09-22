export type AssistantSuggestion = {
  serviceSlug: string;
  serviceName: string;
  department: string;
  reason: string;
};

export type AssistantSource = {
  label: string;
  detail: string;
};

export type AssistantIntent =
  | "apply_for_service"
  | "required_documents"
  | "application_status"
  | "grievance"
  | "processing_time"
  | "fees"
  | "unknown";

export type AssistantReply = {
  answer: string;
  intent: AssistantIntent;
  verified: boolean;
  suggestions: AssistantSuggestion[];
  sources: AssistantSource[];
  provider: "mock" | "gateway";
};

export type ServiceHint = {
  slug: string;
  name: string;
  description: string;
  department: string;
  keywords: string[];
  processingTimeDays?: number;
  slaDays?: number;
  feeCents?: number;
  requiredDocuments?: string[];
};

export interface AiAssistantService {
  ask(question: string, catalog: ServiceHint[]): Promise<AssistantReply>;
}

/** Shown with every reply — officers, not the assistant, decide outcomes. */
export const AI_AUTHORITY_NOTICE =
  "AI provides guidance and decision support. Authorized officers retain final decision authority.";

/** Used whenever the published sources do not contain the answer. */
export const AI_UNVERIFIED_MESSAGE =
  "I couldn't verify this information from the available government sources.";

export const AI_SUGGESTED_QUESTIONS = [
  "How do I apply for a birth certificate?",
  "What documents do I need?",
  "Why is my application pending?",
  "How do I submit a grievance?",
];

function score(question: string, hint: ServiceHint) {
  const q = question.toLowerCase();
  const terms = [hint.name, hint.department, ...hint.keywords].map((t) => t.toLowerCase());
  return terms.reduce((total, term) => {
    const head = term.split(" ")[0] ?? term;
    return total + (q.includes(term) ? 3 : q.includes(head) ? 1 : 0);
  }, 0);
}

/** Step 2 of the pipeline: intent detection over the citizen's question. */
export function detectIntent(question: string): AssistantIntent {
  const q = question.toLowerCase();
  if (/(grievance|complaint|escalat|appeal)/.test(q)) return "grievance";
  if (/(document|paper|proof|attach|upload)/.test(q)) return "required_documents";
  if (/(pending|status|delay|track|how long is my|why is my)/.test(q)) return "application_status";
  if (/(how long|processing time|days|deadline|when will)/.test(q)) return "processing_time";
  if (/(fee|cost|charge|price|payment)/.test(q)) return "fees";
  if (/(apply|application|register|request|need|get|obtain)/.test(q)) return "apply_for_service";
  return "unknown";
}

function money(feeCents?: number) {
  if (feeCents === undefined) return null;
  return feeCents === 0 ? "no published fee" : `a published fee of ${(feeCents / 100).toFixed(0)} fee units`;
}

/**
 * Deterministic, rules-based assistant used while no LLM provider is configured.
 * It only restates facts held in the published service catalogue — it never
 * invents laws, fees, deadlines or eligibility rules.
 */
export const mockAiAssistant: AiAssistantService = {
  async ask(question, catalog) {
    const intent = detectIntent(question);
    const ranked = catalog
      .map((hint) => ({ hint, value: score(question, hint) }))
      .sort((a, b) => b.value - a.value)
      .filter((entry) => entry.value > 0)
      .slice(0, 3);

    const best = ranked[0]?.hint ?? null;
    const suggestions = (ranked.length ? ranked : catalog.slice(0, 3).map((hint) => ({ hint, value: 0 }))).map(
      ({ hint }) => ({
        serviceSlug: hint.slug,
        serviceName: hint.name,
        department: hint.department,
        reason: hint.description,
      }),
    );

    const sources: AssistantSource[] = [
      { label: "Publica service catalogue", detail: "Published service records maintained by each department" },
    ];
    if (best) {
      sources.push({
        label: `${best.name} — service record`,
        detail: `${best.department} · published processing window and document list`,
      });
    }

    let answer = AI_UNVERIFIED_MESSAGE;
    let verified = false;

    if (intent === "grievance") {
      answer =
        "You can raise a grievance from the Transparency page, or from any application you are tracking. Each grievance receives a reference number and is routed to the responsible department, and you can follow its progress in your notifications.";
      verified = true;
      sources.push({ label: "Publica grievance process", detail: "Transparency page — grievances and escalation" });
    } else if (best && intent === "required_documents" && best.requiredDocuments?.length) {
      answer = `For ${best.name} (${best.department}), the published document list is: ${best.requiredDocuments.join(", ")}. Upload each one in the Documents step and Publica will check the format and readability before an officer reviews it.`;
      verified = true;
    } else if (best && intent === "processing_time" && best.processingTimeDays) {
      answer = `${best.name} has a published processing window of about ${best.processingTimeDays} working days, with a service commitment of ${best.slaDays ?? best.processingTimeDays} days at the ${best.department}. Your own application page shows the exact expected completion and commitment dates.`;
      verified = true;
    } else if (best && intent === "fees") {
      const fee = money(best.feeCents);
      if (fee) {
        answer = `${best.name} carries ${fee} in the published catalogue. Any amount not shown in the catalogue cannot be confirmed here — ${AI_UNVERIFIED_MESSAGE}`;
        verified = true;
      }
    } else if (intent === "application_status") {
      answer =
        "I can't see the internal decision notes, but your application page shows every recorded step, the responsible department, the current processing time and the service commitment deadline. If a step is marked “Additional Information Required”, upload the requested document to move it forward.";
      verified = true;
      sources.push({ label: "Your application timeline", detail: "Recorded status history for your application" });
    } else if (best && (intent === "apply_for_service" || intent === "unknown")) {
      answer = `The closest published match is ${best.name}, handled by the ${best.department}. ${
        best.requiredDocuments?.length ? `Required documents: ${best.requiredDocuments.join(", ")}. ` : ""
      }Start the application from the service catalogue — every step is timestamped and visible to you.`;
      verified = true;
    }

    return { answer, intent, verified, suggestions, sources, provider: "mock" };
  },
};

/**
 * Provider selection point. When an AI gateway is configured server-side we
 * swap the implementation here; until then the deterministic service is used so
 * the citizen workflows never depend on an external API.
 */
export function getAiAssistant(): AiAssistantService {
  return mockAiAssistant;
}
