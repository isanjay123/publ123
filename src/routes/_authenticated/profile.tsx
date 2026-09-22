import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCitizenDashboard, updateCitizenProfile } from "@/lib/citizen.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Publica" },
      {
        name: "description",
        content: "Manage your Publica citizen profile: name, contact details, language and role access.",
      },
      { property: "og:title", content: "Your Profile — Publica" },
      { property: "og:description", content: "Manage your Publica citizen profile and language preference." },
    ],
  }),
  component: ProfilePage,
});

const LOCALES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "ta", label: "தமிழ்" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
] as const;

function ProfilePage() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["citizen-dashboard"], queryFn: () => getCitizenDashboard() });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState<"en" | "hi" | "ta" | "fr" | "es">("en");

  useEffect(() => {
    if (!dashboard.data) return;
    setFullName(dashboard.data.profile.fullName);
    setPhone(dashboard.data.profile.phone ?? "");
    setLocale((dashboard.data.profile.locale as typeof locale) ?? "en");
  }, [dashboard.data]);

  const save = useMutation({
    mutationFn: () => updateCitizenProfile({ data: { fullName, phone, locale } }),
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["citizen-dashboard"] });
    },
    onError: () => toast.error("We couldn't save your profile. Please check the details."),
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Your profile</h1>
        <p className="mt-2 text-muted-foreground">
          These details are reused across applications so you don't re-enter them for every department.
        </p>

        {dashboard.isLoading ? <LoadingState /> : null}
        {dashboard.isError ? <ErrorState onRetry={() => dashboard.refetch()} /> : null}

        {dashboard.data ? (
          <>
            <section className="surface-card mt-8 p-6">
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (fullName.trim().length < 2) {
                    toast.error("Enter your full name.");
                    return;
                  }
                  save.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" value={dashboard.data.profile.email ?? ""} disabled />
                  <p className="text-xs text-muted-foreground">
                    Your email is managed by the sign-in service and cannot be edited here.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Optional"
                    maxLength={24}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locale">Preferred language</Label>
                  <select
                    id="locale"
                    value={locale}
                    onChange={(event) => setLocale(event.target.value as typeof locale)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {LOCALES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save changes
                </Button>
              </form>
            </section>

            <section className="surface-card mt-6 p-6">
              <h2 className="font-display text-lg font-semibold">Access & roles</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Publica separates access into Citizen, Government Officer, Department Admin, Oversight
                Authority and Super Admin. Roles are stored separately from your profile and checked on the
                server for every request.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {dashboard.data.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="font-normal capitalize">
                    {role.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
