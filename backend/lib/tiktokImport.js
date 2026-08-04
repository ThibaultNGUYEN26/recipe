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
    url = new URL(String(input || "").trim());
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !TIKTOK_HOSTS.has(hostname) || url.username || url.password || url.port) return null;
  if (hostname.endsWith("tiktok.com") && url.pathname === "/") return null;
  url.hash = "";
  return url.toString();
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
  const tags = [...new Set(
    [...rawCaption.matchAll(/#([\p{L}\p{N}_]+)/gu)]
      .map((match) => match[1].toLowerCase()),
  )];
  const lines = rawCaption.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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

  const dense = !ingredientLines.length && !instructionLines.length ? parseDenseCaption(rawCaption) : null;
  const title = dense?.title || draftTitle(rawCaption, fallbackTitle);
  const ingredients = dense?.ingredients || ingredientLines.map(parseIngredient).filter((item) => item.name);
  const instructions = dense?.instructions || instructionLines.map(cleanLine).filter(Boolean).map((text, index) => ({ step: index + 1, text }));
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
  const sourceUrl = validateTikTokUrl(input);
  if (!sourceUrl) {
    const error = new Error("Enter a valid TikTok video URL");
    error.status = 400;
    throw error;
  }

  const endpoint = new URL("https://www.tiktok.com/oembed");
  endpoint.searchParams.set("url", sourceUrl);
  const response = await fetchImpl(endpoint, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    const error = new Error("TikTok could not find that public video");
    error.status = response.status === 404 ? 404 : 502;
    throw error;
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
