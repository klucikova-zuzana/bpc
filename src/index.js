// Cloudflare Worker entry point (DI-02, SCRUM-87). The web app is served as
// static assets from public/; requests to /api/* run this code first, so the
// web app and the API share one domain.

import { createMailer } from './mail.js';
import { confirmPasswordReset, languageOf, requestPasswordReset } from './password-reset.js';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function health(env) {
  try {
    await env.DB.prepare('SELECT 1').first();
    return json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
  } catch {
    return json({ status: 'error', database: 'unreachable', time: new Date().toISOString() }, 503);
  }
}

// SCRUM-15
async function passwordReset(request, env, ctx) {
  const { email } = await readJson(request);
  if (typeof email !== 'string' || !email.includes('@')) return json({ error: 'INVALID_EMAIL' }, 400);

  const deps = { db: env.DB, mailer: createMailer(env), baseUrl: new URL(request.url).origin };
  // Work after answering, so known and unknown addresses take the same time.
  ctx.waitUntil(
    requestPasswordReset(deps, email, languageOf(request)).catch((error) =>
      console.error('Password reset request failed', error.message), // no e-mail address in logs
    ),
  );
  return json({ status: 'If an active account uses this address, a reset link has been sent.' }, 202);
}

async function passwordResetConfirm(request, env) {
  const { token, password } = await readJson(request);
  const result = await confirmPasswordReset({ db: env.DB }, token, password);
  return result.ok ? new Response(null, { status: 204 }) : json({ error: result.error }, 400);
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/health') return health(env);
    if (request.method === 'POST' && pathname === '/api/password-reset') return passwordReset(request, env, ctx);
    if (request.method === 'POST' && pathname === '/api/password-reset/confirm') return passwordResetConfirm(request, env);
    if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
};
