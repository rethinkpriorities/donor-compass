-- Email signups table for capture popup persistence
-- Run: turso db shell donor-compass < migrations/003_email_signups.sql

CREATE TABLE IF NOT EXISTS email_signups (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    session_id TEXT,
    quiz_state TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_signups_email ON email_signups(email);
CREATE INDEX IF NOT EXISTS idx_email_signups_session_id ON email_signups(session_id);
CREATE INDEX IF NOT EXISTS idx_email_signups_created_at ON email_signups(created_at);
