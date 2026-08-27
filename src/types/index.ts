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
  imageFocalPoint?: { x: number; y: number };
  category: { slug: string; label: string };
  info?: RecipeInfo;
  tags?: string[];
  authorId?: number | null;
  authorUsername?: string | null;
  authorIsVerified?: boolean;
  authorName?: string | null;
  authorAvatar?: string | null;
  isFollowing?: boolean;
  avgRating?: number | null;
  ratingCount?: number;
  likeCount?: number;
  isLiked?: boolean;
  commentCount?: number;
  makeCount?: number;
  savedCategory?: SavedCategory | null;
  recommendationReason?: string;
  recommendationReasonValue?: string;
  contentLanguage?: string;
  originalLanguage?: string;
  availableLanguages?: string[];
  isTranslated?: boolean;
}

export interface RecipeDetail extends RecipeListItem {
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  videoUrl?: string | null;
  sourcePlatform?: 'tiktok' | null;
  sourceUrl?: string | null;
  sourceAuthor?: string | null;
  sourceThumbnailUrl?: string | null;
  ingredients: IngredientSection[];
  instructions: InstructionStep[];
  tips?: string[];
  nutrition?: Record<string, string>;
  isSaved: boolean;
  savedCategoryId?: number | null;
  isLiked: boolean;
  myRating: number | null;
  ratingDistribution?: Record<number, number>;
}

export interface SavedCategory {
  id: number;
  name: string;
  recipeCount?: number;
}

export interface Comment {
  id: number;
  text: string;
  createdAt: string;
  parentId: number | null;
  likesCount: number;
  isLiked: boolean;
  author: { id: number; name: string | null; avatarUrl: string | null; isVerified: boolean };
  replies: Comment[];
}

export interface CommunityMake {
  id: number;
  rating: number | null;
  note: string | null;
  changes: string[];
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

export interface CommunityMakesResponse {
  count: number;
  entries: CommunityMake[];
  myEntry: CommunityMake | null;
}

export interface UserProfile {
  id: number;
  username: string | null;
  isVerified: boolean;
  name: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  followerCount: number;
  followingCount: number;
  recipeCount: number;
  isFollowing?: boolean;
  createdAt?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  name: string | null;
  avatarUrl?: string | null;
  preferredLanguage?: 'fr' | 'en' | 'es' | 'vi' | 'ar' | 'it' | 'zh' | 'de' | 'ko' | null;
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
