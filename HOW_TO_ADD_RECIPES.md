# Recipe Notebook - How to Add New Recipes

## Quick Start

Your recipe notebook is now set up! Here's how to add new recipes:

## 📝 Adding a New Recipe

### Step 1: Copy the Template
1. Open `RECIPE_TEMPLATE.json` (in the root folder)
2. Copy the entire content

### Step 2: Create Your Recipe File
1. Navigate to `src/recipes/[category]/`
2. Create a new file with the extension `.json` (e.g., `chocolate-cake.json`)
3. Paste the template content

### Step 3: Fill in Your Recipe
Replace the template values with your actual recipe information:

```json
{
  "name": "Your Recipe Name",
  "category": "cakes",  // Must match folder name
  "description": "A delicious description",
  "image": "🍰",  // Use an emoji or leave empty
  "info": {
    "prepTime": "20 min",
    "cookTime": "30 min",
    "totalTime": "50 min",
    "servings": 8,
    "difficulty": "Medium"
  },
  // ... rest of the fields
}
```

## 📁 Folder Structure

```
src/recipes/
├── cakes/              # Desserts and cakes
│   └── brookie.json
├── main-dishes/        # Main courses
├── appetizers/         # Starters and appetizers
├── drinks/             # Beverages
├── breakfast/          # Breakfast recipes
└── snacks/             # Snacks and light bites
```

## 🎨 Categories Available

- **cakes** - Cakes & Desserts 🍰
- **main-dishes** - Main Dishes 🍝
- **appetizers** - Appetizers 🥗
- **drinks** - Drinks & Beverages 🍹
- **breakfast** - Breakfast 🥞
- **snacks** - Snacks 🍿

## 📋 Recipe Fields Explained

### Required Fields:
- **name**: Recipe title
- **category**: Must match one of the folder names
- **description**: Brief description (1-2 sentences)
- **image**: Emoji or leave empty for default 🍽️

### Info Object:
- **prepTime**: Preparation time (e.g., "20 min")
- **cookTime**: Cooking time (e.g., "30 min")
- **totalTime**: Total time (e.g., "50 min")
- **servings**: Number of people (e.g., 8)
- **difficulty**: Easy, Medium, or Hard

### Nutrition Object:
Nutritional information per serving

### Ingredients Array:
Organize by sections (e.g., "For the base", "For the topping")
```json
"ingredients": [
  {
    "section": "Section Name",
    "items": ["ingredient 1", "ingredient 2"]
  }
]
```

### Instructions Array:
Step-by-step instructions
```json
"instructions": [
  {
    "step": 1,
    "text": "Instruction text here"
  }
]
```

### Optional Fields:
- **tips**: Array of helpful tips
- **tags**: Array of keywords (e.g., ["dessert", "chocolate"])

## 🚀 Running the App

```bash
npm run dev
```

Then open your browser to see your recipes!

## 💡 Tips

1. **File naming**: Use lowercase with hyphens (e.g., `chocolate-chip-cookies.json`)
2. **Category matching**: Make sure the `category` field matches the folder name exactly
3. **Valid JSON**: Make sure your JSON is valid (no trailing commas, proper quotes)
4. **Emojis**: Use food emojis for the image field for a fun look!

## Example Workflow

1. Want to add a new cake?
2. Go to `src/recipes/cakes/`
3. Create `my-cake.json`
4. Copy from `RECIPE_TEMPLATE.json`
5. Fill in your recipe details
6. Save and refresh your app!

## 🐛 Troubleshooting

**Recipe not showing up?**
- Check that the file ends with `.json`
- Verify the category field matches the folder name
- Make sure the JSON is valid

**Category is empty?**
- Add at least one `.json` file in that category folder
- Refresh the page

Enjoy your recipe notebook! 🎉
