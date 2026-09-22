export type AssistantSuggestion = {
  serviceSlug: string;
  serviceName: string;
  department: string;
  reason: string;
};

export type AssistantReply = {
  answer: string;
  suggestions: AssistantSuggestion[];
  provider: "mock" | "gateway";
};

export type ServiceHint = {
  slug: string;
  name: string;
  description: string;
  department: string;
  keywords: string[];
};

export interface AiAssistantService {
  ask(question: string, catalog: ServiceHint[]): Promise<AssistantReply>;
}

function score(question: string, hint: ServiceHint) {
  const q = question.toLowerCase();
  const terms = [hint.name, hint.department, ...hint.keywords].map((t) => t.toLowerCase());
  return terms.reduce((total, term) => {
    const head = term.split(" ")[0] ?? term;
    return total + (q.includes(term) ? 3 : q.includes(head) ? 1 : 0);
  }, 0);
}

/** Deterministic rules-based assistant used until an AI provider is configured. */
export const mockAiAssistant: AiAssistantService = {
  async ask(question, catalog) {
    const ranked = catalog
      .map((hint) => ({ hint, value: score(question, hint) }))
      .sort((a, b) => b.value - a.value)
      .filter((entry) => entry.value > 0)
      .slice(0, 3);

    const suggestions = (ranked.length ? ranked : catalog.slice(0, 3).map((hint) => ({ hint, value: 0 }))).map(
      ({ hint }) => ({
        serviceSlug: hint.slug,
        serviceName: hint.name,
        department: hint.department,
        reason: hint.description,
      }),
    );

    const answer = ranked.length
      ? `Based on your request, the closest match is ${suggestions[0]!.serviceName}, handled by the ${suggestions[0]!.department}. Review the required documents, then start your application — every step is timestamped and visible to you.`
      : `I couldn't match that to a specific service yet. Here are the most requested services; you can also raise a grievance if none of these apply.`;

    return { answer, suggestions, provider: "mock" };
  },
};

export function getAiAssistant(): AiAssistantService {
  // A gateway-backed implementation can be selected here via server-side
  // environment variables; the mock keeps the product usable meanwhile.
  return mockAiAssistant;
}
