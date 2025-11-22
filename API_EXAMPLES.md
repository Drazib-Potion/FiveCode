# Exemples d'appels API

## Configuration

Base URL: `http://localhost:3000`

Tous les endpoints (sauf `/auth/*`) nécessitent un token JWT dans le header:
```
Authorization: Bearer <token>
```

## Authentification

### 1. Inscription
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 2. Connexion
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Réponse:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

## Familles

### Créer une famille
```bash
curl -X POST http://localhost:3000/families \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Ordinateurs"
  }'
```

### Lister toutes les familles
```bash
curl -X GET http://localhost:3000/families \
  -H "Authorization: Bearer <token>"
```

### Obtenir une famille par ID
```bash
curl -X GET http://localhost:3000/families/<id> \
  -H "Authorization: Bearer <token>"
```

### Modifier une famille
```bash
curl -X PATCH http://localhost:3000/families/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Ordinateurs Portables"
  }'
```

### Supprimer une famille
```bash
curl -X DELETE http://localhost:3000/families/<id> \
  -H "Authorization: Bearer <token>"
```

## Variantes

### Créer une variante
```bash
curl -X POST http://localhost:3000/variants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "familyId": "<family-id>",
    "name": "Laptop Pro"
  }'
```

### Lister toutes les variantes
```bash
curl -X GET http://localhost:3000/variants \
  -H "Authorization: Bearer <token>"
```

### Lister les variantes d'une famille
```bash
curl -X GET "http://localhost:3000/variants?familyId=<family-id>" \
  -H "Authorization: Bearer <token>"
```

### Modifier une variante
```bash
curl -X PATCH http://localhost:3000/variants/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Laptop Pro Max"
  }'
```

### Supprimer une variante
```bash
curl -X DELETE http://localhost:3000/variants/<id> \
  -H "Authorization: Bearer <token>"
```

## Champs

### Créer un champ
```bash
curl -X POST http://localhost:3000/fields \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Processeur",
    "type": "string",
    "familyId": "<family-id>",
    "position": 0
  }'
```

Exemple avec variante:
```bash
curl -X POST http://localhost:3000/fields \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Mémoire RAM",
    "type": "number",
    "familyId": "<family-id>",
    "variantId": "<variant-id>",
    "position": 1
  }'
```

### Lister tous les champs
```bash
curl -X GET http://localhost:3000/fields \
  -H "Authorization: Bearer <token>"
```

### Lister les champs d'une famille et variante
```bash
curl -X GET "http://localhost:3000/fields?familyId=<family-id>&variantId=<variant-id>" \
  -H "Authorization: Bearer <token>"
```

### Modifier un champ
```bash
curl -X PATCH http://localhost:3000/fields/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "position": 2
  }'
```

### Supprimer un champ
```bash
curl -X DELETE http://localhost:3000/fields/<id> \
  -H "Authorization: Bearer <token>"
```

## Règles

### Créer une règle (type: raw)
```bash
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "fieldId": "<field-id>",
    "ruleType": "raw",
    "config": {}
  }'
```

### Créer une règle (type: map)
```bash
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "fieldId": "<field-id>",
    "ruleType": "map",
    "config": {
      "mapping": {
        "Intel": "I",
        "AMD": "A",
        "Apple": "AP"
      }
    }
  }'
```

### Créer une règle (type: pad_left)
```bash
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "fieldId": "<field-id>",
    "ruleType": "pad_left",
    "config": {
      "length": 3,
      "char": "0"
    }
  }'
```

### Créer une règle (type: range_bin)
```bash
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "fieldId": "<field-id>",
    "ruleType": "range_bin",
    "config": {
      "ranges": [
        {"min": 0, "max": 8, "code": "A"},
        {"min": 9, "max": 16, "code": "B"},
        {"min": 17, "max": 32, "code": "C"}
      ]
    }
  }'
```

### Lister toutes les règles
```bash
curl -X GET http://localhost:3000/rules \
  -H "Authorization: Bearer <token>"
```

### Obtenir la règle d'un champ
```bash
curl -X GET "http://localhost:3000/rules?fieldId=<field-id>" \
  -H "Authorization: Bearer <token>"
```

### Modifier une règle
```bash
curl -X PATCH http://localhost:3000/rules/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "config": {
      "length": 4,
      "char": "0"
    }
  }'
```

### Supprimer une règle
```bash
curl -X DELETE http://localhost:3000/rules/<id> \
  -H "Authorization: Bearer <token>"
```

## Produits

### Générer un produit
```bash
curl -X POST http://localhost:3000/products/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "familyId": "<family-id>",
    "variantId": "<variant-id>",
    "values": {
      "<field-id-1>": "Intel",
      "<field-id-2>": 16,
      "<field-id-3>": true
    }
  }'
```

Réponse:
```json
{
  "id": "uuid",
  "familyId": "uuid",
  "variantId": "uuid",
  "values": {
    "<field-id-1>": "Intel",
    "<field-id-2>": 16,
    "<field-id-3>": true
  },
  "generatedCode": "I0161",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Lister tous les produits
```bash
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer <token>"
```

### Obtenir un produit par ID
```bash
curl -X GET http://localhost:3000/products/<id> \
  -H "Authorization: Bearer <token>"
```

### Supprimer un produit
```bash
curl -X DELETE http://localhost:3000/products/<id> \
  -H "Authorization: Bearer <token>"
```

## Exemple complet de workflow

1. **Créer un utilisateur**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

2. **Se connecter et récupérer le token**
```bash
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' \
  | jq -r '.access_token')
```

3. **Créer une famille**
```bash
FAMILY_ID=$(curl -X POST http://localhost:3000/families \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Ordinateurs"}' \
  | jq -r '.id')
```

4. **Créer une variante**
```bash
VARIANT_ID=$(curl -X POST http://localhost:3000/variants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"familyId\": \"$FAMILY_ID\", \"name\": \"Laptop Pro\"}" \
  | jq -r '.id')
```

5. **Créer des champs**
```bash
FIELD1_ID=$(curl -X POST http://localhost:3000/fields \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\": \"Processeur\", \"type\": \"string\", \"familyId\": \"$FAMILY_ID\", \"position\": 0}" \
  | jq -r '.id')

FIELD2_ID=$(curl -X POST http://localhost:3000/fields \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\": \"RAM\", \"type\": \"number\", \"familyId\": \"$FAMILY_ID\", \"position\": 1}" \
  | jq -r '.id')
```

6. **Créer des règles**
```bash
# Règle map pour le processeur
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"fieldId\": \"$FIELD1_ID\", \"ruleType\": \"map\", \"config\": {\"mapping\": {\"Intel\": \"I\", \"AMD\": \"A\"}}}"

# Règle pad_left pour la RAM
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"fieldId\": \"$FIELD2_ID\", \"ruleType\": \"pad_left\", \"config\": {\"length\": 3, \"char\": \"0\"}}"
```

7. **Générer un produit**
```bash
curl -X POST http://localhost:3000/products/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"familyId\": \"$FAMILY_ID\", \"variantId\": \"$VARIANT_ID\", \"values\": {\"$FIELD1_ID\": \"Intel\", \"$FIELD2_ID\": 16}}"
```

