import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { LOCALES, useI18n, type LocaleCode } from "@/lib/i18n";
import {
  getProfileSettings,
  updateProfileSettings,
  type NotificationPreferences,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Publica" },
      {
        name: "description",
        content:
          "Manage your Publica citizen profile: personal information, preferred language, notification preferences and account security.",
      },
      { property: "og:title", content: "Your Profile — Publica" },
      {
        property: "og:description",
        content: "Personal information, language, notifications and security in one place.",
      },
    ],
  }),
  component: ProfilePage,
});

const MFA_METHODS = [
  { value: "authenticator_app", label: "Authenticator app (recommended)" },
  { value: "sms", label: "SMS code" },
  { value: "email", label: "Email code" },
] as const;

function ProfilePage() {
  const queryClient = useQueryClient();
  const { setLocale } = useI18n();
  const settings = useQuery({ queryKey: ["profile-settings"], queryFn: () => getProfileSettings() });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [locale, setLocaleValue] = useState<LocaleCode>("en");
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    inApp: true,
    email: true,
    sms: false,
    slaAlerts: true,
  });
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<"authenticator_app" | "sms" | "email">("authenticator_app");

  useEffect(() => {
    const data = settings.data;
    if (!data) return;
    setFullName(data.fullName);
    setPhone(data.phone ?? "");
    setAddress(data.address ?? "");
    setLocaleValue((data.locale as LocaleCode) ?? "en");
    setPrefs(data.notificationPrefs);
    setMfaEnabled(data.mfaEnabled);
    if (data.mfaMethod) setMfaMethod(data.mfaMethod as typeof mfaMethod);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      updateProfileSettings({
        data: {
          fullName,
          phone,
          address,
          locale,
          notificationPrefs: prefs,
          mfaEnabled,
          mfaMethod: mfaEnabled ? mfaMethod : null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated.");
      setLocale(locale);
      void queryClient.invalidateQueries({ queryKey: ["profile-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["citizen-dashboard"] });
    },
    onError: () => toast.error("We couldn't save your profile. Please check the details."),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      const email = settings.data?.email;
      if (!email) throw new Error("No email on file");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Password reset link sent to your email."),
    onError: () => toast.error("We couldn't send a reset link right now."),
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Your profile</h1>
        <p className="mt-2 text-muted-foreground">
          These details are reused across applications so you don't re-enter them for every department.
        </p>

        {settings.isLoading ? <LoadingState /> : null}
        {settings.isError ? (
          <ErrorState
            title="We couldn't load your profile"
            description="Check your connection and try again."
            onRetry={() => settings.refetch()}
          />
        ) : null}

        {settings.data ? (
          <form
            className="mt-8 space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (fullName.trim().length < 2) {
                toast.error("Enter your full name.");
                return;
              }
              save.mutate();
            }}
          >
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Personal information</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  <Input id="email" value={settings.data.email ?? ""} disabled />
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Residential address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    rows={3}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Your email is managed by the sign-in service and cannot be edited here.
              </p>
            </section>

            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Preferred language</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Publica's interface follows this choice wherever a translation is available.
              </p>
              <div className="mt-4 max-w-sm">
                <Select value={locale} onValueChange={(value) => setLocaleValue(value as LocaleCode)}>
                  <SelectTrigger aria-label="Preferred language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.label}
                        {option.code === "en" ? "" : ` · ${option.english}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Notification preferences</h2>
              <div className="mt-4 space-y-4">
                <Toggle
                  label="In-app notifications"
                  description="Status changes appear in your notification centre."
                  checked={prefs.inApp}
                  onChange={(value) => setPrefs({ ...prefs, inApp: value })}
                />
                <Toggle
                  label="Email updates"
                  description="A message when an application changes status."
                  checked={prefs.email}
                  onChange={(value) => setPrefs({ ...prefs, email: value })}
                />
                <Toggle
                  label="SMS updates"
                  description="Short alerts for urgent document requests."
                  checked={prefs.sms}
                  onChange={(value) => setPrefs({ ...prefs, sms: value })}
                />
                <Toggle
                  label="Service deadline reminders"
                  description="Tell me when an application approaches its service commitment deadline."
                  checked={prefs.slaAlerts}
                  onChange={(value) => setPrefs({ ...prefs, slaAlerts: value })}
                />
              </div>
            </section>

            <section className="surface-card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" /> Security
              </h2>
              <div className="mt-4 space-y-4">
                <Toggle
                  label="Two-step verification"
                  description="Record your intent to use a second factor. Publica's security architecture is ready for verification codes; enrolment opens with the identity service."
                  checked={mfaEnabled}
                  onChange={setMfaEnabled}
                />
                {mfaEnabled ? (
                  <div className="max-w-sm space-y-2">
                    <Label>Preferred second factor</Label>
                    <Select
                      value={mfaMethod}
                      onValueChange={(value) => setMfaMethod(value as typeof mfaMethod)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MFA_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => resetPassword.mutate()}
                    disabled={resetPassword.isPending}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Send password reset link
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sessions are handled by the secure sign-in service; signing out ends the session on this
                    device.
                  </p>
                </div>
              </div>
            </section>

            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Access &amp; roles</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Publica separates access into Citizen, Government Officer, Department Admin, Oversight
                Authority and Super Admin. Roles are stored separately from your profile and checked on the
                server for every request.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {settings.data.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="font-normal capitalize">
                    {role.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </section>

            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </form>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
