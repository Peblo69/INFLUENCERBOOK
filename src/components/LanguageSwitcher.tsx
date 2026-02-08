import { Languages } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { AppLanguage } from "@/i18n/translations";

export const LanguageSwitcher = () => {
  const { language, setLanguage, languages } = useI18n();

  return (
    <div className="fixed right-4 top-4 z-[120]">
      <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/60 backdrop-blur-xl px-3 py-2 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
        <Languages size={14} className="text-zinc-400" />
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as AppLanguage)}
          className="bg-transparent text-xs text-zinc-200 outline-none border-none cursor-pointer"
          aria-label="Language"
        >
          {languages.map((option) => (
            <option key={option.code} value={option.code} className="bg-zinc-900 text-zinc-200">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
