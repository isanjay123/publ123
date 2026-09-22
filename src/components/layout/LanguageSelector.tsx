import { Languages } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALES, useI18n, type LocaleCode } from "@/lib/i18n";

export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as LocaleCode)}>
      <SelectTrigger className={className} aria-label={t("common.language")}>
        <Languages className="mr-2 h-4 w-4 shrink-0" />
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
  );
}
