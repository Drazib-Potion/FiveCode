# Guide Docker - Configuration de la base de données

Ce guide explique comment utiliser Docker pour la base de données PostgreSQL, avec deux options :
1. **Option 1 (Recommandée pour le développement)** : Juste la BDD sur Docker
2. **Option 2** : Tout dockeriser (BDD + Backend + Frontend)

## Option 1 : Juste la BDD sur Docker (Recommandée)

Cette approche est idéale pour le développement car :
- ✅ Simple à gérer
- ✅ Développement normal du frontend/backend (hot-reload, debug, etc.)
- ✅ Facile de reset la BDD
- ✅ Pas besoin de rebuild les images à chaque changement de code

### Étape 1 : Démarrer PostgreSQL

```bash
# Démarrer la base de données
docker-compose up -d postgres

# Vérifier que le conteneur tourne
docker ps

# Voir les logs
docker-compose logs postgres
```

### Étape 2 : Configurer le backend

Créez `backend/.env` :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/product_configurator?schema=public"
JWT_SECRET="votre-cle-secrete-generee-avec-openssl-rand-base64-32"
JWT_EXPIRES_IN="24h"
PORT=3000
```

**Note** : Le mot de passe par défaut dans docker-compose est `postgres`. Changez-le si nécessaire.

### Étape 3 : Initialiser Prisma

```bash
cd backend

# Installer les dépendances
npm install

# Générer le client Prisma
npm run prisma:generate

# Créer et appliquer les migrations
npm run prisma:migrate
```

### Étape 4 : Démarrer le backend et frontend normalement

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Commandes utiles

```bash
# Arrêter la base de données
docker-compose down

# Arrêter et supprimer les volumes (reset complet de la BDD)
docker-compose down -v

# Voir les logs de la BDD
docker-compose logs -f postgres

# Se connecter à la BDD avec psql
docker-compose exec postgres psql -U postgres -d product_configurator

# Redémarrer la BDD
docker-compose restart postgres
```

### Changer le mot de passe PostgreSQL

1. Modifiez `docker-compose.yml` :
```yaml
environment:
  POSTGRES_PASSWORD: votre_nouveau_mot_de_passe
```

2. Modifiez `backend/.env` :
```env
DATABASE_URL="postgresql://postgres:votre_nouveau_mot_de_passe@localhost:5432/product_configurator?schema=public"
```

3. Redémarrez :
```bash
docker-compose down -v
docker-compose up -d postgres
```

## Option 2 : Tout dockeriser

Cette approche est utile pour :
- 🐳 Environnement de production/staging
- 🐳 Tests d'intégration
- 🐳 Déploiement simplifié

### Étape 1 : Créer le fichier .env à la racine

Créez un fichier `.env` à la racine du projet :

```env
JWT_SECRET="votre-cle-secrete-generee-avec-openssl-rand-base64-32"
```

### Étape 2 : Démarrer tous les services

```bash
# Démarrer tout (BDD + Backend + Frontend)
docker-compose -f docker-compose.full.yml up -d

# Voir les logs de tous les services
docker-compose -f docker-compose.full.yml logs -f

# Voir les logs d'un service spécifique
docker-compose -f docker-compose.full.yml logs -f backend
```

### Étape 3 : Initialiser Prisma (première fois)

```bash
# Exécuter les migrations dans le conteneur backend
docker-compose -f docker-compose.full.yml exec backend npm run prisma:migrate
```

### Étape 4 : Accéder à l'application

- Frontend : http://localhost:5173
- Backend : http://localhost:3000
- Base de données : localhost:5432

### Commandes utiles

```bash
# Arrêter tous les services
docker-compose -f docker-compose.full.yml down

# Arrêter et supprimer les volumes
docker-compose -f docker-compose.full.yml down -v

# Rebuild les images
docker-compose -f docker-compose.full.yml build

# Redémarrer un service spécifique
docker-compose -f docker-compose.full.yml restart backend

# Exécuter une commande dans un conteneur
docker-compose -f docker-compose.full.yml exec backend npm run prisma:studio
```

## Comparaison des deux approches

| Aspect | Option 1 (BDD seule) | Option 2 (Tout dockerisé) |
|--------|---------------------|--------------------------|
| **Simplicité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Hot-reload** | ✅ Natif | ⚠️ Via volumes |
| **Debug** | ✅ Facile | ⚠️ Plus complexe |
| **Reset BDD** | ✅ `docker-compose down -v` | ✅ `docker-compose down -v` |
| **Production-like** | ❌ | ✅ |
| **Dépendances locales** | ✅ Node.js requis | ❌ Juste Docker |

## Recommandation

**Pour le développement** : Utilisez l'**Option 1** (juste la BDD sur Docker)
- Plus simple
- Meilleure expérience de développement
- Hot-reload fonctionne parfaitement

**Pour la production/staging** : Utilisez l'**Option 2** (tout dockerisé)
- Environnement isolé
- Facilite le déploiement
- Cohérence entre environnements

## Résolution de problèmes

### Erreur : "port 5432 is already in use"

Vous avez déjà PostgreSQL qui tourne localement. Soit :
1. Arrêtez le service local : `brew services stop postgresql@14` (macOS)
2. Changez le port dans docker-compose.yml : `"5433:5432"` et mettez à jour `.env`

### Erreur : "connection refused"

Vérifiez que le conteneur tourne :
```bash
docker ps
docker-compose logs postgres
```

### Reset complet de la base de données

```bash
# Option 1
docker-compose down -v
docker-compose up -d postgres
cd backend && npm run prisma:migrate

# Option 2
docker-compose -f docker-compose.full.yml down -v
docker-compose -f docker-compose.full.yml up -d
docker-compose -f docker-compose.full.yml exec backend npm run prisma:migrate
```

### Voir les données avec Prisma Studio

**Option 1** :
```bash
cd backend
npm run prisma:studio
```

**Option 2** :
```bash
docker-compose -f docker-compose.full.yml exec backend npm run prisma:studio
# Puis accédez à http://localhost:5555 depuis votre navigateur
```

## Structure des fichiers Docker

```
FiveCodePoc/
├── docker-compose.yml          # BDD seule (Option 1)
├── docker-compose.full.yml     # Tout dockerisé (Option 2)
├── backend/
│   ├── Dockerfile
│   └── .dockerignore
└── frontend/
    ├── Dockerfile
    └── .dockerignore
```

## Workflow de développement recommandé

1. **Démarrer la BDD** : `docker-compose up -d postgres`
2. **Développer le backend** : `cd backend && npm run start:dev`
3. **Développer le frontend** : `cd frontend && npm run dev`
4. **Tester** : Accéder à http://localhost:5173
5. **Arrêter la BDD** : `docker-compose down` (quand vous avez fini)

C'est tout ! 🎉

