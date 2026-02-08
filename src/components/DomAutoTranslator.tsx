import { useEffect } from "react";
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

const applyDomTranslationToRoot = (
  root: Node,
  dictionary: Record<string, string>,
  language: string,
) => {
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text, dictionary, language);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }

  const rootElement = root as Element;
  if (root.nodeType === Node.ELEMENT_NODE) {
    processAttributes(rootElement, dictionary, language);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    processTextNode(current as Text, dictionary, language);
    current = walker.nextNode();
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    rootElement.querySelectorAll("*").forEach((element) => {
      processAttributes(element, dictionary, language);
    });
    return;
  }

  document.querySelectorAll("*").forEach((element) => {
    processAttributes(element, dictionary, language);
  });
};

const applyMutationBatch = (
  mutations: MutationRecord[],
  dictionary: Record<string, string>,
  language: string,
) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes") {
      const target = mutation.target as Element;
      processAttributes(target, dictionary, language);
      continue;
    }

    if (mutation.type === "characterData") {
      processTextNode(mutation.target as Text, dictionary, language);
      continue;
    }

    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        applyDomTranslationToRoot(node, dictionary, language);
      });
    }
  }
};

export const DomAutoTranslator = () => {
  const { language } = useI18n();

  useEffect(() => {
    if (typeof document === "undefined" || !document.body) {
      return;
    }

    const dictionary = getLanguageDictionary(language);
    applyDomTranslationToRoot(document.body, dictionary, language);
    if (language === "en") {
      return;
    }

    let queued = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    let pendingMutations: MutationRecord[] = [];

    const flushMutations = () => {
      queued = false;
      const batch = pendingMutations;
      pendingMutations = [];
      if (!batch.length) return;
      applyMutationBatch(batch, dictionary, language);
    };

    const scheduleFlush = () => {
      if (queued) {
        return;
      }
      queued = true;
      if ("requestIdleCallback" in window) {
        idleId = (window as any).requestIdleCallback(flushMutations, { timeout: 120 });
      } else {
        timeoutId = window.setTimeout(flushMutations, 32);
      }
    };

    const observer = new MutationObserver((mutations) => {
      pendingMutations.push(...mutations);
      scheduleFlush();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [...translatableAttributes],
    });

    return () => {
      observer.disconnect();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== null && "cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, [language]);

  return null;
};
