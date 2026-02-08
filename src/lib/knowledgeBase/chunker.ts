/**
 * Document Chunker
 * Splits documents into semantic chunks for embedding
 */

export interface ChunkOptions {
  maxChunkSize?: number;      // Max characters per chunk
  chunkOverlap?: number;      // Overlap between chunks
  preserveMarkdown?: boolean; // Keep markdown structure
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 1000,
  chunkOverlap: 200,
  preserveMarkdown: true,
};

/**
 * Split text into chunks while preserving semantic boundaries
 */
export function chunkDocument(
  content: string,
  options: ChunkOptions = {}
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: string[] = [];

  // First, try to split by major sections (## headers in markdown)
  const sections = splitBySections(content);

  for (const section of sections) {
    if (section.length <= opts.maxChunkSize) {
      chunks.push(section.trim());
    } else {
      // Section too large, split by paragraphs
      const paragraphChunks = splitByParagraphs(section, opts);
      chunks.push(...paragraphChunks);
    }
  }

  // Add overlap between chunks for context continuity
  return addOverlap(chunks, opts.chunkOverlap);
}

/**
 * Split content by markdown sections (## headers)
 */
function splitBySections(content: string): string[] {
  const sections: string[] = [];
  const lines = content.split('\n');
  let currentSection: string[] = [];

  for (const line of lines) {
    // Check for section header (## or ###)
    if (/^#{1,3}\s+/.test(line) && currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
      currentSection = [line];
    } else {
      currentSection.push(line);
    }
  }

  // Don't forget last section
  if (currentSection.length > 0) {
    sections.push(currentSection.join('\n'));
  }

  return sections.filter(s => s.trim().length > 0);
}

/**
 * Split section by paragraphs when section is too large
 */
function splitByParagraphs(
  section: string,
  opts: Required<ChunkOptions>
): string[] {
  const chunks: string[] = [];
  const paragraphs = section.split(/\n\n+/);
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const para of paragraphs) {
    if (currentLength + para.length > opts.maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [para];
      currentLength = para.length;
    } else {
      currentChunk.push(para);
      currentLength += para.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks;
}

/**
 * Add overlap between chunks for better context
 */
function addOverlap(chunks: string[], overlapSize: number): string[] {
  if (chunks.length <= 1 || overlapSize === 0) {
    return chunks;
  }

  const overlappedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];

    // Add end of previous chunk as prefix
    if (i > 0) {
      const prevChunk = chunks[i - 1];
      const overlap = prevChunk.slice(-overlapSize);
      chunk = `...${overlap}\n\n${chunk}`;
    }

    overlappedChunks.push(chunk);
  }

  return overlappedChunks;
}

/**
 * Parse frontmatter from markdown file
 */
export function parseFrontmatter(content: string): {
  metadata: Record<string, any>;
  content: string;
} {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { metadata: {}, content };
  }

  const [, frontmatterStr, mainContent] = frontmatterMatch;
  const metadata: Record<string, any> = {};

  // Simple YAML-like parsing
  for (const line of frontmatterStr.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      // Handle arrays like [tag1, tag2]
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim());
      } else {
        metadata[key] = value.trim();
      }
    }
  }

  return { metadata, content: mainContent };
}
