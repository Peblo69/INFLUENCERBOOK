# I18N Workflow (AI-Friendly)

This project has an automated localization pipeline for all configured languages.

## Golden Rule

When adding UI text, keep it as plain English in code and prefer `t("...")` where possible.

The pipeline extracts strings from:
- `t("...")`
- JSX text nodes
- Common text-like object properties (`title`, `desc`, `label`, `text`, `content`, `prompt`, etc.)
- Common attributes (`placeholder`, `title`, `aria-label`, `alt`)

## Commands

- Generate/update all missing translations:
  - `npm run i18n:generate`
- Validate coverage and placeholder integrity:
  - `npm run i18n:check`
- Do both in one step (recommended before PR/release):
  - `npm run i18n:sync`

## Fast Incremental Updates

`npm run i18n:generate` is incremental:
- It only translates missing keys for each language.
- Existing translations are preserved.
- It auto-resumes because dictionaries are written after each language.

## Useful Environment Flags

- Translate only selected languages:
  - `I18N_LANGS=en,ru,es npm run i18n:generate`
- Full refresh (rebuild every non-English language):
  - `I18N_FORCE=1 npm run i18n:generate`
- Change chunk size for speed/stability:
  - `I18N_CHUNK_SIZE=220 npm run i18n:generate`
- Change concurrency:
  - `I18N_CONCURRENCY=3 npm run i18n:generate`

## Provider Fallback

The generator tries providers in this order:
1. Anthropic
2. OpenAI
3. xAI

If one provider fails, it falls back automatically.

## Files

- Language list + runtime translation API:
  - `src/i18n/translations.ts`
- Generated dictionaries:
  - `src/i18n/generatedDictionaries.ts`
- Generator:
  - `scripts/generate-translations.mjs`
- Validation check:
  - `scripts/i18n-check.mjs`

## For Other AI Agents

After adding UI:
1. Run `npm run i18n:generate`
2. Run `npm run i18n:check`
3. If checks fail, run `I18N_FORCE=1 npm run i18n:generate` and retry check

