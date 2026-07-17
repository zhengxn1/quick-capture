CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages (expires_at);
