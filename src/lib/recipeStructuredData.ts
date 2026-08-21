import type { RecipeDetail } from '../types';
import { SITE_URL } from '../hooks/useSeo';

function isoDuration(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase().replace(',', '.');
  const hours = normalized.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour|heure)/)?.[1];
  const minutes = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|min|minute)/)?.[1];
  if (!hours && !minutes) return undefined;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}`;
}

function nutritionData(nutrition?: Record<string, string>) {
  if (!nutrition) return undefined;
  const aliases: Record<string, string> = {
    calories: 'calories',
    calorie: 'calories',
    protein: 'proteinContent',
    proteins: 'proteinContent',
    proteines: 'proteinContent',
    fat: 'fatContent',
    fats: 'fatContent',
    lipides: 'fatContent',
    carbohydrates: 'carbohydrateContent',
    carbs: 'carbohydrateContent',
    glucides: 'carbohydrateContent',
    fiber: 'fiberContent',
    fibre: 'fiberContent',
    sugar: 'sugarContent',
    sugars: 'sugarContent',
    sodium: 'sodiumContent',
  };
  const result: Record<string, string> = { '@type': 'NutritionInformation' };
  for (const [key, value] of Object.entries(nutrition)) {
    const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (aliases[normalizedKey] && value) result[aliases[normalizedKey]] = value;
  }
  return Object.keys(result).length > 1 ? result : undefined;
}

export function recipeStructuredData(recipe: RecipeDetail, imageUrl: string | null) {
  const canonicalPath = recipe.authorUsername
    ? `/${encodeURIComponent(recipe.authorUsername)}/${encodeURIComponent(recipe.slug)}`
    : `/recipe/${encodeURIComponent(recipe.slug)}`;
  const info = recipe.info;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': `${new URL(canonicalPath, SITE_URL)}#recipe`,
    url: new URL(canonicalPath, SITE_URL).toString(),
    name: recipe.title,
    description: recipe.description,
    image: imageUrl ? [imageUrl] : undefined,
    author: recipe.authorName || recipe.authorUsername ? {
      '@type': 'Person',
      name: recipe.authorName || recipe.authorUsername,
    } : { '@type': 'Organization', name: 'Savor' },
    datePublished: recipe.createdAt,
    dateModified: recipe.updatedAt,
    prepTime: isoDuration(info?.prepTime),
    cookTime: isoDuration(info?.cookTime),
    totalTime: isoDuration(info?.totalTime),
    recipeYield: info?.servings ? `${info.servings} servings` : undefined,
    recipeCategory: recipe.category?.label,
    keywords: recipe.tags?.join(', '),
    inLanguage: recipe.contentLanguage,
    recipeIngredient: recipe.ingredients.flatMap((section) => section.items),
    recipeInstructions: recipe.instructions.map((instruction) => ({
      '@type': 'HowToStep',
      position: instruction.step,
      text: instruction.text,
    })),
    nutrition: nutritionData(recipe.nutrition),
    aggregateRating: recipe.avgRating && recipe.ratingCount ? {
      '@type': 'AggregateRating',
      ratingValue: recipe.avgRating,
      ratingCount: recipe.ratingCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  };

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

export function serializeStructuredData(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
