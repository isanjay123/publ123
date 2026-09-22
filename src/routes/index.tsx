import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bot,
  ClipboardList,
  Fingerprint,
  Globe2,
  LineChart,
  Lock,
  ScanText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ProcessFlow } from "@/components/ProcessFlow";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Publica — Transparent Governance. Accountable Services." },
      {
        name: "description",
        content:
          "Publica is a secure digital government-services platform: discover services, apply online, track every step and reach an AI assistant.",
      },
      { property: "og:title", content: "Publica — Transparent Governance. Accountable Services." },
      {
        property: "og:description",
        content:
          "Access public services, track every step, and interact with government through one secure digital platform.",
      },
    ],
  }),
  component: LandingPage,
});

const HOW_IT_WORKS = [
  {
    icon: ClipboardList,
    title: "Find the right service",
    body: "Search the catalogue or describe your need in plain language — Publica points you to the correct department and document list.",
  },
  {
    icon: Fingerprint,
    title: "Apply with verified identity",
    body: "Sign in once, reuse your verified profile, and submit applications without repeating paperwork across departments.",
  },
  {
    icon: LineChart,
    title: "Track until delivery",
    body: "Each application carries a service-level deadline, a current status and a full history of who acted and when.",
  },
];

const CAPABILITIES = [
  {
    icon: Sparkles,
    title: "AI-Powered Services",
    body: "The Publica assistant interprets everyday requests, recommends the matching service and lists exactly what you need to submit.",
  },
  {
    icon: ScanText,
    title: "Transparent Processing",
    body: "Published processing windows, live status and clear reasons whenever a document is returned for correction.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Audit Trail",
    body: "Every status change is written to an append-only history table with the acting role, timestamp and note attached.",
  },
  {
    icon: BadgeCheck,
    title: "Public Transparency",
    body: "Department performance against service-level commitments is summarised for the public, not just for administrators.",
  },
  {
    icon: Globe2,
    title: "Multilingual Access",
    body: "Language preference is part of the citizen profile, so notifications and interfaces follow the citizen's choice.",
  },
  {
    icon: Lock,
    title: "Role-Based Access",
    body: "Citizens, officers, department admins, oversight authorities and super admins each see only what their role permits.",
  },
];

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="hero-surface relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                Digital government services
              </span>
              <h1 className="mt-6 font-display text-5xl font-semibold tracking-[0.12em] text-white sm:text-6xl">
                PUBLICA
              </h1>
              <p className="mt-4 font-display text-xl text-white/90 sm:text-2xl">
                “Transparent Governance. Accountable Services.”
              </p>
              <p className="mt-5 max-w-xl text-base text-white/70">
                Access public services, track every step, and interact with government through one secure
                digital platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/services">Explore Services</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/services" hash="publica-ai">
                    <Bot className="mr-2 h-4 w-4" />
                    Talk to Publica AI
                  </Link>
                </Button>
              </div>
            </div>
            <ProcessFlow />
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <h2 className="font-display text-3xl font-semibold">How Publica Works</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            One account, one queue, one record of truth for every interaction between a citizen and a
            department.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, index) => (
              <article key={item.title} className="surface-card p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-primary/10 p-2 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
            <div className="accent-rule h-1 w-16 rounded-full" />
            <h2 className="mt-5 font-display text-3xl font-semibold">Built for accountability</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((item) => (
                <article key={item.title} className="surface-card p-6">
                  <span className="inline-flex rounded-lg bg-accent/10 p-2 text-accent">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <div className="surface-card flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">Start your first application</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Create a citizen account to submit applications, upload documents and follow each decision
                as it happens.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "register" }}>
                  Create citizen account
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/services">Browse the catalogue</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
