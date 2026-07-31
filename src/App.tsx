import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Toast from './components/overlays/Toast';
import TimerWidget from './components/overlays/TimerWidget';
import ShareModal from './components/overlays/ShareModal';
import ReportModal from './components/overlays/ReportModal';
import CollectionModal from './components/overlays/CollectionModal';
import NotificationDrawer from './components/overlays/NotificationDrawer';

const HomeFeed = lazy(() => import('./components/home/HomeFeed'));
const RecipeDetail = lazy(() => import('./components/detail/RecipeDetail'));
const SearchDiscover = lazy(() => import('./components/search/SearchDiscover'));
const AddRecipeFlow = lazy(() => import('./components/add/AddRecipeFlow'));
const SavedRecipes = lazy(() => import('./components/saved/SavedRecipes'));
const UserProfile = lazy(() => import('./components/profile/UserProfile'));
const EditProfile = lazy(() => import('./components/profile/EditProfile'));
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const PrivacyPolicy = lazy(() => import('./components/misc/PrivacyPolicy'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-amber-800 border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Header />
      <main className="flex-1">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/recipe/:slug" element={<RecipeDetail />} />
            <Route path="/search" element={<SearchDiscover />} />
            <Route path="/add-recipe" element={<AddRecipeFlow />} />
            <Route path="/my-recipes" element={<SavedRecipes />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/settings/profile" element={<EditProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
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
