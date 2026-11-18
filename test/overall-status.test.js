// SCRUM-96 (CR-01): one overall status per request, derived from its checks
// by fixed rules, and stored with the request.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRequestRecord, runAndSaveChecks, startCheck } from '../src/check-request.js';
import { OVERALL_STATUSES, overallStatus } from '../src/overall-status.js';
import { d1, migratedDatabase } from './d1.js';
import { listRequests } from '../src/tenant.js';

// --- The rules (no database needed) ---

test('there are exactly three overall statuses', () => {
  assert.deepEqual(OVERALL_STATUSES, ['ISSUE_FOUND', 'INCOMPLETE', 'COMPLETE']);
});

test('one INVALID check gives ISSUE_FOUND', () => {
  assert.equal(overallStatus(['VALID', 'INVALID', 'VALID', 'VALID', 'VALID']), 'ISSUE_FOUND');
});

test('INVALID wins over UNAVAILABLE', () => {
  assert.equal(overallStatus(['INVALID', 'UNAVAILABLE', 'VALID', 'VALID', 'VALID']), 'ISSUE_FOUND');
});

test('one UNAVAILABLE check and no INVALID gives INCOMPLETE', () => {
  assert.equal(overallStatus(['VALID', 'VALID', 'UNAVAILABLE', 'VALID', 'VALID']), 'INCOMPLETE');
});

test('every check VALID gives COMPLETE', () => {
  assert.equal(overallStatus(['VALID', 'VALID', 'VALID', 'VALID', 'VALID']), 'COMPLETE');
});

test('only the HFU check NOT_FOUND still gives COMPLETE', () => {
  // VIES, BMF, HFU, FIRMENBUCH, GISA: "not on the HFU list" is normal.
  assert.equal(overallStatus(['VALID', 'VALID', 'NOT_FOUND', 'VALID', 'VALID']), 'COMPLETE');
});

test('NOT_APPLICABLE counts as an answer (partner outside Austria)', () => {
  // VIES answered, the four Austrian checks do not apply (CR-10).
  assert.equal(
    overallStatus(['VALID', 'NOT_APPLICABLE', 'NOT_APPLICABLE', 'NOT_APPLICABLE', 'NOT_APPLICABLE']),
    'COMPLETE',
  );
});

test('the wording is a status, not a business recommendation (FR-CHK-08)', () => {
  for (const status of OVERALL_STATUSES) {
    assert.doesNotMatch(status, /APPROVED|PASSED|FAILED|BUSINESS/);
  }
});

// --- Stored with the request ---

function setup() {
  const sqlite = migratedDatabase();
  const db = d1(sqlite);
  sqlite.exec(`
    INSERT INTO organisations (id, name, fn) VALUES (1, 'Muster Bau GmbH', '111111a');
    INSERT INTO users (id, organisation_id, email, first_name, last_name, role, status) VALUES
      (10, 1, 'req@example.at', 'Rita', 'Request', 'REQUEST_USER', 'ACTIVE');
  `);
  return { db, sqlite, user: { id: 10, organisationId: 1, role: 'REQUEST_USER' } };
}

// Five fake sources answering with the given states, in the order VIES, BMF, HFU, FIRMENBUCH, GISA.
const sourcesAnswering = (states) =>
  ['VIES', 'BMF', 'HFU', 'FIRMENBUCH', 'GISA'].map((source, i) => ({
    source,
    check: async () => ({ state: states[i], details: null }),
  }));

const now = new Date('2026-11-15T09:00:00Z');

test('the overall status is stored with the request and read back', async () => {
  const { db, sqlite, user } = setup();
  const { requestId } = await startCheck({ db, now }, user, { vat: 'ATU12345678' });
  await runAndSaveChecks(
    { db, adapters: sourcesAnswering(['VALID', 'VALID', 'NOT_FOUND', 'VALID', 'VALID']) },
    requestId,
  );

  // In the database ...
  const row = sqlite.prepare('SELECT summary FROM requests WHERE id = ?').get(requestId);
  assert.equal(row.summary, 'COMPLETE');
  // ... and in the stored record.
  const record = await getRequestRecord({ db }, 1, requestId);
  assert.equal(record.overallStatus, 'COMPLETE');
});

test('a source that is down gives INCOMPLETE', async () => {
  const { db, user } = setup();
  const { requestId } = await startCheck({ db, now }, user, { vat: 'ATU12345678' });
  const adapters = sourcesAnswering(['VALID', 'VALID', 'VALID', 'VALID', 'VALID']);
  adapters[1] = { source: 'BMF', check: async () => { throw new Error('feed down'); } };
  await runAndSaveChecks({ db, adapters }, requestId);

  const record = await getRequestRecord({ db }, 1, requestId);
  assert.equal(record.overallStatus, 'INCOMPLETE');
});

test('a request that is still running has no overall status yet', async () => {
  const { db, user } = setup();
  const { requestId } = await startCheck({ db, now }, user, { vat: 'ATU12345678' });

  const record = await getRequestRecord({ db }, 1, requestId);
  assert.equal(record.status, 'RUNNING');
  assert.equal(record.overallStatus, null);
});

// SCRUM-96: the list shows it too, so the status is visible at a glance.
test('the request list shows the overall status too', async () => {
  const { db, user } = setup();
  const { requestId } = await startCheck({ db, now }, user, { vat: 'ATU12345678' });
  await runAndSaveChecks(
    { db, adapters: sourcesAnswering(['VALID', 'INVALID', 'VALID', 'VALID', 'VALID']) },
    requestId,
  );

  const [listed] = await listRequests({ db }, 1);
  assert.equal(listed.id, requestId);
  assert.equal(listed.overallStatus, 'ISSUE_FOUND');
});

