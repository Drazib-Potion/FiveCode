# Configurateur de Produits

## 🚀 Développement Local

### Prérequis
- Node.js 18+
- Docker (pour la base de données)

### Démarrage

1. **Démarrer la base de données** :
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. **Backend** (dans un terminal) :
```bash
cd backend
npm install
npm run start:dev
```

3. **Frontend** (dans un autre terminal) :
```bash
cd frontend
npm install
npm run dev
```

### Configuration
- Backend : Créez `backend/.env` avec vos variables (voir `ENV_VARIABLES.md`)
- Frontend : Créez `frontend/.env` avec `VITE_API_URL=/api`

---

## 🐳 Production (Docker)

### Prérequis
- Docker et Docker Compose

### Démarrage

1. **Créer `.env.prod`** à la racine avec vos variables de production

2. **Lancer tous les services** :
```bash
docker-compose --env-file .env.prod up -d --build
```

3. **Voir les logs** :
```bash
docker-compose --env-file .env.prod logs -f
```

4. **Arrêter** :
```bash
docker-compose --env-file .env.prod down
```

---

## 📝 Variables d'environnement

Voir `ENV_VARIABLES.md` pour la liste complète des variables et où créer les fichiers `.env`.
