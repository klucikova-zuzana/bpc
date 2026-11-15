-- SCRUM-42 (FR-CHK-04, CR-10): a check can also have the state NOT_APPLICABLE,
-- for a partner outside Austria where the four Austrian checks do not apply
-- (SCRUM-105). The states are now VALID, INVALID, NOT_FOUND, UNAVAILABLE and
-- NOT_APPLICABLE, the same list as STATES in src/adapters/index.js.
--
-- SQLite cannot change a CHECK constraint in place, so the table is rebuilt:
-- create the new table, copy every row, drop the old table, rename the new one.
-- No other table points at check_results, so dropping it is safe.

CREATE TABLE check_results_new (
  id          INTEGER PRIMARY KEY,
  request_id  INTEGER NOT NULL REFERENCES requests (id) ON DELETE CASCADE,
  source      TEXT    NOT NULL CHECK (source IN ('VIES', 'BMF', 'HFU', 'FIRMENBUCH', 'GISA')),
  state       TEXT    NOT NULL CHECK (state IN ('VALID', 'INVALID', 'NOT_FOUND', 'UNAVAILABLE', 'NOT_APPLICABLE')),
  details     TEXT,                                      -- JSON returned to the client
  queried_at  TEXT    NOT NULL,
  UNIQUE (request_id, source)
);

-- Keep the ids, so nothing that already refers to a result changes.
INSERT INTO check_results_new (id, request_id, source, state, details, queried_at)
SELECT id, request_id, source, state, details, queried_at FROM check_results;

DROP TABLE check_results;

ALTER TABLE check_results_new RENAME TO check_results;