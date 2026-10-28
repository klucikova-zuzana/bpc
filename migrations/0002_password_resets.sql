-- SCRUM-15: one-time links for resetting a forgotten password.
-- Like email_verifications, only the SHA-256 hash of the token is stored.

CREATE TABLE password_resets (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  token_hash  TEXT    NOT NULL UNIQUE,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at  TEXT    NOT NULL,                          -- 30 min after creation
  used_at     TEXT                                       -- set when redeemed or replaced by a newer link
);

CREATE INDEX password_resets_user ON password_resets (user_id, created_at);
