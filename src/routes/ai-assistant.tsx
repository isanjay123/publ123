import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { PublicaAiChat } from "@/components/ai/PublicaAiChat";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PublicaMark } from "@/components/brand/Logo";
import { ErrorState } from "@/components/states";
import { AI_AUTHORITY_NOTICE } from "@/lib/services/ai";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "Publica AI — Your digital public-service guide" },
      {
        name: "description",
        content:
          "Ask Publica AI which government service you need, which documents to prepare and what your application status means. Officers retain final decision authority.",
      },
      { property: "og:title", content: "Publica AI — Your digital public-service guide" },
      {
        property: "og:description",
        content: "Guidance drawn only from published government service records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl p-8">
      <ErrorState
        title="Publica AI is temporarily unavailable"
        description="You can continue using all standard government services."
      />
    </div>
  ),
  component: AiAssistantPage,
});

function AiAssistantPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card/60">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-10">
            <PublicaMark className="h-10 w-10" />
            <div>
              <h1 className="font-display text-3xl font-semibold">Publica AI</h1>
              <p className="text-muted-foreground">Your digital public-service guide</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-10">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="surface-card flex min-h-[560px] flex-col p-5">
              <PublicaAiChat />
            </div>

            <aside className="space-y-4">
              <div className="surface-card p-5">
                <h2 className="font-display text-lg font-semibold">How an answer is produced</h2>
                <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {[
                    "Your question",
                    "Intent detection",
                    "Knowledge retrieval",
                    "Government rules check",
                    "Answer",
                    "Source references",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="surface-card p-5">
                <p className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {AI_AUTHORITY_NOTICE}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Publica AI does not create laws, fees, deadlines or eligibility rules. When something cannot
                  be confirmed from the published service records it says so, and your applications continue
                  to work normally.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
