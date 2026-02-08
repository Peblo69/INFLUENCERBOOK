export const LANGUAGE_STORAGE_KEY = "kiara_language";

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "ru", label: "Russian" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "uk", label: "Ukrainian" },
  { code: "ar", label: "Arabic" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "tr", label: "Turkish" },
  { code: "pl", label: "Polish" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "no", label: "Norwegian" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
  { code: "cs", label: "Czech" },
  { code: "sk", label: "Slovak" },
  { code: "sl", label: "Slovenian" },
  { code: "hu", label: "Hungarian" },
  { code: "ro", label: "Romanian" },
  { code: "bg", label: "Bulgarian" },
  { code: "el", label: "Greek" },
  { code: "he", label: "Hebrew" },
  { code: "id", label: "Indonesian" },
  { code: "ms", label: "Malay" },
  { code: "th", label: "Thai" },
  { code: "vi", label: "Vietnamese" },
  { code: "fa", label: "Persian" },
  { code: "ur", label: "Urdu" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "sw", label: "Swahili" },
  { code: "tl", label: "Filipino" },
  { code: "sr", label: "Serbian" },
  { code: "hr", label: "Croatian" },
  { code: "lt", label: "Lithuanian" },
  { code: "lv", label: "Latvian" },
  { code: "et", label: "Estonian" },
  { code: "is", label: "Icelandic" },
  { code: "ga", label: "Irish" },
  { code: "mt", label: "Maltese" },
  { code: "cy", label: "Welsh" },
  { code: "sq", label: "Albanian" },
  { code: "az", label: "Azerbaijani" },
  { code: "ka", label: "Georgian" },
  { code: "hy", label: "Armenian" },
  { code: "kk", label: "Kazakh" },
  { code: "uz", label: "Uzbek" },
  { code: "mk", label: "Macedonian" },
  { code: "bs", label: "Bosnian" },
  { code: "af", label: "Afrikaans" },
  { code: "am", label: "Amharic" },
  { code: "ne", label: "Nepali" },
  { code: "si", label: "Sinhala" },
  { code: "my", label: "Burmese" },
  { code: "km", label: "Khmer" },
  { code: "lo", label: "Lao" },
  { code: "mn", label: "Mongolian" },
] as const;

export type AppLanguage = (typeof LANGUAGE_OPTIONS)[number]["code"];

type Dictionary = Record<string, string>;

// Lazy locale loaders — Vite splits each into its own chunk
const localeLoaders = import.meta.glob<{ default: Dictionary }>("./locales/*.ts");

// Cache loaded dictionaries in memory
const loadedDictionaries: Partial<Record<string, Dictionary>> = {};

/**
 * Load a language dictionary on demand.
 * English is a passthrough (no file needed).
 */
export const loadLanguage = async (lang: AppLanguage): Promise<Dictionary> => {
  if (lang === "en") return {};
  if (loadedDictionaries[lang]) return loadedDictionaries[lang]!;

  const loader = localeLoaders[`./locales/${lang}.ts`];
  if (!loader) {
    console.warn(`[i18n] No locale file for: ${lang}`);
    return {};
  }

  const mod = await loader();
  loadedDictionaries[lang] = mod.default;
  return mod.default;
};

const interpolationPattern = /\{\{(\w+)\}\}/g;

export const translateText = (
  language: AppLanguage,
  text: string,
  params?: Record<string, string | number>,
) => {
  const dict = loadedDictionaries[language];
  const translated = dict?.[text] ?? text;
  if (!params) {
    return translated;
  }

  return translated.replace(interpolationPattern, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
};

export const getLanguageDictionary = (language: AppLanguage): Dictionary => {
  return loadedDictionaries[language] ?? {};
};
