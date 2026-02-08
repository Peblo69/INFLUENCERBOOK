import { useI18n } from "@/contexts/I18nContext";

export const UpgradeButton = () => {
  const { t } = useI18n();

  return (
    <a
      href="#"
      className="text-white hover:text-white items-center box-border caret-transparent flex h-[42px] border border-white/10 hover:border-white/30 px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 shadow-lg shadow-black/20"
    >
      <span className="text-sm font-bold tracking-wide items-center box-border caret-transparent flex justify-center leading-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 mr-2" aria-hidden="true">
          <path d="M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z" />
        </svg>
        {t("Upgrade")}
      </span>
    </a>
  );
};
