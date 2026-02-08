# Knowledge Base

Drop any files here and the AI will learn them.

## Folder Structure

```
knowledge-base/
├── inbox/          ← DROP FILES HERE
├── processed/      ← Auto-moved after ingestion
└── failed/         ← If something breaks
```

## Supported File Types

- `.md` - Markdown (guides, tutorials)
- `.txt` - Plain text
- `.pdf` - PDFs (ebooks, papers)
- `.json` - Structured data
- `.html` - Web pages (saved)
- `.docx` - Word documents
- `.csv` - Data tables
- `.py` / `.js` - Code files (prompts, configs)

## How It Works

1. You drop a file in `inbox/`
2. System detects it (watches folder)
3. Parses content based on file type
4. Chunks into semantic pieces
5. Generates embeddings
6. Stores in vector database
7. Links to knowledge graph
8. Moves file to `processed/`
9. AI now knows it

## Organization (Optional)

You can create subfolders in `inbox/` to auto-tag:

```
inbox/
├── prompts/           → Tagged as "prompting"
├── lora-training/     → Tagged as "lora"
├── monetization/      → Tagged as "business"
├── tools/             → Tagged as "tools"
└── platforms/         → Tagged as "platforms"
```

## Adding Context

Name files descriptively:
- `flux-prompting-guide-2025.md` ✓
- `document1.txt` ✗

Or add a frontmatter header:
```markdown
---
title: FLUX Pro Prompting Guide
category: prompting
tags: [flux, image-generation, advanced]
source: https://example.com/guide
date: 2025-02-01
---

Your content here...
```
