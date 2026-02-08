import { useCallback, useRef } from "react";

/**
 * ResizeObserver-based auto-scroll hook.
 *
 * FIXES:
 * - Uses rAF-coalesced scrolling instead of direct scrollTop assignment
 *   in the ResizeObserver callback (avoids forced sync layout per observation)
 * - Increased bottom-detection threshold to 50px to prevent auto-scroll
 *   from disabling during fast content growth (content can outrun scroll)
 * - snapToBottom uses instant scroll (no animation lag on send)
 */
export function useSnapScroll() {
  const autoScrollRef = useRef(true);
  const scrollNodeRef = useRef<HTMLDivElement | null>(null);
  const onScrollRef = useRef<(() => void) | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  // Callback-ref for the inner content container.
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }

    if (node) {
      const observer = new ResizeObserver(() => {
        if (!autoScrollRef.current || !scrollNodeRef.current) return;

        // Coalesce multiple ResizeObserver fires into a single rAF
        // This prevents layout thrashing when multiple elements resize
        // in the same frame (e.g. code blocks + text growing together)
        if (scrollRafRef.current) return; // already scheduled

        scrollRafRef.current = requestAnimationFrame(() => {
          scrollRafRef.current = null;
          if (!autoScrollRef.current || !scrollNodeRef.current) return;
          const el = scrollNodeRef.current;
          el.scrollTop = el.scrollHeight - el.clientHeight;
        });
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  // Callback-ref for the outer scroll container.
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    if (onScrollRef.current && scrollNodeRef.current) {
      scrollNodeRef.current.removeEventListener("scroll", onScrollRef.current);
    }
    onScrollRef.current = null;
    scrollNodeRef.current = null;

    if (node) {
      const handler = () => {
        const { scrollTop, scrollHeight, clientHeight } = node;
        const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
        // 50px threshold — content can grow faster than scroll updates,
        // so a tight threshold (10px) causes auto-scroll to falsely disable
        autoScrollRef.current = distanceFromBottom <= 50;
      };
      node.addEventListener("scroll", handler, { passive: true });
      onScrollRef.current = handler;
      scrollNodeRef.current = node;
    }
  }, []);

  // Imperative: force-scroll to bottom (e.g. when user sends a message)
  const snapToBottom = useCallback(() => {
    autoScrollRef.current = true;
    if (scrollNodeRef.current) {
      const el = scrollNodeRef.current;
      el.scrollTop = el.scrollHeight - el.clientHeight;
    }
  }, []);

  const isAutoScrolling = useCallback(() => autoScrollRef.current, []);

  return { scrollRef, contentRef, snapToBottom, isAutoScrolling };
}