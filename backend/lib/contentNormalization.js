export function normalizeTags(value, { maxTags = 20, maxLength = 40 } = {}) {
  if (!Array.isArray(value)) return [];
  const normalized = [];
  const seen = new Set();
  for (const rawTag of value) {
    const tag = String(rawTag ?? "")
      .normalize("NFKC")
      .replace(/^#+/, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();
    if (!tag || tag.length > maxLength || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
    if (normalized.length >= maxTags) break;
  }
  return normalized;
}

export function normalizeCategoryInput(value) {
  const label = typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return { label, slug };
}
