# Variables d'Environnement

## Fichiers nécessaires

- **`backend/.env`** : Variables pour le backend en développement local
- **`frontend/.env`** : Variables pour le frontend en développement local
- **`.env.prod`** (racine) : Variables pour la production Docker

## Variables Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/product_configurator
JWT_SECRET=your-secret-key-here
PORT=3000
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## Variables Frontend (`frontend/.env`)

```env
VITE_API_URL=/api
```

## Variables Production (`.env.prod` à la racine)

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-strong-password
POSTGRES_DB=product_configurator
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=3000
JWT_SECRET=your-strong-secret-key
CORS_ORIGIN=http://localhost:80,http://localhost

# Frontend
FRONTEND_PORT=80
VITE_API_URL=/api
```

