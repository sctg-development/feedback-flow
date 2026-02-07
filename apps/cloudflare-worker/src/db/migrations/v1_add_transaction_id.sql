CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP, description TEXT NOT NULL);
INSERT OR IGNORE INTO schema_version (id, version, description) VALUES (1, 0, 'Initial schema');
SELECT CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('refunds') WHERE name = 'transaction_id') = 0 THEN 'Column does not exist, will add' ELSE 'Column already exists' END as check_result;
ALTER TABLE refunds ADD COLUMN transaction_id TEXT;
UPDATE schema_version SET version = 1, last_updated = CURRENT_TIMESTAMP, description = 'Added transaction_id to refunds' WHERE id = 1;