-- SCRUM-92: initial database schema (SRS data model, DI-01 / FR-OPS-04).
-- All timestamps are UTC ISO 8601 strings (QS-OBS-01).

CREATE TABLE organisations (
  id               INTEGER PRIMARY KEY,
  name             TEXT    NOT NULL,
  fn               TEXT    NOT NULL UNIQUE,            -- Firmenbuchnummer
  default_language TEXT    NOT NULL DEFAULT 'en' CHECK (default_language IN ('en', 'de')),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- The Super Admin (Operator) is a platform role outside any organisation;
-- every other user belongs to exactly one organisation and has exactly one role.
CREATE TABLE users (
  id                   INTEGER PRIMARY KEY,
  organisation_id      INTEGER REFERENCES organisations (id),
  email                TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  first_name           TEXT    NOT NULL,
  last_name            TEXT    NOT NULL,
  role                 TEXT    NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'REQUEST_USER', 'REVIEW_USER')),
  password_hash        TEXT,                              -- NULL until the user has set a password
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
  status               TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'DEACTIVATED')),
  created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((role = 'SUPER_ADMIN') = (organisation_id IS NULL))
);

-- Exactly one Super Admin can ever exist.
CREATE UNIQUE INDEX users_one_super_admin ON users (role) WHERE role = 'SUPER_ADMIN';
CREATE INDEX users_organisation ON users (organisation_id);

CREATE TABLE email_verifications (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  token_hash  TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,                          -- 24 h after creation
  used_at     TEXT
);

CREATE TABLE api_tokens (
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users (id),
  name         TEXT    NOT NULL,
  secret_hash  TEXT    NOT NULL UNIQUE,                  -- QS-SEC-03: only the hash is stored
  expires_at   TEXT,                                     -- NULL = no expiry
  status       TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at TEXT
);

CREATE INDEX api_tokens_user ON api_tokens (user_id);

CREATE TABLE requests (
  id              INTEGER PRIMARY KEY,
  organisation_id INTEGER NOT NULL REFERENCES organisations (id),
  user_id         INTEGER NOT NULL REFERENCES users (id),
  api_token_id    INTEGER REFERENCES api_tokens (id),    -- set when started via the API
  input_vat       TEXT    NOT NULL,
  input_fn        TEXT,
  status          TEXT    NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED')),
  summary         TEXT,
  disputed        INTEGER NOT NULL DEFAULT 0 CHECK (disputed IN (0, 1)),
  started_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at    TEXT
);

CREATE INDEX requests_organisation_started ON requests (organisation_id, started_at DESC);

-- One row per source per request (FR-CHK-02, FR-CHK-04).
CREATE TABLE check_results (
  id          INTEGER PRIMARY KEY,
  request_id  INTEGER NOT NULL REFERENCES requests (id) ON DELETE CASCADE,
  source      TEXT    NOT NULL CHECK (source IN ('VIES', 'BMF', 'HFU', 'FIRMENBUCH', 'GISA')),
  state       TEXT    NOT NULL CHECK (state IN ('VALID', 'INVALID', 'NOT_FOUND', 'UNAVAILABLE')),
  details     TEXT,                                      -- JSON returned to the client
  queried_at  TEXT    NOT NULL,
  UNIQUE (request_id, source)
);

-- Append-only audit log (QS-OBS-01, QS-OBS-02).
CREATE TABLE audit_log (
  id           INTEGER PRIMARY KEY,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  user_id      INTEGER REFERENCES users (id),
  api_token_id INTEGER REFERENCES api_tokens (id),
  action       TEXT    NOT NULL,
  details      TEXT                                      -- JSON
);
