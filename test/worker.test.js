// SCRUM-87: the Worker answers the API under /api/* and hands everything else
// to the static web app.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../src/index.js';

const assets = { fetch: async () => new Response('web app') };
const workingDb = { prepare: () => ({ first: async () => ({ 1: 1 }) }) };
const brokenDb = {
  prepare: () => ({
    first: async () => {
      throw new Error('D1 down');
    },
  }),
};

const get = (path, env) => worker.fetch(new Request(`https://bpc.hsynrsd.dev${path}`), env);

test('health reports ok when the database answers', async () => {
  const response = await get('/api/health', { DB: workingDb, ASSETS: assets });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.database, 'ok');
});

test('health reports 503 when the database is unreachable', async () => {
  const response = await get('/api/health', { DB: brokenDb, ASSETS: assets });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).database, 'unreachable');
});

test('unknown API paths return a JSON 404, not the web app', async () => {
  const response = await get('/api/nope', { DB: workingDb, ASSETS: assets });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Not found' });
});

test('other paths are served by the web app', async () => {
  const response = await get('/', { DB: workingDb, ASSETS: assets });
  assert.equal(await response.text(), 'web app');
});
