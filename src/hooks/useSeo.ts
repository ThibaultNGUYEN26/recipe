import { useEffect } from 'react';

const SITE_URL = 'https://recipe.thibault-nguyen.dev';
const DEFAULT_IMAGE = `${SITE_URL}/vite.svg`;

export interface SeoOptions {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) => element!.setAttribute(name, value));
}

function upsertCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = url;
}

export function useSeo({ title, description, path, image, type = 'website', noIndex = false }: SeoOptions) {
  useEffect(() => {
    const canonicalPath = path ?? window.location.pathname;
    const canonicalUrl = new URL(canonicalPath, SITE_URL).toString();
    const pageTitle = title.includes('Savor') ? title : `${title} — Savor`;
    const socialImage = image ? new URL(image, SITE_URL).toString() : DEFAULT_IMAGE;

    document.title = pageTitle;
    document.documentElement.lang = document.documentElement.lang || 'en';
    upsertCanonical(canonicalUrl);
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: noIndex ? 'noindex, nofollow' : 'index, follow' });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: pageTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: socialImage });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: pageTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: socialImage });
  }, [title, description, path, image, type, noIndex]);
}

export { SITE_URL };
