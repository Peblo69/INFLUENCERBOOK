import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  type AppLanguage,
  translateText,
  loadLanguage,
} from "@/i18n/translations";

type TranslateParams = Record<string, string | number>;

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (text: string, params?: TranslateParams) => string;
  languages: typeof LANGUAGE_OPTIONS;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const codeMap = new Map<string, AppLanguage>(
  LANGUAGE_OPTIONS.map((option) => [option.code.toLowerCase(), option.code]),
);

const normalizeLanguageCode = (value?: string | null): AppLanguage | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const direct = codeMap.get(normalized);
  if (direct) {
    return direct;
  }

  const base = normalized.split("-")[0];
  if (base === "zh") {
    return "zh-CN";
  }

  return codeMap.get(base) ?? null;
};

const detectInitialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") {
    return "en";
  }

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const savedLanguage = normalizeLanguageCode(saved);
  if (savedLanguage) {
    return savedLanguage;
  }

  const browserLanguages = [
    ...(window.navigator.languages || []),
    window.navigator.language,
  ];

  for (const language of browserLanguages) {
    const normalized = normalizeLanguageCode(language);
    if (normalized) {
      return normalized;
    }
  }

  return "en";
};

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>(detectInitialLanguage);
  const [, setDictReady] = useState(0); // trigger re-render when dict loads

  // Load the language dictionary on mount and when language changes
  useEffect(() => {
    let cancelled = false;
    loadLanguage(language).then(() => {
      if (!cancelled) setDictReady((n) => n + 1);
    });
    return () => { cancelled = true; };
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (text: string, params?: TranslateParams) => translateText(language, text, params),
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t,
      languages: LANGUAGE_OPTIONS,
    }),
    [language, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
};
