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

-- Activation du mode strict SQLite et des clés étrangères
PRAGMA foreign_keys = ON;

-- Suppression des tables si elles existent déjà (pour réinitialisation)
DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS publications;
DROP TABLE IF EXISTS feedbacks;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS id_mappings;
DROP TABLE IF EXISTS testers;

-- Table des testeurs
CREATE TABLE testers (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de mapping des IDs OAuth avec les testeurs (relation 1:N)
CREATE TABLE id_mappings (
    id TEXT PRIMARY KEY,
    tester_uuid TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tester_uuid) REFERENCES testers(uuid) ON DELETE CASCADE
);

-- Index pour accélérer les recherches de testeur par UUID
CREATE INDEX idx_id_mappings_tester_uuid ON id_mappings(tester_uuid);

-- Table des achats
CREATE TABLE purchases (
    id TEXT PRIMARY KEY,
    tester_uuid TEXT NOT NULL,
    date TEXT NOT NULL,  -- Format YYYY-MM-DD
    order_number TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    screenshot TEXT NOT NULL, -- Base64 encoded image
    refunded BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tester_uuid) REFERENCES testers(uuid) ON DELETE CASCADE
);

-- Table des feedbacks
CREATE TABLE feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id TEXT NOT NULL UNIQUE, -- Relation 1:1 avec purchase
    date TEXT NOT NULL, -- Format YYYY-MM-DD
    feedback TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Table des publications
CREATE TABLE publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id TEXT NOT NULL UNIQUE, -- Relation 1:1 avec purchase
    date TEXT NOT NULL, -- Format YYYY-MM-DD
    screenshot TEXT NOT NULL, -- Base64 encoded image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Table des remboursements
CREATE TABLE refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id TEXT NOT NULL UNIQUE, -- Relation 1:1 avec purchase
    date TEXT NOT NULL, -- Format YYYY-MM-DD (date d'enregistrement)
    refund_date TEXT NOT NULL, -- Format YYYY-MM-DD (date effective du remboursement)
    amount REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Index pour les recherches d'achats par testeur
CREATE INDEX idx_purchases_tester_uuid ON purchases(tester_uuid);
-- Index pour les recherches d'achats remboursés/non-remboursés
CREATE INDEX idx_purchases_refunded ON purchases(refunded);

-- Pour optimiser les requêtes de tri
CREATE INDEX idx_purchases_date ON purchases(date);
CREATE INDEX idx_purchases_order_number ON purchases(order_number);

-- Pour optimiser les jointures dans les vues
CREATE INDEX idx_feedbacks_purchase_id ON feedbacks(purchase_id);
CREATE INDEX idx_publications_purchase_id ON publications(purchase_id);
CREATE INDEX idx_refunds_purchase_id ON refunds(purchase_id);

-- Index composites pour les cas d'utilisation courants
CREATE INDEX idx_purchases_tester_refunded ON purchases(tester_uuid, refunded);
CREATE INDEX idx_purchases_tester_date ON purchases(tester_uuid, date);
CREATE INDEX idx_purchases_tester_order ON purchases(tester_uuid, order_number);

-- Trigger pour mettre à jour le statut "refunded" d'un achat après l'ajout d'un remboursement
CREATE TRIGGER update_purchase_refunded_status
AFTER INSERT ON refunds
BEGIN
    UPDATE purchases SET refunded = 1, updated_at = CURRENT_TIMESTAMP WHERE id = NEW.purchase_id;
END;

-- Trigger pour mettre à jour le timestamp lors de la modification d'un testeur
CREATE TRIGGER update_tester_timestamp
AFTER UPDATE ON testers
BEGIN
    UPDATE testers SET updated_at = CURRENT_TIMESTAMP WHERE uuid = NEW.uuid;
END;

-- Trigger pour mettre à jour le timestamp lors de la modification d'un achat
CREATE TRIGGER update_purchase_timestamp
AFTER UPDATE ON purchases
BEGIN
    UPDATE purchases SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Vue pour obtenir facilement les achats avec leur statut de feedback, publication et remboursement
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
    CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as has_feedback,
    CASE WHEN pub.id IS NOT NULL THEN 1 ELSE 0 END as has_publication,
    CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_refund
FROM 
    purchases p
    LEFT JOIN feedbacks f ON p.id = f.purchase_id
    LEFT JOIN publications pub ON p.id = pub.purchase_id
    LEFT JOIN refunds r ON p.id = r.purchase_id;

-- Vue pour obtenir des statistiques par testeur
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

