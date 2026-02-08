import { useCallback, useRef } from "react";

/**
 * ResizeObserver-based auto-scroll hook.
 *
 * Instead of using useEffect([messages]) which fires on every React state
 * update (20x/sec during streaming → forced layout reflows), this hook
 * uses a ResizeObserver on the content container. The browser only fires
 * the observer callback when the DOM actually changes size, naturally
 * batching rapid streaming updates into fewer scroll operations.
 *
 * Returns two callback-refs:
 *   - scrollRef  → attach to the scroll container (overflow-y-auto div)
 *   - contentRef → attach to the inner content wrapper
 */
export function useSnapScroll() {
  const autoScrollRef = useRef(true);
  const scrollNodeRef = useRef<HTMLDivElement | null>(null);
  const onScrollRef = useRef<(() => void) | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Callback-ref for the inner content container.
  // A ResizeObserver watches its size — when content grows (new tokens,
  // images loading, code blocks expanding), it snaps to bottom.
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      const observer = new ResizeObserver(() => {
        if (autoScrollRef.current && scrollNodeRef.current) {
          const { scrollHeight, clientHeight } = scrollNodeRef.current;
          scrollNodeRef.current.scrollTop = scrollHeight - clientHeight;
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  // Callback-ref for the outer scroll container.
  // A scroll event listener detects whether the user scrolled away from
  // the bottom (disabling auto-scroll) or back to it (re-enabling).
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    // Cleanup previous
    if (onScrollRef.current && scrollNodeRef.current) {
      scrollNodeRef.current.removeEventListener("scroll", onScrollRef.current);
    }
    onScrollRef.current = null;
    scrollNodeRef.current = null;

    if (node) {
      const handler = () => {
        const { scrollTop, scrollHeight, clientHeight } = node;
        const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
        // 10px threshold — if within 10px of bottom, auto-scroll stays on
        autoScrollRef.current = distanceFromBottom <= 10;
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
      const { scrollHeight, clientHeight } = scrollNodeRef.current;
      scrollNodeRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, []);

  // Expose the auto-scroll state for UI (scroll-to-bottom button)
  const isAutoScrolling = useCallback(() => autoScrollRef.current, []);

  return { scrollRef, contentRef, snapToBottom, isAutoScrolling };
}
