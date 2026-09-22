import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type LocaleCode = "en" | "ta" | "hi" | "ml" | "te" | "kn" | "bn" | "mr";

export const LOCALES: { code: LocaleCode; label: string; english: string }[] = [
  { code: "en", label: "English", english: "English" },
  { code: "ta", label: "தமிழ்", english: "Tamil" },
  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "ml", label: "മലയാളം", english: "Malayalam" },
  { code: "te", label: "తెలుగు", english: "Telugu" },
  { code: "kn", label: "ಕನ್ನಡ", english: "Kannada" },
  { code: "bn", label: "বাংলা", english: "Bengali" },
  { code: "mr", label: "मराठी", english: "Marathi" },
];

export const LOCALE_CODES = LOCALES.map((locale) => locale.code);

/**
 * Translation keys are declared once in English. Other locales provide partial
 * dictionaries and fall back to English, so new strings never break a language.
 */
const en = {
  "nav.home": "Home",
  "nav.services": "Services",
  "nav.applications": "Applications",
  "nav.notifications": "Notifications",
  "nav.assistant": "Publica AI",
  "nav.transparency": "Transparency",
  "nav.dashboard": "Dashboard",
  "nav.profile": "Profile",
  "action.signIn": "Sign in",
  "action.signOut": "Sign out",
  "action.createAccount": "Create account",
  "action.apply": "Apply",
  "action.back": "Back",
  "action.next": "Continue",
  "action.saveDraft": "Save draft",
  "action.submit": "Submit application",
  "common.search": "Search",
  "common.language": "Language",
  "services.title": "Service catalogue",
  "services.searchPlaceholder": "Search services or departments",
  "services.allDepartments": "All departments",
  "applications.title": "My applications",
  "assistant.title": "Publica AI",
  "assistant.subtitle": "Your digital public-service guide",
} as const;

export type TranslationKey = keyof typeof en;

const dictionaries: Record<LocaleCode, Partial<Record<TranslationKey, string>>> = {
  en,
  ta: {
    "nav.home": "முகப்பு",
    "nav.services": "சேவைகள்",
    "nav.applications": "விண்ணப்பங்கள்",
    "nav.notifications": "அறிவிப்புகள்",
    "nav.transparency": "வெளிப்படைத்தன்மை",
    "nav.dashboard": "டாஷ்போர்டு",
    "nav.profile": "சுயவிவரம்",
    "action.signIn": "உள்நுழை",
    "action.signOut": "வெளியேறு",
    "action.apply": "விண்ணப்பிக்க",
    "common.language": "மொழி",
    "services.title": "சேவை பட்டியல்",
    "assistant.subtitle": "உங்கள் பொதுச் சேவை வழிகாட்டி",
  },
  hi: {
    "nav.home": "मुख्य पृष्ठ",
    "nav.services": "सेवाएँ",
    "nav.applications": "आवेदन",
    "nav.notifications": "सूचनाएँ",
    "nav.transparency": "पारदर्शिता",
    "nav.dashboard": "डैशबोर्ड",
    "nav.profile": "प्रोफ़ाइल",
    "action.signIn": "साइन इन",
    "action.signOut": "साइन आउट",
    "action.apply": "आवेदन करें",
    "common.language": "भाषा",
    "services.title": "सेवा सूची",
    "assistant.subtitle": "आपका डिजिटल जन-सेवा मार्गदर्शक",
  },
  ml: {
    "nav.home": "ഹോം",
    "nav.services": "സേവനങ്ങൾ",
    "nav.applications": "അപേക്ഷകൾ",
    "nav.notifications": "അറിയിപ്പുകൾ",
    "nav.profile": "പ്രൊഫൈൽ",
    "action.apply": "അപേക്ഷിക്കുക",
    "common.language": "ഭാഷ",
  },
  te: {
    "nav.home": "హోమ్",
    "nav.services": "సేవలు",
    "nav.applications": "దరఖాస్తులు",
    "nav.notifications": "నోటిఫికేషన్లు",
    "nav.profile": "ప్రొఫైల్",
    "action.apply": "దరఖాస్తు చేయండి",
    "common.language": "భాష",
  },
  kn: {
    "nav.home": "ಮುಖಪುಟ",
    "nav.services": "ಸೇವೆಗಳು",
    "nav.applications": "ಅರ್ಜಿಗಳು",
    "nav.notifications": "ಅಧಿಸೂಚನೆಗಳು",
    "nav.profile": "ಪ್ರೊಫೈಲ್",
    "action.apply": "ಅರ್ಜಿ ಸಲ್ಲಿಸಿ",
    "common.language": "ಭಾಷೆ",
  },
  bn: {
    "nav.home": "হোম",
    "nav.services": "সেবাসমূহ",
    "nav.applications": "আবেদনসমূহ",
    "nav.notifications": "বিজ্ঞপ্তি",
    "nav.profile": "প্রোফাইল",
    "action.apply": "আবেদন করুন",
    "common.language": "ভাষা",
  },
  mr: {
    "nav.home": "मुख्यपृष्ठ",
    "nav.services": "सेवा",
    "nav.applications": "अर्ज",
    "nav.notifications": "सूचना",
    "nav.profile": "प्रोफाइल",
    "action.apply": "अर्ज करा",
    "common.language": "भाषा",
  },
};

const STORAGE_KEY = "publica-locale";

type I18nValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (stored && LOCALE_CODES.includes(stored)) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => dictionaries[locale]?.[key] ?? en[key] ?? key,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (context) return context;
  return { locale: "en", setLocale: () => {}, t: (key) => en[key] ?? key };
}
