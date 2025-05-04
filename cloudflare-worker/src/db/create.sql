/*
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

-- Enable SQLite strict mode and foreign keys
PRAGMA foreign_keys = ON;

-- Drop tables if they already exist (for reset)
DROP TABLE IF EXISTS schema_version;
DROP TABLE IF EXISTS publications;
DROP TABLE IF EXISTS feedbacks;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS id_mappings;
DROP TABLE IF EXISTS testers;
DROP TABLE IF EXISTS refunds;

-- Create schema version table to track database migrations
CREATE TABLE schema_version (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Only allow one row
    version INTEGER NOT NULL,              -- Current schema version
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL              -- Description of this version
);

-- Testers table
CREATE TABLE testers (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth ID mapping table with testers (1:N relationship)
CREATE TABLE id_mappings (
    id TEXT PRIMARY KEY,
    tester_uuid TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tester_uuid) REFERENCES testers(uuid) ON DELETE CASCADE
);

-- Index to speed up tester searches by UUID
CREATE INDEX idx_id_mappings_tester_uuid ON id_mappings(tester_uuid);

-- Purchases table
CREATE TABLE purchases (
    id TEXT PRIMARY KEY,
    tester_uuid TEXT NOT NULL,
    date TEXT NOT NULL,  -- Format YYYY-MM-DD
    order_number TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    screenshot TEXT NOT NULL, -- Base64 encoded image
    screenshot_summary TEXT,  -- Optional text summary of the screenshot
    refunded BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tester_uuid) REFERENCES testers(uuid) ON DELETE CASCADE
);

-- Feedbacks table
CREATE TABLE feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id TEXT NOT NULL UNIQUE, -- 1:1 relationship with purchase
    date TEXT NOT NULL, -- Format YYYY-MM-DD
    feedback TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Publications table
CREATE TABLE publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id TEXT NOT NULL UNIQUE, -- 1:1 relationship with purchase
    date TEXT NOT NULL, -- Format YYYY-MM-DD
    screenshot TEXT NOT NULL, -- Base64 encoded image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Refunds table
CREATE TABLE refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id TEXT NOT NULL UNIQUE, -- 1:1 relationship with purchase
    date TEXT NOT NULL, -- Format YYYY-MM-DD (registration date)
    refund_date TEXT NOT NULL, -- Format YYYY-MM-DD (effective refund date)
    amount REAL NOT NULL,
    transaction_id TEXT, -- Optional transaction ID for refund
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Index for searching purchases by tester
CREATE INDEX idx_purchases_tester_uuid ON purchases(tester_uuid);
-- Index for searching refunded/non-refunded purchases
CREATE INDEX idx_purchases_refunded ON purchases(refunded);

-- To optimize sorting queries
CREATE INDEX idx_purchases_date ON purchases(date);
CREATE INDEX idx_purchases_order_number ON purchases(order_number);

-- To optimize joins in views
CREATE INDEX idx_feedbacks_purchase_id ON feedbacks(purchase_id);
CREATE INDEX idx_publications_purchase_id ON publications(purchase_id);
CREATE INDEX idx_refunds_purchase_id ON refunds(purchase_id);

-- Composite indexes for common use cases
CREATE INDEX idx_purchases_tester_refunded ON purchases(tester_uuid, refunded);
CREATE INDEX idx_purchases_tester_date ON purchases(tester_uuid, date);
CREATE INDEX idx_purchases_tester_order ON purchases(tester_uuid, order_number);

-- Trigger to update the "refunded" status of a purchase after adding a refund
CREATE TRIGGER update_purchase_refunded_status
AFTER INSERT ON refunds
BEGIN
    UPDATE purchases SET refunded = 1, updated_at = CURRENT_TIMESTAMP WHERE id = NEW.purchase_id;
END;

-- Trigger to update the timestamp when modifying a tester
CREATE TRIGGER update_tester_timestamp
AFTER UPDATE ON testers
BEGIN
    UPDATE testers SET updated_at = CURRENT_TIMESTAMP WHERE uuid = NEW.uuid;
END;

-- Trigger to update the timestamp when modifying a purchase
CREATE TRIGGER update_purchase_timestamp
AFTER UPDATE ON purchases
BEGIN
    UPDATE purchases SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- View to easily get purchases with their feedback, publication, and refund status
DROP VIEW IF EXISTS purchase_status;
CREATE VIEW purchase_status AS
SELECT 
    p.id,
    p.tester_uuid,
    p.date,
    p.order_number,
    p.description,
    p.amount,
    p.refunded,
    pub.screenshot as publication_screenshot,
    p.screenshot as purchase_screenshot,
    p.screenshot_summary,
    CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as has_feedback,
    CASE WHEN pub.id IS NOT NULL THEN 1 ELSE 0 END as has_publication,
    CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_refund
FROM 
    purchases p
    LEFT JOIN feedbacks f ON p.id = f.purchase_id
    LEFT JOIN publications pub ON p.id = pub.purchase_id
    LEFT JOIN refunds r ON p.id = r.purchase_id;

-- View to get statistics by tester
DROP VIEW IF EXISTS tester_statistics;
CREATE VIEW tester_statistics AS
SELECT 
    t.uuid,
    t.name,
    COUNT(p.id) as total_purchases,
    SUM(CASE WHEN p.refunded = 1 THEN 1 ELSE 0 END) as refunded_purchases,
    SUM(CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END) as purchases_with_feedback,
    SUM(CASE WHEN pub.id IS NOT NULL THEN 1 ELSE 0 END) as published_feedbacks,
    SUM(p.amount) as total_spent,
    SUM(CASE WHEN r.id IS NOT NULL THEN r.amount ELSE 0 END) as total_refunded
FROM 
    testers t
    LEFT JOIN purchases p ON t.uuid = p.tester_uuid
    LEFT JOIN feedbacks f ON p.id = f.purchase_id
    LEFT JOIN publications pub ON p.id = pub.purchase_id
    LEFT JOIN refunds r ON p.id = r.purchase_id
GROUP BY t.uuid;

-- Insert initial schema version (or update if exists)
INSERT  INTO schema_version (id, version, description) 
VALUES (1, 2, 'Initial schema with transactionId support for refunds and screenshot summary');