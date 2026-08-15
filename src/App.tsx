import { Routes, Route, useParams } from 'react-router-dom';
import { lazy, Suspense, useRef } from 'react';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Toast from './components/overlays/Toast';
import TimerWidget from './components/overlays/TimerWidget';
import ShareModal from './components/overlays/ShareModal';
import ReportModal from './components/overlays/ReportModal';
import CollectionModal from './components/overlays/CollectionModal';
import NotificationDrawer from './components/overlays/NotificationDrawer';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useRecipeSocket } from './hooks/useRecipeSocket';

const HomeFeed = lazy(() => import('./components/home/HomeFeed'));
const RecipeDetail = lazy(() => import('./components/detail/RecipeDetail'));
const SearchDiscover = lazy(() => import('./components/search/SearchDiscover'));
const AddRecipeFlow = lazy(() => import('./components/add/AddRecipeFlow'));
const SavedRecipes = lazy(() => import('./components/saved/SavedRecipes'));
const UserProfile = lazy(() => import('./components/profile/UserProfile'));
const UsernameProfile = lazy(() => import('./components/profile/UsernameProfile'));
const EditProfile = lazy(() => import('./components/profile/EditProfile'));
const SettingsPage = lazy(() => import('./components/settings/Settings'));
const LanguageSettings = lazy(() => import('./components/settings/LanguageSettings'));
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const PrivacyPolicy = lazy(() => import('./components/misc/PrivacyPolicy'));
const CreatorVerification = lazy(() => import('./components/profile/CreatorVerification'));
const VerificationReview = lazy(() => import('./components/admin/VerificationReview'));
const CreatorAnalytics = lazy(() => import('./components/profile/CreatorAnalytics'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-amber-800 border-t-transparent animate-spin" />
    </div>
  );
}

function EditRecipeWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <AddRecipeFlow editSlug={slug} />;
}

export default function App() {
  const mainRef = useRef<HTMLElement>(null);
  const { pulling, pullDistance } = usePullToRefresh(mainRef);
  useRecipeSocket();

  return (
    <div className="flex flex-col h-dvh overflow-hidden" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Header />
      <main ref={mainRef} className="flex-1 overflow-y-auto flex flex-col" style={{ overflowX: 'clip' }}>
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center transition-all duration-200 overflow-hidden"
          style={{ height: pullDistance > 0 ? pullDistance : 0 }}
        >
          <div className={`w-6 h-6 rounded-full border-2 border-amber-800 border-t-transparent ${pulling ? 'animate-spin' : ''}`}
            style={{ opacity: pullDistance > 10 ? Math.min(pullDistance / 72, 1) : 0 }} />
        </div>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/recipe/:slug" element={<RecipeDetail />} />
            <Route path="/:username/:recipeSlug" element={<RecipeDetail />} />
            <Route path="/search" element={<SearchDiscover />} />
            <Route path="/add-recipe" element={<AddRecipeFlow />} />
            <Route path="/edit-recipe/:slug" element={<EditRecipeWrapper />} />
            <Route path="/my-recipes" element={<SavedRecipes />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/u/:username" element={<UsernameProfile />} />
            <Route path="/settings/profile" element={<EditProfile />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/language" element={<LanguageSettings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/settings/verification" element={<CreatorVerification />} />
            <Route path="/admin/verifications" element={<VerificationReview />} />
            <Route path="/creator/analytics" element={<CreatorAnalytics />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
      {/* Global overlays */}
      <Toast />
      <TimerWidget />
      <ShareModal />
      <ReportModal />
      <CollectionModal />
      <NotificationDrawer />
    </div>
  );
}
