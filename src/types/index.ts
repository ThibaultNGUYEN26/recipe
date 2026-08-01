export type Difficulty = 'Facile' | 'Moyen' | 'Difficile' | 'Chef' | 'Easy' | 'Medium' | 'Hard';
export type DietaryTag = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'low-carb' | 'nut-free' | 'keto';

export interface RecipeInfo {
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  difficulty?: Difficulty;
}

export interface IngredientSection {
  section: string;
  items: string[];
}

export interface InstructionStep {
  step: number;
  text: string;
  timerMinutes?: number;
}

export interface RecipeListItem {
  slug: string;
  title: string;
  description?: string;
  image: string | null;
  category: { slug: string; label: string };
  info?: RecipeInfo;
  tags?: string[];
  authorId?: number | null;
  authorName?: string | null;
  authorAvatar?: string | null;
  avgRating?: number | null;
  ratingCount?: number;
}

export interface RecipeDetail extends RecipeListItem {
  videoUrl?: string | null;
  ingredients: IngredientSection[];
  instructions: InstructionStep[];
  tips?: string[];
  nutrition?: Record<string, string>;
  isSaved: boolean;
  isLiked: boolean;
  myRating: number | null;
  ratingDistribution?: Record<number, number>;
}

export interface Comment {
  id: number;
  text: string;
  createdAt: string;
  parentId: number | null;
  likesCount: number;
  isLiked: boolean;
  author: { id: number; name: string | null; avatarUrl: string | null };
  replies: Comment[];
}

export interface UserProfile {
  id: number;
  name: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  followerCount: number;
  followingCount: number;
  recipeCount: number;
  createdAt?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
}

export interface ToastData {
  id: number;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'info';
}

export interface TimerData {
  title: string;
  totalSeconds: number;
  remainingSeconds: number;
  recipeTitle: string;
}

export interface Category {
  id: number;
  slug: string;
  label: string;
}
