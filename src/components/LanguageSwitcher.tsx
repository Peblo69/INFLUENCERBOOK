import { Languages } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { AppLanguage } from "@/i18n/translations";

interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher = ({ compact }: LanguageSwitcherProps) => {
  const { language, setLanguage, languages } = useI18n();

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-2 py-1.5 transition-colors cursor-pointer">
      <Languages size={compact ? 12 : 13} className="text-zinc-500 flex-shrink-0" />
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as AppLanguage)}
        className="bg-transparent text-[11px] text-zinc-400 hover:text-zinc-200 outline-none border-none cursor-pointer appearance-none pr-1"
        aria-label="Language"
      >
        {languages.map((option) => (
          <option key={option.code} value={option.code} className="bg-zinc-900 text-zinc-200">
            {compact ? option.code.toUpperCase() : option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
