import { Routes, Route, useParams, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense, useRef } from 'react';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Footer from './components/layout/Footer';
import Toast from './components/overlays/Toast';
import TimerWidget from './components/overlays/TimerWidget';
import ShareModal from './components/overlays/ShareModal';
import ReportModal from './components/overlays/ReportModal';
import CollectionModal from './components/overlays/CollectionModal';
import NotificationDrawer from './components/overlays/NotificationDrawer';
import CookieConsentBanner from './components/overlays/CookieConsentBanner';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { LoadingPan } from './components/ui/LoadingPan';
import { useRecipeSocket } from './hooks/useRecipeSocket';
import { useAuth } from './contexts/AuthContext';
import HomeFeed from './components/home/HomeFeed';
import RecipeDetail from './components/detail/RecipeDetail';
import SearchDiscover from './components/search/SearchDiscover';
import AddRecipeFlow from './components/add/AddRecipeFlow';
import SavedRecipes from './components/saved/SavedRecipes';
import UserProfile from './components/profile/UserProfile';
import UsernameProfile from './components/profile/UsernameProfile';
import EditProfile from './components/profile/EditProfile';
import SettingsPage from './components/settings/Settings';
import LanguageSettings from './components/settings/LanguageSettings';

const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./components/auth/VerifyEmail'));
const PrivacyPolicy = lazy(() => import('./components/misc/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/misc/TermsOfService'));
const CookiePolicy = lazy(() => import('./components/misc/CookiePolicy'));
const About = lazy(() => import('./components/misc/About'));
const Contact = lazy(() => import('./components/misc/Contact'));
const CookieSettings = lazy(() => import('./components/misc/CookieSettings'));
const NotFound = lazy(() => import('./components/misc/NotFound'));
const CreatorVerification = lazy(() => import('./components/profile/CreatorVerification'));
const VerificationReview = lazy(() => import('./components/admin/VerificationReview'));
const AdminAnalytics = lazy(() => import('./components/admin/AdminAnalytics'));
const CreatorAnalytics = lazy(() => import('./components/profile/CreatorAnalytics'));
const PrivacySafety = lazy(() => import('./components/settings/PrivacySafety'));
const AdminReports = lazy(() => import('./components/admin/AdminReports'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingPan />
    </div>
  );
}

function EditRecipeWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <AddRecipeFlow editSlug={slug} />;
}

const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']);

export default function App() {
  const mainRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const location = useLocation();
  const { pulling, pullDistance } = usePullToRefresh(mainRef);
  useRecipeSocket();

  return (
    <div className="flex flex-col h-dvh overflow-hidden" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Header />
      {user && !user.emailVerified && (
        <Link to="/verify-email" className="shrink-0 px-4 py-2 text-center text-xs font-semibold bg-amber-100 text-amber-950 border-b border-amber-200">
          Verify your email address · Resend email
        </Link>
      )}
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
            <Route path="/settings/privacy-safety" element={<PrivacySafety />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/cookie-settings" element={<CookieSettings />} />
            <Route path="/settings/verification" element={<CreatorVerification />} />
            <Route path="/admin/verifications" element={<VerificationReview />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/creator/analytics" element={<CreatorAnalytics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        {!AUTH_PATHS.has(location.pathname) && <Footer />}
      </main>
      <BottomNav />
      <CookieConsentBanner />
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
