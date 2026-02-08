import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default;
const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const translationsPath = path.join(srcDir, "i18n", "translations.ts");
const generatedPath = path.join(srcDir, "i18n", "generatedDictionaries.ts");

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
  if (valueNode.type === "StringLiteral") return valueNode.value;

  if (
    valueNode.type === "TemplateLiteral" &&
    valueNode.expressions?.length === 0 &&
    valueNode.quasis?.length === 1
  ) {
    return valueNode.quasis[0].value.cooked || valueNode.quasis[0].value.raw || "";
  }

  if (
    valueNode.type === "JSXExpressionContainer" &&
    valueNode.expression?.type === "StringLiteral"
  ) {
    return valueNode.expression.value;
  }

  if (
    valueNode.type === "JSXExpressionContainer" &&
    valueNode.expression?.type === "TemplateLiteral" &&
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

const loadGenerated = () => {
  if (!fs.existsSync(generatedPath)) {
    return null;
  }
  const raw = fs.readFileSync(generatedPath, "utf8");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return JSON.parse(raw.slice(start, end + 1));
};

const placeholderSet = (value) => {
  return new Set([...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));
};

const setsEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
};

const main = () => {
  const phrases = extractPhrases();
  const languages = getLanguages();
  const generated = loadGenerated();

  if (!generated) {
    console.error("Missing generated dictionaries. Run: npm run i18n:generate");
    process.exit(1);
  }

  const en = generated.en ?? {};
  const missingInEn = phrases.filter((phrase) => !(phrase in en));
  let hasError = false;

  if (missingInEn.length) {
    hasError = true;
    console.error(`Missing ${missingInEn.length} phrases in en dictionary.`);
    console.error(missingInEn.slice(0, 20).join("\n"));
  }

  for (const language of languages) {
    if (language === "en") continue;
    const dict = generated[language] ?? {};

    const missing = phrases.filter((phrase) => !(phrase in dict));
    if (missing.length) {
      hasError = true;
      console.error(`[${language}] missing ${missing.length} phrases`);
      console.error(missing.slice(0, 10).join("\n"));
    }

    const mismatch = [];
    for (const phrase of phrases) {
      const translated = dict[phrase];
      if (typeof translated !== "string") continue;
      const sourceSet = placeholderSet(phrase);
      const targetSet = placeholderSet(translated);
      if (!setsEqual(sourceSet, targetSet)) {
        mismatch.push(phrase);
      }
    }
    if (mismatch.length) {
      hasError = true;
      console.error(`[${language}] placeholder mismatch in ${mismatch.length} phrases`);
      console.error(mismatch.slice(0, 10).join("\n"));
    }
  }

  if (hasError) {
    process.exit(1);
  }

  console.log(
    `i18n check passed: ${phrases.length} phrases covered across ${languages.length} languages.`,
  );
};

main();

