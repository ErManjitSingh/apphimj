/** Turn arrays, HTML blobs, or bullet strings into clean line lists. */
export function normalizeInclusionExclusionList(value) {
  if (value == null || value === '') return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (item == null) return [];
        if (typeof item === 'string' || typeof item === 'number') {
          return normalizeInclusionExclusionList(String(item));
        }
        if (typeof item === 'object') {
          const text = item.text || item.label || item.title || item.name || item.value || '';
          return text ? normalizeInclusionExclusionList(text) : [];
        }
        return [];
      })
      .map((line) => String(line || '').trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string' && typeof value !== 'number') return [];

  const text = String(value)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\r/g, '')
    .trim();

  if (!text) return [];

  return text
    .split(/\n+|•|\u2022|(?:^|\s)[-–—*]\s+/)
    .map((line) => line.replace(/^\d+[.)]\s+/, '').trim())
    .filter((line) => line.length > 1);
}

export function cleanInclusionExclusionLines(items = []) {
  return normalizeInclusionExclusionList(items);
}

/** Prefer the first non-empty list among candidates (arrays, strings, HTML). */
export function pickInclusionExclusionList(...candidates) {
  for (const candidate of candidates) {
    const lines = normalizeInclusionExclusionList(candidate);
    if (lines.length) return lines;
  }
  return [];
}
