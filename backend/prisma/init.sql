-- Script d'initialisation de la base de données
-- Ce script crée un utilisateur de test pour l'authentification

-- Note: Les tables seront créées automatiquement par Prisma lors de la migration
-- Ce script est optionnel et peut être utilisé pour insérer des données de test

-- Exemple d'insertion d'un utilisateur de test (mot de passe: "password123")
-- Le mot de passe doit être hashé avec bcrypt avant insertion
-- Pour tester, utilisez l'endpoint /auth/register pour créer un utilisateur

-- Exemple de données de test (à exécuter après les migrations Prisma)

-- Insertion d'une famille de test
-- INSERT INTO families (id, name, "createdAt", "updatedAt") 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Famille Test', NOW(), NOW());

-- Insertion d'une variante de test
-- INSERT INTO variants (id, "familyId", name, "createdAt", "updatedAt")
-- VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Variante Test', NOW(), NOW());

-- Insertion d'une caractéristique technique de test
-- INSERT INTO technical_characteristics (id, name, type, "familyId", "variantId", position, "createdAt", "updatedAt")
-- VALUES ('00000000-0000-0000-0000-000000000003', 'Caractéristique Technique Test', 'string', '00000000-0000-0000-0000-000000000001', NULL, 0, NOW(), NOW());

-- Insertion d'une règle de test
-- INSERT INTO rules (id, "fieldId", "ruleType", config, "createdAt", "updatedAt")
-- VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'raw', '{}', NOW(), NOW());

