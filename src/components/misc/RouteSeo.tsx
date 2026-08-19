import { useLocation } from 'react-router-dom';
import { useSeo } from '../../hooks/useSeo';

const PUBLIC_META: Record<string, { title: string; description: string; canonical?: string }> = {
  '/': { title: 'Savor — Social Recipes', description: 'Discover, save and share recipes with a community of home cooks.' },
  '/search': { title: 'Discover recipes', description: 'Search recipes, ingredients, categories and creators on Savor.' },
  '/about': { title: 'About Savor', description: 'Learn how Savor became a social recipe notebook for sharing food with friends.' },
  '/contact': { title: 'Contact Savor', description: 'Contact the Savor team for support, feedback or questions.' },
  '/privacy-policy': { title: 'Privacy Policy', description: 'Learn how Savor collects, uses and protects personal information.' },
  '/privacy': { title: 'Privacy Policy', description: 'Learn how Savor collects, uses and protects personal information.', canonical: '/privacy-policy' },
  '/terms': { title: 'Terms of Service', description: 'Read the terms governing access to and use of Savor.' },
  '/cookies': { title: 'Cookie Policy', description: 'Learn which cookies Savor uses and how you can control them.' },
  '/cookie-settings': { title: 'Cookie settings', description: 'Review and update your cookie preferences for Savor.' },
};

const PRIVATE_PREFIXES = ['/add-recipe', '/edit-recipe/', '/my-recipes', '/settings', '/admin/', '/creator/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export default function RouteSeo() {
  const { pathname } = useLocation();
  const meta = PUBLIC_META[pathname];
  const isRecipe = pathname.startsWith('/recipe/') || /^\/[^/]+\/[^/]+$/.test(pathname);
  const isProfile = pathname.startsWith('/u/') || pathname.startsWith('/profile/');
  const noIndex = PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

  useSeo(meta ? {
    title: meta.title,
    description: meta.description,
    path: meta.canonical ?? pathname,
  } : isRecipe ? {
    title: 'Recipe',
    description: 'View ingredients, instructions and community tips for this recipe on Savor.',
    path: pathname,
    type: 'article',
  } : isProfile ? {
    title: 'Creator profile',
    description: 'Discover recipes shared by this creator on Savor.',
    path: pathname,
    type: 'profile',
  } : {
    title: noIndex ? 'Savor' : 'Page not found',
    description: noIndex ? 'Manage your Savor account.' : 'The requested page could not be found on Savor.',
    path: pathname,
    noIndex: true,
  });

  return null;
}
