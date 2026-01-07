import React from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import './Index.css';
import HomePage from './components/HomePage/HomePage';
import RecipeCard from './components/RecipeCard/RecipeCard';
import SettingsMenu from './components/SettingsMenu/SettingsMenu';
import { useLanguage } from './contexts/LanguageContext';

// Recipe page component that loads the recipe by ID
function RecipePage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [recipe, setRecipe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadRecipe = async () => {
      try {
        const recipeModules = import.meta.glob('../recipes/**/*.json', { as: 'raw' });
        const imageModules = import.meta.glob('../recipes/**/*.png', { eager: true, import: 'default' });

        for (const path in recipeModules) {
          const pathParts = path.split('/');
          const recipeName = pathParts[pathParts.length - 2];
          
          if (recipeName === recipeId) {
            const fileName = path.split('/').pop();
            
            // Check if file matches language or has no language suffix
            const hasLanguageSuffix = fileName.includes('.fr.json') || fileName.includes('.en.json');
            const expectedSuffix = `.${language}.json`;
            
            if (hasLanguageSuffix && !fileName.endsWith(expectedSuffix)) {
              continue; // Skip files not matching current language
            }
            if (!hasLanguageSuffix && language === 'en') {
              continue; // Old format files are French only
            }
            
            const content = await recipeModules[path]();
            const recipeData = JSON.parse(content);
            
            const imagePath = path.replace(/\.(fr|en)?\.json$/, '.png');
            const recipeImage = imageModules[imagePath] || null;
            
            setRecipe({
              ...recipeData,
              id: recipeName,
              imagePath: recipeImage
            });
            setLoading(false);
            return;
          }
        }
        
        // Recipe not found, redirect to home
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Error loading recipe:', error);
        navigate('/', { replace: true });
      }
    };

    loadRecipe();
  }, [recipeId, language, navigate]);

  if (loading) {
    return <div className="recipe-container">Loading...</div>;
  }

  return (
    <div className="recipe-container">
      <RecipeCard
        recipe={recipe}
        onBack={() => navigate('/')}
      />
    </div>
  );
}

// Home page wrapper
function HomePageWrapper() {
  const navigate = useNavigate();

  const handleSelectRecipe = (recipe) => {
    navigate(`/${recipe.id}`);
  };

  return (
    <div className="recipe-container">
      <SettingsMenu />
      <HomePage onSelectRecipe={handleSelectRecipe} />
    </div>
  );
}

function Index() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePageWrapper />} />
        <Route path="/:recipeId" element={<RecipePage />} />
      </Routes>
    </HashRouter>
  );
}

export default Index;
