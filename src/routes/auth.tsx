import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { PublicaLogo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const searchSchema = z.object({
  mode: z.enum(["login", "register", "forgot"]).catch("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Publica" },
      {
        name: "description",
        content:
          "Sign in or create a Publica citizen account to apply for government services and track every application.",
      },
      { property: "og:title", content: "Sign in — Publica" },
      {
        property: "og:description",
        content: "Secure access to your Publica citizen account.",
      },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  function setMode(next: "login" | "register" | "forgot") {
    setNotice(null);
    navigate({ to: "/auth", search: { mode: next } });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);

    if (mode === "forgot") {
      const parsed = z.string().email().safeParse(email.trim());
      if (!parsed.success) {
        toast.error("Enter a valid email address.");
        return;
      }
      setPending(true);
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setPending(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setNotice("If that address has a Publica account, a password-reset link is on its way.");
      return;
    }

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setPending(true);
    if (mode === "register") {
      if (fullName.trim().length < 2) {
        setPending(false);
        toast.error("Enter your full name.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName.trim() },
        },
      });
      setPending(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        return;
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
    }
  }

  async function signInWithGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in is unavailable right now.");
      return;
    }
  }

  const heading =
    mode === "register" ? "Create your citizen account" : mode === "forgot" ? "Reset your password" : "Sign in to Publica";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hero-surface hidden flex-col justify-between p-12 lg:flex">
        <PublicaLogo className="text-white" />
        <div>
          <h2 className="font-display text-3xl font-semibold text-white">
            Transparent Governance. Accountable Services.
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            One secure account for every department: apply, upload documents, track progress and see who
            acted on your case.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-white/70">
            <li>Roles: Citizen · Government Officer · Department Admin · Oversight Authority · Super Admin</li>
            <li>Session handling and access rules are enforced on the server, not in the browser.</li>
          </ul>
        </div>
        <p className="text-xs text-white/50">Demonstration platform with fictional records.</p>
      </aside>

      <main className="flex flex-col bg-background">
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="lg:hidden">
            <PublicaLogo />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <h1 className="font-display text-2xl font-semibold">{heading}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "forgot"
                ? "We'll email you a secure link to choose a new password."
                : "Your credentials are verified by the platform's authentication service."}
            </p>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              {mode === "register" ? (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {mode === "forgot" ? null : (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    minLength={8}
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </Button>
            </form>

            {notice ? (
              <p className="mt-4 rounded-lg border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
                {notice}
              </p>
            ) : null}

            {mode === "forgot" ? null : (
              <>
                <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button variant="outline" className="w-full" onClick={signInWithGoogle} type="button">
                  Continue with Google
                </Button>
              </>
            )}

            <div className="mt-8 space-y-2 text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  <p>
                    New to Publica?{" "}
                    <button className="font-medium text-foreground underline" onClick={() => setMode("register")}>
                      Create an account
                    </button>
                  </p>
                  <p>
                    Forgotten your password?{" "}
                    <button className="font-medium text-foreground underline" onClick={() => setMode("forgot")}>
                      Reset it
                    </button>
                  </p>
                </>
              ) : (
                <p>
                  Already registered?{" "}
                  <button className="font-medium text-foreground underline" onClick={() => setMode("login")}>
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
