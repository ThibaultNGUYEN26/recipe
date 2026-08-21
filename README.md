# React + Vite

## Google authentication

Create an OAuth 2.0 **Web application** client in Google Cloud, then add each frontend URL (for example `http://localhost:5173`) as an authorized JavaScript origin.

Use that same client ID in both environment files:

```env
# .env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Apply the database migration before starting the updated backend:

```sh
npm --prefix backend run db:migrate
```

## Production authentication

Authentication is cookie-only. For reliable sign-in on Safari, privacy-focused
browsers, and mobile webviews, expose the backend on the same site as the
frontend. For example:

```env
# Frontend
VITE_API_URL=https://api.recipe.thibault-nguyen.dev

# Backend
CORS_ORIGIN=https://recipe.thibault-nguyen.dev
PUBLIC_APP_URL=https://recipe.thibault-nguyen.dev
COOKIE_SAME_SITE=lax
COOKIE_PARTITIONED=false
SESSION_TTL_DAYS=7
```

Point `api.recipe.thibault-nguyen.dev` at the backend deployment. Active
sessions are renewed when the app restores the current user, while accounts
that remain unused for the configured lifetime expire normally.

If the API must remain on a completely different site, use
`COOKIE_SAME_SITE=none` and `COOKIE_PARTITIONED=true`. This improves support in
browsers implementing partitioned cookies, but a same-site API domain remains
the most compatible setup.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
