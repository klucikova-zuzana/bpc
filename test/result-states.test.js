// SCRUM-42 (FR-CHK-04): every check has exactly one of five result states,
// and the database accepts exactly those five.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { STATES, runChecks } from '../src/adapters/index.js';
import { migratedDatabase } from './d1.js';

const ALL_STATES = ['VALID', 'INVALID', 'NOT_FOUND', 'UNAVAILABLE', 'NOT_APPLICABLE'];

// One organisation, one user and one request, so check_results rows can be added.
function databaseWithRequest(sqlite = migratedDatabase()) {
  sqlite.exec(`
    INSERT INTO organisations (id, name, fn) VALUES (1, 'Muster Bau GmbH', '111111a');
    INSERT INTO users (id, organisation_id, email, first_name, last_name, role, status) VALUES
      (10, 1, 'req@example.at', 'Rita', 'Request', 'REQUEST_USER', 'ACTIVE');
    INSERT INTO requests (id, organisation_id, user_id, input_vat, started_at) VALUES
      (100, 1, 10, 'ATU12345678', '2026-11-14T09:00:00.000Z');
  `);
  return sqlite;
}

const insertResult = (sqlite, source, state) =>
  sqlite
    .prepare("INSERT INTO check_results (request_id, source, state, queried_at) VALUES (100, ?, ?, '2026-11-14T09:00:01.000Z')")
    .run(source, state);

test('the code knows exactly the five states', () => {
  assert.deepEqual(STATES, ALL_STATES);
});

test('the database accepts each of the five states', () => {
  const sqlite = databaseWithRequest();
  // One source per state, because a request has only one result per source.
  const sources = ['VIES', 'BMF', 'HFU', 'FIRMENBUCH', 'GISA'];
  ALL_STATES.forEach((state, i) => insertResult(sqlite, sources[i], state));

  const stored = sqlite.prepare('SELECT state FROM check_results ORDER BY id').all().map((row) => row.state);
  assert.deepEqual(stored, ALL_STATES);
});

test('the database refuses any other state', () => {
  const sqlite = databaseWithRequest();
  assert.throws(() => insertResult(sqlite, 'VIES', 'MAYBE'), /CHECK constraint failed/);
  assert.throws(() => insertResult(sqlite, 'VIES', 'not_applicable'), /CHECK constraint failed/); // upper case only
});

test('a check still has exactly one result per source', () => {
  const sqlite = databaseWithRequest();
  insertResult(sqlite, 'GISA', 'NOT_APPLICABLE');
  assert.throws(() => insertResult(sqlite, 'GISA', 'VALID'), /UNIQUE constraint failed/);
});

test('an adapter that answers NOT_APPLICABLE keeps that state', async () => {
  const [result] = await runChecks(
    [{ source: 'GISA', check: async () => ({ state: 'NOT_APPLICABLE', details: { reason: 'Partner outside Austria' } }) }],
    { vat: 'ATU12345678', fn: null },
  );
  assert.equal(result.state, 'NOT_APPLICABLE'); // not turned into UNAVAILABLE
  assert.deepEqual(result.details, { reason: 'Partner outside Austria' });
});

test('results stored before migration 0006 are kept unchanged', () => {
  // Apply only the migrations before 0006, as on the live database today.
  const dir = new URL('../migrations/', import.meta.url);
  const files = readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
  const sqlite = new DatabaseSync(':memory:');
  for (const file of files.filter((name) => name < '0006')) sqlite.exec(readFileSync(new URL(file, dir), 'utf8'));

  databaseWithRequest(sqlite);
  insertResult(sqlite, 'VIES', 'VALID');
  insertResult(sqlite, 'HFU', 'NOT_FOUND');
  const before = sqlite.prepare('SELECT * FROM check_results ORDER BY id').all();

  // Now apply 0006 and everything after it.
  for (const file of files.filter((name) => name >= '0006')) sqlite.exec(readFileSync(new URL(file, dir), 'utf8'));

  const after = sqlite.prepare('SELECT * FROM check_results ORDER BY id').all();
  assert.deepEqual(after, before);
  insertResult(sqlite, 'GISA', 'NOT_APPLICABLE'); // and the new state works on the old data
});


// SCRUM-42 / SCRUM-105 (CR-10): a partner outside Austria.
// Five fake sources that remember whether they were called.
function recordingSources() {
  const called = [];
  const adapters = ['VIES', 'BMF', 'HFU', 'FIRMENBUCH', 'GISA'].map((source) => ({
    source,
    check: async () => {
      called.push(source);
      return { state: 'VALID', details: null };
    },
  }));
  return { adapters, called };
}

test('outside Austria only VIES is called, the four Austrian checks are NOT_APPLICABLE', async () => {
  const { adapters, called } = recordingSources();
  const results = await runChecks(adapters, { vat: 'DE123456789', fn: null });

  assert.deepEqual(called, ['VIES']); // BMF, HFU, Firmenbuch and GISA are not called
  assert.deepEqual(
    results.map(({ source, state, details }) => ({ source, state, details })),
    [
      { source: 'VIES', state: 'VALID', details: null },
      { source: 'BMF', state: 'NOT_APPLICABLE', details: { note: 'Austrian register only' } },
      { source: 'HFU', state: 'NOT_APPLICABLE', details: { note: 'Austrian register only' } },
      { source: 'FIRMENBUCH', state: 'NOT_APPLICABLE', details: { note: 'Austrian register only' } },
      { source: 'GISA', state: 'NOT_APPLICABLE', details: { note: 'Austrian register only' } },
    ],
  );
  for (const result of results) assert.ok(result.queriedAt, `${result.source} has no time`);
});

test('an Austrian partner still gets all five checks', async () => {
  const { adapters, called } = recordingSources();
  const results = await runChecks(adapters, { vat: 'ATU12345678', fn: null });

  assert.deepEqual(called.sort(), ['BMF', 'FIRMENBUCH', 'GISA', 'HFU', 'VIES']);
  for (const result of results) assert.equal(result.state, 'VALID');
});
