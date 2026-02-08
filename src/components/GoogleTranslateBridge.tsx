import { useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useLocation } from "react-router-dom";
import { LANGUAGE_OPTIONS, type AppLanguage } from "@/i18n/translations";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";

const LANGUAGE_ALIASES: Partial<Record<AppLanguage, string>> = {
  he: "iw",
};

const toGoogleLanguage = (language: AppLanguage) => {
  return LANGUAGE_ALIASES[language] ?? language;
};

const setGoogleTranslateCookie = (language: AppLanguage) => {
  const value = `/en/${toGoogleLanguage(language)}`;
  document.cookie = `googtrans=${value}; path=/`;
  try {
    window.localStorage.setItem("googtrans", value);
  } catch {
    // ignore storage failures
  }
};

const applyLanguage = (language: AppLanguage) => {
  setGoogleTranslateCookie(language);
  const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!select) {
    return false;
  }

  const googleLanguage = toGoogleLanguage(language);
  if (select.value !== googleLanguage) {
    select.value = googleLanguage;
    select.dispatchEvent(new Event("change"));
  }
  return true;
};

const SUPPORTED = Array.from(
  new Set(LANGUAGE_OPTIONS.map((option) => toGoogleLanguage(option.code))),
).join(",");

export const GoogleTranslateBridge = () => {
  const { language } = useI18n();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const init = () => {
      if (!window.google?.translate?.TranslateElement) {
        return;
      }

      const existingNode = document.getElementById(ELEMENT_ID);
      if (!existingNode) {
        return;
      }

      if (!existingNode.hasChildNodes()) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: SUPPORTED,
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          ELEMENT_ID,
        );
      }
    };

    window.googleTranslateElementInit = init;

    if (window.google?.translate?.TranslateElement) {
      init();
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    // Re-apply on language changes and route changes to keep newly-mounted
    // page content translated (including landing/home page sections).
    const maxAttempts = 150;
    let attempts = 0;
    const timer = window.setInterval(() => {
      const applied = applyLanguage(language);
      attempts += 1;
      if (applied || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, [language, location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !document.body) {
      return;
    }

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) {
        return;
      }
      queued = true;
      window.setTimeout(() => {
        queued = false;
        void applyLanguage(language);
      }, 250);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return (
    <>
      <style>{`
        .goog-te-banner-frame.skiptranslate,
        iframe.goog-te-banner-frame {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
        #google_translate_element {
          position: fixed;
          width: 0;
          height: 0;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
        }
        .goog-te-gadget,
        .goog-te-gadget span,
        .goog-logo-link {
          font-size: 0 !important;
          color: transparent !important;
        }
      `}</style>
      <div id={ELEMENT_ID} aria-hidden="true" />
    </>
  );
};
