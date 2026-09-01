import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/recipe-page.js';

const SHELL = '<!doctype html><html lang="en"><head><title>Savor</title><meta name="description" content="old"><meta name="robots" content="index, follow"><link rel="canonical" href="https://recipe.thibault-nguyen.dev/"><meta property="og:title" content="old"><meta property="og:description" content="old"><meta property="og:type" content="website"><meta property="og:url" content="old"><meta property="og:image" content="old"></head><body><div id="root"></div></body></html>';

function responseRecorder() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    send(body) { this.body = body; return this; },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('recipe page metadata renderer', () => {
  it('puts recipe metadata and structured data in the initial HTML', async () => {
    const recipe = {
      slug: 'pancakes', title: 'Pancakes', description: 'Light and fluffy.', image: '/uploads/pancakes.webp',
      authorUsername: 'chef', authorName: 'Chef Example', isPublic: true, contentLanguage: 'en',
      info: { prepTime: '10 min', cookTime: '15 min', servings: 4 }, category: { label: 'Breakfast' },
      ingredients: [{ items: ['2 eggs', '1 cup flour'] }], instructions: [{ step: 1, text: 'Mix.' }],
      tags: ['breakfast'], ratingCount: 2, avgRating: 4.5,
    };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(SHELL, { status: 200 }))
      .mockResolvedValueOnce(Response.json(recipe)));
    const res = responseRecorder();

    await handler({ query: { username: 'chef', slug: 'pancakes' }, headers: { host: 'recipe.example', 'x-forwarded-proto': 'https' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<title>Pancakes — Savor</title>');
    expect(res.body).toContain('content="Light and fluffy."');
    expect(res.body).toContain('https://recipe.thibault-nguyen.dev/chef/pancakes');
    expect(res.body).toContain('https://recipe-production-4bd0.up.railway.app/uploads/pancakes.webp');
    expect(res.body).toContain('application/ld+json');
    expect(res.body).toContain('"@type":"Recipe"');
    expect(res.headers['Cache-Control']).toContain('s-maxage=300');
  });

  it('does not expose metadata for a private recipe', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(SHELL, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ slug: 'draft', isPublic: false })));
    const res = responseRecorder();

    await handler({ query: { slug: 'draft' }, headers: { host: 'recipe.example' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(SHELL);
    expect(res.body).not.toContain('application/ld+json');
  });
});
