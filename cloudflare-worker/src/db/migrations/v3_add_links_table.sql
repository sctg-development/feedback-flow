/**
 * Migration v3: Add links table for short public dispute resolution links
 * 
 * This migration creates a new table to store short links that allow public access
 * to dispute resolution information. Each link:
 * - Has a unique 7-character code (0-9, a-z, A-Z)
 * - Is associated with a specific purchase
 * - Has an expiration timestamp
 * - Can only be generated for purchases with completed feedback (created and published)
 */

-- Create links table
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,              -- 7-character unique code for the short link
    purchase_id TEXT NOT NULL,              -- Reference to the purchase
    expires_at TIMESTAMP NOT NULL,          -- Expiration timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Index to speed up lookups by code
CREATE INDEX IF NOT EXISTS idx_links_code ON links(code);

-- Index to speed up lookups by purchase_id
CREATE INDEX IF NOT EXISTS idx_links_purchase_id ON links(purchase_id);

-- Index to efficiently find non-expired links
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);

-- Composite index for checking if a link exists and is still valid
CREATE INDEX IF NOT EXISTS idx_links_code_expires_at ON links(code, expires_at);

-- Update schema version
UPDATE schema_version SET version = 3, description = 'Added links table for short public dispute resolution links' WHERE id = 1;
