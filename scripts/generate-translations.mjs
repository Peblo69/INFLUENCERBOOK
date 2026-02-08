import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

dotenv.config({ path: ".env" });

const traverse = traverseModule.default;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.I18N_TRANSLATION_MODEL || "gpt-4.1-mini";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.I18N_ANTHROPIC_MODEL || "claude-3-7-sonnet-latest";
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.VITE_XAI_API_KEY;
const XAI_MODEL = process.env.I18N_XAI_MODEL || "grok-3-mini";
const CHUNK_SIZE = Number(process.env.I18N_CHUNK_SIZE || 140);
const CONCURRENCY = Number(process.env.I18N_CONCURRENCY || 1);
const FORCE_REGENERATE = process.env.I18N_FORCE === "1";
const ONLY_LANGS = process.env.I18N_LANGS
  ? new Set(
      process.env.I18N_LANGS.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )
  : null;

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const translationsPath = path.join(srcDir, "i18n", "translations.ts");
const outputTsPath = path.join(srcDir, "i18n", "generatedDictionaries.ts");

const textProps = new Set([
  "title",
  "desc",
  "label",
  "text",
  "subtitle",
  "heading",
  "subheading",
  "content",
  "prompt",
  "placeholder",
  "button",
  "cta",
]);

const attrProps = new Set(["placeholder", "title", "aria-label", "alt"]);

const keepValue = (value) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length < 2 || normalized.length > 240) return null;
  if (!/[A-Za-z]/.test(normalized)) return null;
  if (/^(https?:\/\/|\/)/.test(normalized)) return null;
  if (/^[\w-]+(\.[\w-]+)+$/.test(normalized)) return null;
  if (/[{}]/.test(normalized) && !/\{\{\w+\}\}/.test(normalized)) return null;
  return normalized;
};

const walkFiles = (dir, acc = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, acc);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      acc.push(fullPath);
    }
  }
  return acc;
};

const getStaticStringFromValueNode = (valueNode) => {
  if (!valueNode) return null;

  if (valueNode.type === "StringLiteral") {
    return valueNode.value;
  }

  if (
    valueNode.type === "TemplateLiteral" &&
    valueNode.expressions &&
    valueNode.expressions.length === 0 &&
    valueNode.quasis &&
    valueNode.quasis.length === 1
  ) {
    return valueNode.quasis[0].value.cooked || valueNode.quasis[0].value.raw || "";
  }

  if (
    valueNode.type === "JSXExpressionContainer" &&
    valueNode.expression &&
    valueNode.expression.type === "StringLiteral"
  ) {
    return valueNode.expression.value;
  }

  if (
    valueNode.type === "JSXExpressionContainer" &&
    valueNode.expression &&
    valueNode.expression.type === "TemplateLiteral" &&
    valueNode.expression.expressions.length === 0 &&
    valueNode.expression.quasis.length === 1
  ) {
    return valueNode.expression.quasis[0].value.cooked || valueNode.expression.quasis[0].value.raw || "";
  }

  return null;
};

const extractPhrases = () => {
  const files = walkFiles(srcDir);
  const phrases = new Set();

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    let ast;
    try {
      ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });
    } catch {
      continue;
    }

    traverse(ast, {
      JSXText(pathRef) {
        const value = keepValue(pathRef.node.value);
        if (value) phrases.add(value);
      },
      JSXAttribute(pathRef) {
        const nameNode = pathRef.node.name;
        if (!nameNode || nameNode.type !== "JSXIdentifier") return;
        if (!attrProps.has(nameNode.name)) return;

        const value = keepValue(getStaticStringFromValueNode(pathRef.node.value) || "");
        if (value) phrases.add(value);
      },
      ObjectProperty(pathRef) {
        const keyNode = pathRef.node.key;
        let keyName = null;
        if (keyNode.type === "Identifier") keyName = keyNode.name;
        if (keyNode.type === "StringLiteral") keyName = keyNode.value;
        if (!keyName || !textProps.has(keyName)) return;

        const value = keepValue(getStaticStringFromValueNode(pathRef.node.value) || "");
        if (value) phrases.add(value);
      },
      CallExpression(pathRef) {
        const callee = pathRef.node.callee;
        if (callee.type !== "Identifier" || callee.name !== "t") return;
        const first = pathRef.node.arguments[0];
        if (!first || first.type !== "StringLiteral") return;
        const value = keepValue(first.value);
        if (value) phrases.add(value);
      },
    });
  }

  return [...phrases].sort((a, b) => a.localeCompare(b));
};

const getLanguages = () => {
  const content = fs.readFileSync(translationsPath, "utf8");
  const matches = [...content.matchAll(/code:\s*"([^"]+)"/g)];
  return Array.from(new Set(matches.map((m) => m[1])));
};

const withRetry = async (fn, retries = 3) => {
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = 1000 * (i + 1);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastErr;
};

const cleanJson = (text) => {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return cleaned.slice(start, end + 1);
};

const placeholderPattern = /\{\{(\w+)\}\}/g;

const preservePlaceholders = (source, translated) => {
  const sourceMatches = [...source.matchAll(placeholderPattern)];
  if (!sourceMatches.length) {
    return translated;
  }

  let next = translated;
  for (const [, name] of sourceMatches) {
    // Fix common malformed forms like "{count}}" or "{{count}".
    next = next.replace(new RegExp(`\\{${name}\\}\\}`, "g"), `{{${name}}}`);
    next = next.replace(new RegExp(`\\{\\{${name}\\}`, "g"), `{{${name}}}`);
  }

  const sourceNames = sourceMatches.map((m) => m[1]);
  const targetNames = [...next.matchAll(placeholderPattern)].map((m) => m[1]);

  if (sourceNames.length !== targetNames.length) {
    return source;
  }

  const sourceSet = new Set(sourceNames);
  const targetSet = new Set(targetNames);
  if (sourceSet.size !== targetSet.size || [...sourceSet].some((key) => !targetSet.has(key))) {
    return source;
  }

  return next;
};

const buildPrompts = (languageCode, phrases) => {
  const system = [
    "You are a professional software localization engine.",
    "Translate user-interface strings from English into the target language.",
    "Return ONLY valid minified JSON in this exact shape:",
    "{\"translations\":[\"...\", \"...\"]}",
    "The translations array must have exactly the same length and order as input phrases.",
    "Rules:",
    "- Preserve placeholders exactly, e.g. {{count}}, {{page}}, {{total}}, {{index}}.",
    "- Preserve product names, acronyms, and model names where appropriate (AI, WAN 2.1, Kiara).",
    "- Keep concise UI tone.",
    "- If a phrase should stay unchanged, return the same text.",
  ].join("\n");

  const user = JSON.stringify({
    targetLanguage: languageCode,
    sourceLanguage: "en",
    phrases,
  });

  return { system, user };
};

const parseModelJson = (rawText, phrases) => {
  const parsed = JSON.parse(cleanJson(rawText));
  let mapping = parsed;
  let orderedTranslations = null;

  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.translations)) {
      orderedTranslations = parsed.translations;
    } else if (Array.isArray(parsed.results)) {
      orderedTranslations = parsed.results;
    } else if (parsed.phrases && typeof parsed.phrases === "object") {
      mapping = parsed.phrases;
    } else if (parsed.translations && typeof parsed.translations === "object") {
      mapping = parsed.translations;
    } else if (Array.isArray(parsed.items)) {
      const byItems = {};
      for (const item of parsed.items) {
        if (
          item &&
          typeof item === "object" &&
          typeof item.source === "string" &&
          typeof item.translation === "string"
        ) {
          byItems[item.source] = item.translation;
        }
      }
      if (Object.keys(byItems).length) {
        mapping = byItems;
      }
    }
  }

  const dictionary = {};
  for (let i = 0; i < phrases.length; i += 1) {
    const phrase = phrases[i];
    const translated = Array.isArray(orderedTranslations)
      ? orderedTranslations[i]
      : mapping?.[phrase];
    if (typeof translated === "string" && translated.trim()) {
      dictionary[phrase] = preservePlaceholders(phrase, translated.trim());
    } else {
      dictionary[phrase] = phrase;
    }
  }
  return dictionary;
};

const translateChunkWithOpenAI = async (languageCode, phrases) => {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI key not configured");
  }
  const { system, user } = buildPrompts(languageCode, phrases);

  const response = await withRetry(async () => {
    const result = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!result.ok) {
      const text = await result.text();
      throw new Error(`OpenAI error (${result.status}): ${text}`);
    }

    const data = await result.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content from OpenAI response");
    }
    return content;
  }, 4);

  return parseModelJson(response, phrases);
};

const translateChunkWithAnthropic = async (languageCode, phrases) => {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic key not configured");
  }
  const { system, user } = buildPrompts(languageCode, phrases);

  const response = await withRetry(async () => {
    const result = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 8192,
        temperature: 0.1,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!result.ok) {
      const text = await result.text();
      throw new Error(`Anthropic error (${result.status}): ${text}`);
    }

    const data = await result.json();
    const textPart = Array.isArray(data?.content)
      ? data.content.find((part) => part?.type === "text")?.text
      : "";
    if (!textPart) {
      throw new Error("No text content from Anthropic response");
    }
    return textPart;
  }, 4);

  return parseModelJson(response, phrases);
};

const translateChunkWithXAI = async (languageCode, phrases) => {
  if (!XAI_API_KEY) {
    throw new Error("xAI key not configured");
  }
  const { system, user } = buildPrompts(languageCode, phrases);

  const response = await withRetry(async () => {
    const result = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0.1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!result.ok) {
      const text = await result.text();
      throw new Error(`xAI error (${result.status}): ${text}`);
    }

    const data = await result.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content from xAI response");
    }
    return content;
  }, 4);

  return parseModelJson(response, phrases);
};

const translateChunkWithFallback = async (languageCode, phrases) => {
  const providers = [
    { name: "anthropic", fn: translateChunkWithAnthropic },
    { name: "openai", fn: translateChunkWithOpenAI },
    { name: "xai", fn: translateChunkWithXAI },
  ];

  let lastError = null;
  for (const provider of providers) {
    try {
      const result = await provider.fn(languageCode, phrases);
      const changed = phrases.filter((phrase) => (result[phrase] || phrase) !== phrase).length;
      const changedRatio = changed / Math.max(1, phrases.length);
      if (changedRatio < 0.08) {
        throw new Error(
          `Too many untranslated phrases from ${provider.name} (${Math.round(changedRatio * 100)}% changed)`,
        );
      }
      return result;
    } catch (error) {
      lastError = error;
      console.warn(
        `[${languageCode}] provider ${provider.name} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  throw lastError ?? new Error(`All providers failed for ${languageCode}`);
};

const chunk = (items, size) => {
  const output = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
};

const translateForLanguage = async (languageCode, missingPhrases, existingDictionary = {}) => {
  const dictionary = { ...existingDictionary };
  if (!missingPhrases.length) {
    return dictionary;
  }

  const phraseChunks = chunk(missingPhrases, CHUNK_SIZE);
  for (let idx = 0; idx < phraseChunks.length; idx += 1) {
    const phraseChunk = phraseChunks[idx];
    console.log(
      `  ${languageCode}: chunk ${idx + 1}/${phraseChunks.length} (${phraseChunk.length} missing items)`,
    );
    const translated = await translateChunkWithFallback(languageCode, phraseChunk);
    Object.assign(dictionary, translated);
  }

  for (const phrase of missingPhrases) {
    if (!dictionary[phrase]) {
      dictionary[phrase] = phrase;
    }
  }

  return dictionary;
};

const loadExistingDictionaries = () => {
  if (!fs.existsSync(outputTsPath)) {
    return null;
  }

  const raw = fs.readFileSync(outputTsPath, "utf8");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
};

const writeDictionaries = (dictionaries) => {
  const output = [
    "/* eslint-disable */",
    "// Auto-generated by scripts/generate-translations.mjs",
    "export const GENERATED_DICTIONARIES: Record<string, Record<string, string>> = ",
    `${JSON.stringify(dictionaries, null, 2)};`,
    "",
  ].join("\n");

  fs.writeFileSync(outputTsPath, output, "utf8");
};

const runPool = async (items, worker, concurrency = 3) => {
  const queue = [...items];
  const results = [];
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) continue;
      const result = await worker(item);
      results.push(result);
    }
  });
  await Promise.all(runners);
  return results;
};

const main = async () => {
  const phrases = extractPhrases();
  const languages = getLanguages().filter((code) => (ONLY_LANGS ? ONLY_LANGS.has(code) : true));

  if (!phrases.length) {
    throw new Error("No phrases extracted from source files.");
  }

  console.log(`Extracted ${phrases.length} phrases`);
  console.log(`Target languages: ${languages.length}`);

  const existing = loadExistingDictionaries();
  const dictionaries = existing ?? {
    en: Object.fromEntries(phrases.map((phrase) => [phrase, phrase])),
  };

  dictionaries.en = Object.fromEntries(phrases.map((phrase) => [phrase, phrase]));

  if (FORCE_REGENERATE) {
    for (const code of Object.keys(dictionaries)) {
      if (code !== "en") {
        delete dictionaries[code];
      }
    }
  }

  const missingByLanguage = new Map();
  for (const code of languages) {
    if (code === "en") {
      continue;
    }
    const current = dictionaries[code] ?? {};
    const missing = phrases.filter((phrase) => !(phrase in current));
    if (missing.length) {
      missingByLanguage.set(code, missing);
    }
  }

  const targets = [...missingByLanguage.keys()];
  if (!targets.length) {
    console.log("All languages are already up to date.");
    writeDictionaries(dictionaries);
    return;
  }

  const failedLanguages = [];
  await runPool(
    targets,
    async (languageCode) => {
      try {
        const missing = missingByLanguage.get(languageCode) ?? [];
        console.log(`Translating ${languageCode} (${missing.length} missing keys)...`);
        const dict = await translateForLanguage(
          languageCode,
          missing,
          dictionaries[languageCode] ?? {},
        );
        dictionaries[languageCode] = dict;
        writeDictionaries(dictionaries);
        console.log(`Done ${languageCode}`);
      } catch (error) {
        failedLanguages.push(languageCode);
        console.error(
          `Failed ${languageCode}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return languageCode;
    },
    CONCURRENCY,
  );
  writeDictionaries(dictionaries);
  console.log(`Wrote ${outputTsPath}`);
  if (failedLanguages.length) {
    console.log(`Failed languages: ${failedLanguages.join(",")}`);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
