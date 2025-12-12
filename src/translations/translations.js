export const translations = {
  fr: {
    // HomePage
    title: "🍳 Carnet de Recettes 🍰",
    subtitle: "Découvrez mes meilleures recettes faites maison",
    categories: "Catégories",

    // CategoryList
    allCategories: "Toutes les catégories",
    recipesAvailable: "recettes disponibles",

    // RecipeList
    recipesIn: "Recettes dans",
    noRecipes: "Aucune recette disponible dans cette catégorie",

    // RecipeCard
    backToHome: "← Retour à l'accueil",
    information: "📋 Informations",
    preparation: "Préparation",
    cooking: "Cuisson",
    total: "Total",
    servings: "Portions",
    difficulty: "Difficulté",
    nutrition: "🥗 Valeurs nutritionnelles",
    perServing: "Par portion",
    calories: "Calories",
    proteins: "Protéines",
    fats: "Lipides",
    carbs: "Glucides",
    ingredients: "🛒 Ingrédients",
    instructions: "👨‍🍳 Instructions",
    tips: "💡 Astuces",
    tags: "🏷️ Tags",

    // SearchBar
    searchPlaceholder: "Rechercher une recette ou un ingrédient",

    // Difficulties
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",

    // Categories
    categories_list: {
      cakes: "Gâteaux",
      "main-dishes": "Plats principaux",
      appetizers: "Entrées",
      desserts: "Desserts",
      drinks: "Boissons",
      salads: "Salades"
    }
  },
  en: {
    // HomePage
    title: "🍳 Recipe Book 🍰",
    subtitle: "Discover my best homemade recipes",
    categories: "Categories",

    // CategoryList
    allCategories: "All categories",
    recipesAvailable: "recipes available",

    // RecipeList
    recipesIn: "Recipes in",
    noRecipes: "No recipes available in this category",

    // RecipeCard
    backToHome: "← Back to home",
    information: "📋 Information",
    preparation: "Preparation",
    cooking: "Cooking",
    total: "Total",
    servings: "Servings",
    difficulty: "Difficulty",
    nutrition: "🥗 Nutritional values",
    perServing: "Per serving",
    calories: "Calories",
    proteins: "Proteins",
    fats: "Fats",
    carbs: "Carbs",
    ingredients: "🛒 Ingredients",
    instructions: "👨‍🍳 Instructions",
    tips: "💡 Tips",
    tags: "🏷️ Tags",

    // SearchBar
    searchPlaceholder: "Search for a recipe or an ingredient...",

    // Difficulties
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",

    // Categories
    categories_list: {
      cakes: "Cakes",
      "main-dishes": "Main Dishes",
      appetizers: "Appetizers",
      desserts: "Desserts",
      drinks: "Drinks",
      salads: "Salads"
    }
  }
};

export const getTranslation = (language, key) => {
  const keys = key.split('.');
  let value = translations[language];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  return value || key;
};
