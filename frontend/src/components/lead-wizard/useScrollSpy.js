import { useEffect, useState } from 'react';

/**
 * Tracks which of the given (static) element ids is currently topmost in the viewport.
 * Purely a visual highlight for the step progress indicator — the form itself is one
 * continuous scrollable page, so this never gates or changes what's rendered.
 */
export function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(ids[0]);

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
        setActiveId(topMost.target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
