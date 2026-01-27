import { Hono } from 'hono';
import api from './api/index';

type Env = {
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
};

const app = new Hono<Env>();

// Mount API routes
app.route('/api', api);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// SPA fallback: serve index.html for non-API, non-asset routes
// Do NOT match /assets/* routes - let Wrangler's asset serving handle those
app.get('/assets/*', (c) => {
  // Return a 404 with a different content type so Wrangler can serve the asset
  return c.notFound();
});

app.get('/vite.svg', (c) => {
  return c.notFound();
});

app.get('*', (c) => {
  const url = new URL(c.req.url);

  // Skip API routes (they're handled above)
  if (url.pathname.startsWith('/api') || url.pathname === '/health') {
    return c.notFound();
  }

  // Serve index.html for all other routes (client-side routing)
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👥</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Loading...</title>
    <link rel="stylesheet" crossorigin href="/assets/index.css">
  </head>
  <body class="min-h-screen bg-background text-foreground antialiased">
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/index.js"></script>
  </body>
</html>`;

  return c.html(indexHtml);
});

export default app;
