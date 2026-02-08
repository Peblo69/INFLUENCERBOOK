import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { getLanguageDictionary } from "@/i18n/translations";

const trackedTextNodes = new WeakMap<Text, string>();
const translatableAttributes = ["placeholder", "title", "aria-label", "alt"] as const;

const skipTags = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CODE",
  "PRE",
]);

const isSkippable = (element: Element | null) => {
  if (!element) {
    return true;
  }
  if (skipTags.has(element.tagName)) {
    return true;
  }
  if (element.closest("[data-no-translate='true']")) {
    return true;
  }
  return false;
};

const translateWithWhitespace = (raw: string, dictionary: Record<string, string>) => {
  const direct = dictionary[raw];
  if (direct) {
    return direct;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return raw;
  }

  const translated = dictionary[trimmed];
  if (!translated) {
    return raw;
  }

  const leading = raw.match(/^\s*/)?.[0] ?? "";
  const trailing = raw.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
};

const processTextNode = (
  node: Text,
  dictionary: Record<string, string>,
  language: string,
) => {
  const parent = node.parentElement;
  if (isSkippable(parent)) {
    return;
  }

  const current = node.textContent ?? "";
  if (!trackedTextNodes.has(node)) {
    trackedTextNodes.set(node, current);
  }

  const original = trackedTextNodes.get(node) ?? current;
  if (language === "en") {
    if (current !== original) {
      node.textContent = original;
    }
    return;
  }

  const translated = translateWithWhitespace(original, dictionary);
  if (translated !== current) {
    node.textContent = translated;
  }
};

const attrOriginKey = (attr: string) => `data-kiara-i18n-orig-${attr}`;

const processAttributes = (
  element: Element,
  dictionary: Record<string, string>,
  language: string,
) => {
  if (isSkippable(element)) {
    return;
  }

  for (const attr of translatableAttributes) {
    if (!element.hasAttribute(attr)) {
      continue;
    }

    const originalAttrKey = attrOriginKey(attr);
    const current = element.getAttribute(attr) ?? "";
    const original = element.getAttribute(originalAttrKey) ?? current;
    if (!element.hasAttribute(originalAttrKey)) {
      element.setAttribute(originalAttrKey, current);
    }

    if (language === "en") {
      if (current !== original) {
        element.setAttribute(attr, original);
      }
      continue;
    }

    const translated = translateWithWhitespace(original, dictionary);
    if (translated !== current) {
      element.setAttribute(attr, translated);
    }
  }
};

const applyDomTranslation = (dictionary: Record<string, string>, language: string) => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    processTextNode(current as Text, dictionary, language);
    current = walker.nextNode();
  }

  document.querySelectorAll("*").forEach((element) => {
    processAttributes(element, dictionary, language);
  });
};

export const DomAutoTranslator = () => {
  const { language } = useI18n();
  const location = useLocation();

  useEffect(() => {
    if (typeof document === "undefined" || !document.body) {
      return;
    }

    const dictionary = getLanguageDictionary(language);
    applyDomTranslation(dictionary, language);

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) {
        return;
      }
      queued = true;
      window.setTimeout(() => {
        queued = false;
        applyDomTranslation(dictionary, language);
      }, 80);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatableAttributes],
    });

    return () => observer.disconnect();
  }, [language, location.pathname]);

  return null;
};

