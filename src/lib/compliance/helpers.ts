function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mentionsProductName(text: string, productName: string): boolean {
  if (!productName.trim()) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(productName)}\\b`, "i");
  return pattern.test(text);
}

export function countOccurrences(text: string, needle: string): number {
  if (!needle.trim()) return 0;
  const pattern = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "gi");
  return (text.match(pattern) ?? []).length;
}

const URL_PATTERN = /\bhttps?:\/\/[^\s)]+/i;

export function containsUrl(text: string): boolean {
  return URL_PATTERN.test(text);
}

/** Index of the first product-name or product-URL mention, or -1 if absent. */
export function indexOfProductMention(text: string, productName: string, productUrl?: string): number {
  let earliest = -1;

  if (productName.trim()) {
    const nameMatch = text.match(new RegExp(`\\b${escapeRegExp(productName)}\\b`, "i"));
    if (nameMatch?.index !== undefined) earliest = nameMatch.index;
  }

  if (productUrl) {
    const urlIndex = text.indexOf(productUrl);
    if (urlIndex !== -1 && (earliest === -1 || urlIndex < earliest)) earliest = urlIndex;
  }

  return earliest;
}
