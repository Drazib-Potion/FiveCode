# Configurateur de Produits

Application complète de configurateur de produits avec génération automatique de codes.

## Architecture

- **Backend**: NestJS + TypeScript + PostgreSQL + Prisma
- **Frontend**: React + TypeScript + Vite
- **Authentification**: JWT

## Structure du projet

```
FiveCodePoc/
├── backend/          # Application NestJS
│   ├── src/
│   │   ├── auth/     # Module d'authentification
│   │   ├── families/ # CRUD Familles
│   │   ├── variants/ # CRUD Variantes
│   │   ├── fields/   # CRUD Champs
│   │   ├── rules/    # CRUD Règles
│   │   ├── products/ # Génération de produits
│   │   └── prisma/   # Service Prisma
│   └── prisma/
│       └── schema.prisma
└── frontend/         # Application React
    └── src/
        ├── pages/    # Pages CRUD et configurateur
        ├── components/
        ├── services/ # Services API
        └── contexts/ # Contextes React
```

## Prérequis

- Node.js 18+
- Docker et Docker Compose (recommandé pour la BDD)
- npm ou yarn

## Installation

### Option A : Base de données avec Docker (Recommandé)

```bash
# Démarrer PostgreSQL dans Docker
docker-compose up -d postgres

# Vérifier que le conteneur tourne
docker ps
```

### Option B : Base de données locale

Créer une base de données PostgreSQL:

```bash
createdb product_configurator
```

Ou via psql:
```sql
CREATE DATABASE product_configurator;
```

> 📖 **Voir [DOCKER_SETUP.md](./DOCKER_SETUP.md) pour le guide complet Docker**

### 2. Backend

```bash
cd backend
npm install

# Créer le fichier .env
cat > .env << EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/product_configurator?schema=public"
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="24h"
PORT=3000
EOF

# Si vous utilisez Docker pour la BDD, l'URL ci-dessus est correcte
# Sinon, modifiez DATABASE_URL avec vos identifiants PostgreSQL

# Générer le client Prisma
npm run prisma:generate

# Exécuter les migrations
npm run prisma:migrate

# Démarrer le serveur en mode développement
npm run start:dev
```

Le backend sera accessible sur `http://localhost:3000`

### 3. Frontend

```bash
cd frontend
npm install

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## Utilisation

### 1. Créer un compte

Accédez à `http://localhost:5173/login` et créez un compte.

### 2. Configurer les données

1. **Créer une famille**: Allez dans "Familles" et créez une nouvelle famille (ex: "Ordinateurs")
2. **Créer une variante**: Allez dans "Variantes" et créez une variante pour cette famille (ex: "Laptop Pro")
3. **Créer des champs**: Allez dans "Champs" et créez des champs pour la famille/variante:
   - Nom: "Processeur", Type: "string", Position: 0
   - Nom: "RAM", Type: "number", Position: 1
   - etc.
4. **Créer des règles**: Allez dans "Règles" et créez une règle pour chaque champ:
   - **raw**: Copie la valeur telle quelle
   - **map**: Conversion avec table clé/valeur
     ```json
     {
       "mapping": {
         "Intel": "I",
         "AMD": "A"
       }
     }
     ```
   - **pad_left**: Complète à gauche
     ```json
     {
       "length": 3,
       "char": "0"
     }
     ```
   - **range_bin**: Classe un nombre dans une catégorie
     ```json
     {
       "ranges": [
         {"min": 0, "max": 8, "code": "A"},
         {"min": 9, "max": 16, "code": "B"}
       ]
     }
     ```

### 3. Générer un produit

1. Allez dans "Configurateur"
2. Sélectionnez une famille
3. Sélectionnez une variante
4. Remplissez les champs du formulaire
5. Cliquez sur "Générer le code"
6. Le code généré s'affiche

## API

Voir le fichier [API_EXAMPLES.md](./API_EXAMPLES.md) pour des exemples complets d'appels API.

## Types de règles

### raw
Copie la valeur telle quelle.

### map
Convertit une valeur selon une table de correspondance.

Exemple:
- Valeur: "Intel" → Code: "I"
- Valeur: "AMD" → Code: "A"

### pad_left
Complète une valeur à gauche avec un caractère jusqu'à une longueur donnée.

Exemple:
- Valeur: 16, length: 3, char: "0" → Code: "016"

### range_bin
Classe un nombre dans une catégorie selon des plages.

Exemple:
- Valeur: 8 → Code: "A" (si dans la plage 0-8)
- Valeur: 16 → Code: "B" (si dans la plage 9-16)

## Scripts disponibles

### Backend
- `npm run start:dev` - Démarrer en mode développement
- `npm run build` - Compiler le projet
- `npm run start:prod` - Démarrer en mode production
- `npm run prisma:generate` - Générer le client Prisma
- `npm run prisma:migrate` - Exécuter les migrations
- `npm run prisma:studio` - Ouvrir Prisma Studio

### Frontend
- `npm run dev` - Démarrer le serveur de développement
- `npm run build` - Compiler pour la production
- `npm run preview` - Prévisualiser le build de production

## Modèles de données

### Family
- `id`: UUID
- `name`: string

### Variant
- `id`: UUID
- `familyId`: UUID (référence à Family)
- `name`: string

### Field
- `id`: UUID
- `name`: string
- `type`: "string" | "number" | "boolean" | "select"
- `familyId`: UUID? (optionnel)
- `variantId`: UUID? (optionnel)
- `position`: number

### Rule
- `id`: UUID
- `fieldId`: UUID (référence à Field, unique)
- `ruleType`: "raw" | "map" | "pad_left" | "range_bin"
- `config`: JSON

### Product
- `id`: UUID
- `familyId`: UUID
- `variantId`: UUID
- `values`: JSON (valeurs des champs)
- `generatedCode`: string (code généré)

## Développement

### Ajouter un nouveau type de règle

1. Modifier le schema Prisma pour ajouter le type dans l'enum (si nécessaire)
2. Ajouter le cas dans `ProductsService.applyRule()`
3. Mettre à jour le frontend pour supporter le nouveau type

### Ajouter un nouveau type de champ

1. Modifier le schema Prisma
2. Mettre à jour la validation dans `FieldsService`
3. Ajouter le rendu dans `ConfiguratorPage.renderFieldInput()`

## Licence

MIT

