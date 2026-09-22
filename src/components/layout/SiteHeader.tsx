import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";

import { PublicaLogo } from "@/components/brand/Logo";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { listNotifications } from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

const PUBLIC_NAV: { to: string; key: TranslationKey }[] = [
  { to: "/", key: "nav.home" },
  { to: "/services", key: "nav.services" },
  { to: "/ai-assistant", key: "nav.assistant" },
  { to: "/transparency", key: "nav.transparency" },
];

const CITIZEN_NAV: { to: string; key: TranslationKey }[] = [
  { to: "/applications", key: "nav.applications" },
];

export function SiteHeader() {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    enabled: isAuthenticated,
  });
  const unread = (notifications.data ?? []).filter((row) => !row.isRead && !row.isDemo).length;

  const nav = isAuthenticated ? [...PUBLIC_NAV, ...CITIZEN_NAV] : PUBLIC_NAV;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="shrink-0">
          <PublicaLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-muted text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSelector className="hidden h-9 w-[150px] lg:flex" />
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="hidden items-center gap-2 lg:flex">
              <Button asChild variant="ghost" size="icon" className="relative">
                <Link to="/notifications" aria-label={t("nav.notifications")}>
                  <Bell className="h-4 w-4" />
                  {unread > 0 ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />
                  {t("nav.dashboard")}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile">
                  <UserRound className="mr-1.5 h-4 w-4" />
                  {t("nav.profile")}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="mr-1.5 h-4 w-4" />
                {t("action.signOut")}
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">{t("action.signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "register" }}>
                  {t("action.createAccount")}
                </Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Toggle navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border lg:hidden", open ? "block" : "hidden")}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium"
              >
                {t("nav.dashboard")}
              </Link>
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium"
              >
                {t("nav.notifications")}
                {unread > 0 ? ` (${unread})` : ""}
              </Link>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium"
              >
                {t("nav.profile")}
              </Link>
              <button
                onClick={signOut}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-destructive"
              >
                {t("action.signOut")}
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium"
            >
              {t("action.signIn")}
            </Link>
          )}
          <div className="px-3 pt-2">
            <LanguageSelector className="h-9 w-full" />
          </div>
        </div>
      </div>
    </header>
  );
}
