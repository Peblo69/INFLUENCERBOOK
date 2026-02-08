import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ============================================================================
// Streaming-safe markdown pre-processor
// FIXED: Less aggressive - doesn't add fake closing markers that cause jumps
// ============================================================================

const fixPartialMarkdown = (text: string): string => {
  if (!text) return "";

  let fixed = text;

  // Close unclosed **bold** markers — prevents the jarring visual jump
  // when literal "**" characters suddenly disappear and text goes bold.
  // By closing them early, text appears bold immediately as it streams.
  const boldCount = (fixed.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    fixed += "**";
  }

  // Close unclosed `inline code` backticks (exclude triple-backtick fences)
  const withoutFences = fixed.replace(/```/g, "");
  const tickCount = (withoutFences.match(/`/g) || []).length;
  if (tickCount % 2 !== 0) {
    fixed += "`";
  }

  return fixed;
};

// ============================================================================
// Custom styled components for markdown elements
// ============================================================================

const markdownComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-white mt-5 mb-3 tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-white mt-4 mb-2 tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-white mt-3 mb-2 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-zinc-200 mt-3 mb-1 first:mt-0">
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="text-zinc-200 leading-[1.8] mb-3 last:mb-0">
      {children}
    </p>
  ),

  // Bold / Strong
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),

  // Italic / Emphasis
  em: ({ children }) => (
    <em className="italic text-zinc-300">{children}</em>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/30 hover:decoration-blue-300/50 transition-colors"
    >
      {children}
    </a>
  ),

  // Unordered lists
  ul: ({ children }) => (
    <ul className="space-y-1.5 mb-3 last:mb-0 ml-1">
      {children}
    </ul>
  ),

  // Ordered lists
  ol: ({ children }) => (
    <ol className="space-y-1.5 mb-3 last:mb-0 ml-1 list-none counter-reset-item">
      {children}
    </ol>
  ),

  // List items
  li: ({ children, ...props }) => {
    const ordered = (props as any).ordered;
    const index = (props as any).index;

    return (
      <li className="flex gap-2.5 text-zinc-200 leading-[1.75]">
        <span className="flex-shrink-0 mt-[2px] text-zinc-500 select-none text-[13px] min-w-[16px]">
          {ordered ? `${(index ?? 0) + 1}.` : "•"}
        </span>
        <span className="flex-1 min-w-0">{children}</span>
      </li>
    );
  },

  // Code blocks
  pre: ({ children }) => (
    <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-[#0d0d0d]">
      <div className="px-4 py-1.5 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Code</span>
      </div>
      <div className="p-4 overflow-x-auto">
        {children}
      </div>
    </div>
  ),

  // Inline code
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className="text-[13px] font-mono text-zinc-300 leading-relaxed block whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 text-[13px] font-mono border border-white/5">
        {children}
      </code>
    );
  },

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-white/20 pl-4 my-3 text-zinc-400 italic">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => (
    <hr className="my-4 border-0 h-px bg-white/10" />
  ),

  // Tables
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/5 border-b border-white/10">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-zinc-300 border-t border-white/5">
      {children}
    </td>
  ),
};

// ============================================================================
// Main component — memoized to prevent re-renders of non-streaming messages
// FIXED: Better comparison to prevent unnecessary re-renders
// ============================================================================

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

const MarkdownRendererInner = ({ content, isStreaming }: MarkdownRendererProps) => {
  if (!content) return null;

  // RAW MODE: no markdown parsing, no formatting fixes — just the raw API output
  return (
    <div
      className="text-[14px] font-sans leading-[1.75] tracking-normal antialiased break-words text-zinc-200 whitespace-pre-wrap"
    >
      {content}
    </div>
  );
};

export const MarkdownRenderer = memo(MarkdownRendererInner, (prev, next) => {
  return prev.content === next.content && prev.isStreaming === next.isStreaming;
});

MarkdownRenderer.displayName = "MarkdownRenderer";
