// Cloudflare Worker entry point (DI-02, SCRUM-87). The web app is served as
// static assets from public/; requests to /api/* run this code first, so the
// web app and the API share one domain.

import { refreshBmfFeed } from './bmf-feed.js';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function health(env) {
  try {
    await env.DB.prepare('SELECT 1').first();
    return json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
  } catch {
    return json({ status: 'error', database: 'unreachable', time: new Date().toISOString() }, 503);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/health') return health(env);
    if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },

  // SCRUM-18 / FR-DOC-06: run once a day by the cron trigger in wrangler.toml.
  // It only refreshes the BMF copy and never starts a partner check (FR-CHK-09).
  async scheduled(controller, env) {
    const result = await refreshBmfFeed(env);
    const log = result.status === 'OK' ? console.log : console.error;
    log(`BMF feed fetch ${result.status}: ${JSON.stringify(result)}`);
  },
};
