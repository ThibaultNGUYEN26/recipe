const TIKTOK_HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);

const INGREDIENT_HEADERS = /^(ingredients?|ingrédients?|ingredientes?)\s*:?[\s]*$/i;
const INSTRUCTION_HEADERS = /^(instructions?|method|directions?|préparation|méthode|instrucciones?|preparación|pasos?)\s*:?[\s]*$/i;
const UNIT_PATTERN = "g|kg|mg|ml|cl|l|oz|lb|lbs|cup|cups|tbsp|tsp|tablespoons?|teaspoons?|c\.\s*à\s*s\.|c\.\s*à\s*c\.|tazas?|cucharadas?|cucharaditas?";
const AMOUNT_PATTERN = "\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]+";

export function validateTikTokUrl(input) {
  let url;
  try {
    const raw = String(input || "").trim();
    const sharedUrl = raw.match(/https:\/\/[^\s<>]+/i)?.[0] || raw;
    url = new URL(sharedUrl.replace(/[),.!?]+$/, ""));
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !TIKTOK_HOSTS.has(hostname) || url.username || url.password || url.port) return null;
  if (hostname.endsWith("tiktok.com") && url.pathname === "/") return null;
  url.hash = "";
  return url.toString();
}

const SHORT_TIKTOK_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);
const TRACKING_PARAMS = new Set([
  "_r", "_t", "is_from_webapp", "sender_device", "sender_web_id",
  "share_app_id", "share_link_id", "refer", "referer_url", "timestamp",
]);

function cleanTikTokUrl(input) {
  const validated = validateTikTokUrl(input);
  if (!validated) return null;
  const url = new URL(validated);
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

export async function resolveTikTokUrl(input, fetchImpl = fetch) {
  let current = cleanTikTokUrl(input);
  if (!current) return null;

  for (let hop = 0; hop < 4; hop += 1) {
    const url = new URL(current);
    const needsExpansion = SHORT_TIKTOK_HOSTS.has(url.hostname) || url.pathname.startsWith("/t/");
    if (!needsExpansion) return cleanTikTokUrl(current);

    let response;
    try {
      response = await fetchImpl(current, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SavorRecipe/1.0)" },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      return current;
    }
    const location = response.headers?.get?.("location");
    if (!location) return current;
    const next = cleanTikTokUrl(new URL(location, current).toString());
    if (!next) return current;
    current = next;
  }
  return current;
}

function cleanLine(line) {
  return line
    .replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIngredient(line) {
  const cleaned = cleanLine(line);
  const match = cleaned.match(new RegExp(`^(${AMOUNT_PATTERN})?\\s*(${UNIT_PATTERN})?\\s+(.+)$`, "i"));
  if (!match) return { amount: "", unit: "", name: cleaned };
  return { amount: match[1] || "", unit: match[2] || "", name: match[3]?.trim() || cleaned };
}

function splitSentences(value) {
  return String(value || "")
    .split(/(?<=[.!?])\s+/)
    .map(cleanLine)
    .filter(Boolean);
}

const INLINE_SECTION_PATTERN = /(?:\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?\s*)?(ingr[eé]dients?|ingredients?|pr[eé]paration|instructions?|m[eé]thode|method|directions?|avant\s+d[’']enfourner|cuisson)\s*:/giu;
const INLINE_INGREDIENT_BOUNDARY = /\b(?:ar[oô]me|gros\s+morceaux?|optionnel(?:le)?|beurre\s+de)\b/giu;

function sectionKind(label) {
  return /^(?:ingr[eé]dients?|ingredients?)$/iu.test(label.trim()) ? "ingredients" : "instructions";
}

function extractInlineSections(caption) {
  const matches = [...caption.matchAll(INLINE_SECTION_PATTERN)];
  if (!matches.length) return null;

  const sections = matches.map((match, index) => ({
    kind: sectionKind(match[1]),
    label: match[1],
    text: caption.slice(match.index + match[0].length, matches[index + 1]?.index ?? caption.length).trim(),
  }));

  return {
    title: caption.slice(0, matches[0].index).trim(),
    ingredientText: sections.filter((section) => section.kind === "ingredients").map((section) => section.text).join(" "),
    instructionSections: sections.filter((section) => section.kind === "instructions"),
  };
}

function topLevelMatches(value, pattern) {
  const matches = [];
  let depth = 0;
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    while (cursor < match.index) {
      if (value[cursor] === "(") depth += 1;
      if (value[cursor] === ")") depth = Math.max(0, depth - 1);
      cursor += 1;
    }
    if (depth === 0) matches.push(match);
  }
  return matches;
}

function parseInlineIngredients(value) {
  const ingredientText = String(value || "").replace(/\s+/g, " ").trim();
  if (!ingredientText) return [];

  const amountStarts = topLevelMatches(
    ingredientText,
    new RegExp(`(?:^|\\s)(?:environ\\s+)?(?=${AMOUNT_PATTERN}(?:\\s|(?=${UNIT_PATTERN}\\b)))`, "giu"),
  );
  const wordStarts = topLevelMatches(ingredientText, INLINE_INGREDIENT_BOUNDARY);
  const starts = [...new Set([
    0,
    ...amountStarts.map((match) => match.index + (match[0].startsWith(" ") ? 1 : 0)),
    ...wordStarts.map((match) => match.index),
  ])].sort((a, b) => a - b);

  const chunks = starts
    .map((start, index) => ingredientText.slice(start, starts[index + 1] ?? ingredientText.length).trim())
    .filter(Boolean);
  const mergedChunks = [];
  for (const chunk of chunks) {
    const previous = mergedChunks.at(-1);
    if (previous && /\b(?:ou|or)\s*$/iu.test(previous)) mergedChunks[mergedChunks.length - 1] = `${previous} ${chunk}`;
    else mergedChunks.push(chunk);
  }

  return mergedChunks
    .map((item) => parseIngredient(item.replace(/^environ\s+/iu, "")))
    .filter((item) => item.name);
}

function parseDenseCaption(caption) {
  const withoutTags = caption.replace(/\s+(?:#\S+\s*)+$/u, "").trim();
  const firstAmount = new RegExp(`(?:^|\\s)(${AMOUNT_PATTERN})\\s+(?=(?:${UNIT_PATTERN})\\b|[A-Za-zÀ-ÿ])`, "i").exec(withoutTags);
  if (!firstAmount || firstAmount.index < 2) return null;

  const amountStart = firstAmount.index + (firstAmount[0].startsWith(" ") ? 1 : 0);
  const title = withoutTags.slice(0, amountStart).trim();
  const afterTitle = withoutTags.slice(amountStart);
  const instructionStart = /\b(?:in a (?:pan|pot|bowl)|first,|then,|next,|heat\b|mix\b|combine\b|cook\b|bake\b|add\b)/i.exec(afterTitle);
  if (!instructionStart) return null;

  const ingredientText = afterTitle.slice(0, instructionStart.index).trim();
  const cookingAndTips = afterTitle.slice(instructionStart.index).trim();
  const [cookingText, ...tipParts] = cookingAndTips.split(/\s*👀\s*|\s+(?:tip|tips|conseil|conseils|consejo|consejos)\s*:\s*/i);
  const marker = new RegExp(`(${AMOUNT_PATTERN})\\s+(?:(${UNIT_PATTERN})\\s+)?`, "gi");
  const matches = [...ingredientText.matchAll(marker)];
  const ingredients = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : ingredientText.length;
    const chunk = ingredientText.slice(start, end).trim();
    const tailStart = chunk.search(/\s+(?=(?:Salt|Pepper|Parsley|Cilantro|Coriander|Basil|Oil|Water)\b)/);
    const measured = tailStart > 0 ? chunk.slice(0, tailStart).trim() : chunk;
    const unmeasured = tailStart > 0 ? chunk.slice(tailStart).trim() : "";
    ingredients.push(parseIngredient(measured));
    if (unmeasured) ingredients.push({ amount: "", unit: "", name: unmeasured });
  }

  return {
    title,
    ingredients: ingredients.filter((item) => item.name),
    instructions: splitSentences(cookingText).map((text, index) => ({ step: index + 1, text })),
    tips: splitSentences(tipParts.join(" ")),
  };
}

function draftTitle(caption, fallbackTitle) {
  const candidate = String(caption || fallbackTitle || "")
    .split(/\r?\n/)
    .map(cleanLine)
    .find((line) => line && !INGREDIENT_HEADERS.test(line) && !INSTRUCTION_HEADERS.test(line));
  const withoutTags = String(candidate || "Imported TikTok recipe").replace(/\s*#\S+(?:\s+#\S+)*\s*$/, "").trim();
  return withoutTags.slice(0, 120) || "Imported TikTok recipe";
}

export function captionToRecipeDraft(caption, fallbackTitle) {
  const rawCaption = String(caption || "").trim();
  const contentCaption = rawCaption.replace(/\s+(?:#[\p{L}\p{N}_]+\s*)+$/u, "").trim();
  const tags = [...new Set(
    [...rawCaption.matchAll(/#([\p{L}\p{N}_]+)/gu)]
      .map((match) => match[1].toLowerCase()),
  )];
  const lines = contentCaption.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let section = "description";
  const ingredientLines = [];
  const instructionLines = [];

  for (const line of lines) {
    if (INGREDIENT_HEADERS.test(cleanLine(line))) {
      section = "ingredients";
      continue;
    }
    if (INSTRUCTION_HEADERS.test(cleanLine(line))) {
      section = "instructions";
      continue;
    }
    if (section === "ingredients") ingredientLines.push(line);
    if (section === "instructions") instructionLines.push(line);
  }

  const inline = !ingredientLines.length && !instructionLines.length ? extractInlineSections(contentCaption) : null;
  const dense = !inline && !ingredientLines.length && !instructionLines.length ? parseDenseCaption(contentCaption) : null;
  const title = inline?.title ? draftTitle(inline.title, fallbackTitle) : dense?.title || draftTitle(contentCaption, fallbackTitle);
  const ingredients = inline
    ? parseInlineIngredients(inline.ingredientText)
    : dense?.ingredients || ingredientLines.map(parseIngredient).filter((item) => item.name);
  const instructions = inline
    ? inline.instructionSections.flatMap((section) => splitSentences(section.text)).map((text, index) => ({ step: index + 1, text }))
    : dense?.instructions || instructionLines.map(cleanLine).filter(Boolean).map((text, index) => ({ step: index + 1, text }));
  const tips = dense?.tips || [];
  const warnings = [];
  if (!ingredients.length) warnings.push("No structured ingredient list was found in the TikTok caption.");
  if (!instructions.length) warnings.push("No structured preparation steps were found in the TikTok caption.");

  return {
    title,
    description: rawCaption,
    ingredients,
    instructions,
    tips,
    tags,
    warnings,
  };
}

export async function fetchTikTokImport(input, fetchImpl = fetch) {
  const sourceUrl = await resolveTikTokUrl(input, fetchImpl);
  if (!sourceUrl) {
    const error = new Error("Enter a valid TikTok video URL");
    error.status = 400;
    throw error;
  }

  const endpoint = new URL("https://www.tiktok.com/oembed");
  endpoint.searchParams.set("url", sourceUrl);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; SavorRecipe/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    response = null;
  }
  if (response?.status === 404) {
    const error = new Error("TikTok could not find that public video");
    error.status = 404;
    throw error;
  }
  if (!response?.ok) {
    const draft = captionToRecipeDraft("", "Imported TikTok recipe");
    draft.warnings.unshift("TikTok metadata is temporarily unavailable. The source link is connected; complete the recipe manually.");
    return {
      source: { platform: "tiktok", url: sourceUrl, author: null, authorUrl: null, thumbnailUrl: null, caption: "" },
      draft,
    };
  }
  const metadata = await response.json();
  const caption = String(metadata.title || "").trim();

  return {
    source: {
      platform: "tiktok",
      url: sourceUrl,
      author: String(metadata.author_name || "").trim() || null,
      authorUrl: String(metadata.author_url || "").trim() || null,
      thumbnailUrl: String(metadata.thumbnail_url || "").trim() || null,
      caption,
    },
    draft: captionToRecipeDraft(caption, metadata.title),
  };
}
