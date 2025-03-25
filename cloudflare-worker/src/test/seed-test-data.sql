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

-- Active les clés étrangères pour assurer l'intégrité référentielle
PRAGMA foreign_keys = ON;

-- Désactiver temporairement les triggers pour l'insertion initiale
PRAGMA triggers = OFF;

-- Supprime les données existantes (optionnel, à utiliser avec précaution)
DELETE FROM refunds;
DELETE FROM publications;
DELETE FROM feedbacks;
DELETE FROM purchases;
DELETE FROM id_mappings;
DELETE FROM testers;

-- Réinitialise les compteurs auto-increment (si nécessaire)
DELETE FROM sqlite_sequence WHERE name IN ('feedbacks', 'publications', 'refunds');

-- Insertion des testeurs
INSERT INTO testers (uuid, name) VALUES 
('45f9830a-309b-4cda-95ec-71e000b78f7d', 'John Doe'),
('cc97a5cc-c4ba-4804-98b5-90532f09bd83', 'Jane Doe');

-- Insertion des mappages d'IDs
INSERT INTO id_mappings (id, tester_uuid) VALUES 
('auth0|1234567890', '45f9830a-309b-4cda-95ec-71e000b78f7d'),
('auth0|0987654321', 'cc97a5cc-c4ba-4804-98b5-90532f09bd83');

-- Insertion des achats - directement avec les valeurs refunded de mock-data.ts
-- Notez que nous avons désactivé les triggers pour pouvoir définir les valeurs refunded manuellement
INSERT INTO purchases (id, tester_uuid, date, order_number, description, amount, screenshot, refunded) VALUES 
(
    'd5726cf2-36f6-41d8-bd37-f349314561b4', 
    '45f9830a-309b-4cda-95ec-71e000b78f7d', 
    '2025-03-23', 
    '123', 
    'Test order', 
    10.99, 
    'UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==', 
    1  -- refunded: true dans mock-data.ts
),
(
    'aa92494a-a036-4a4e-9c6a-c3821a8cb6a4', 
    'cc97a5cc-c4ba-4804-98b5-90532f09bd83', 
    '2021-02-01', 
    '456', 
    'Test order 2', 
    20.99, 
    'UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==', 
    1  -- refunded: true dans mock-data.ts
),
(
    'b5e8c21d-7f4e-4a6b-9c3d-9e7a1f2b3c4d', 
    '45f9830a-309b-4cda-95ec-71e000b78f7d', 
    '2025-02-15', 
    '789', 
    'Premium product test', 
    59.99, 
    'UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==', 
    0  -- refunded: false dans mock-data.ts
);

-- Insertion des feedbacks
INSERT INTO feedbacks (purchase_id, date, feedback) VALUES 
(
    'd5726cf2-36f6-41d8-bd37-f349314561b4', 
    '2025-03-23', 
    'Great product, fast delivery and exactly as described!'
),
(
    'aa92494a-a036-4a4e-9c6a-c3821a8cb6a4', 
    '2021-02-05', 
    'Product was good but shipping took longer than expected.'
);

-- Insertion des publications
INSERT INTO publications (purchase_id, date, screenshot) VALUES 
(
    'd5726cf2-36f6-41d8-bd37-f349314561b4', 
    '2025-03-23', 
    'UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA=='
),
(
    'aa92494a-a036-4a4e-9c6a-c3821a8cb6a4', 
    '2021-02-10', 
    'UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA=='
);

-- Insertion des remboursements
INSERT INTO refunds (purchase_id, date, refund_date, amount) VALUES 
(
    'd5726cf2-36f6-41d8-bd37-f349314561b4', 
    '2025-03-25', 
    '2025-03-28', 
    10.99
),
(
    'aa92494a-a036-4a4e-9c6a-c3821a8cb6a4', 
    '2021-02-15', 
    '2021-02-20', 
    20.99
);

-- Réactiver les triggers après l'insertion des données
PRAGMA triggers = ON;

-- Requêtes de vérification des données insérées
-- SELECT 'Testers' as table_name, COUNT(*) as count FROM testers
-- UNION ALL
-- SELECT 'ID Mappings', COUNT(*) FROM id_mappings
-- UNION ALL
-- SELECT 'Purchases', COUNT(*) FROM purchases
-- UNION ALL
-- SELECT 'Feedbacks', COUNT(*) FROM feedbacks
-- UNION ALL
-- SELECT 'Publications', COUNT(*) FROM publications
-- UNION ALL
-- SELECT 'Refunds', COUNT(*) FROM refunds;

-- Vérification d'un échantillon de données de chaque table
-- SELECT '==== Testers ====' as result;
-- SELECT uuid, name FROM testers;

-- SELECT '==== ID Mappings ====' as result;
-- SELECT id, tester_uuid FROM id_mappings;

-- SELECT '==== Purchases ====' as result;
-- SELECT id, tester_uuid, description, amount, refunded FROM purchases;

-- SELECT '==== Feedbacks ====' as result;
-- SELECT purchase_id, date, feedback FROM feedbacks;

-- SELECT '==== Publications ====' as result;
-- SELECT purchase_id, date FROM publications;

-- SELECT '==== Refunds ====' as result;
-- SELECT purchase_id, date, refund_date, amount FROM refunds;

-- Exemples de requêtes utilisant les vues
-- SELECT '==== Purchase Status (vue) ====' as result;
-- SELECT * FROM purchase_status;

-- SELECT '==== Tester Statistics (vue) ====' as result;
-- SELECT * FROM tester_statistics;