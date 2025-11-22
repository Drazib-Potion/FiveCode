# Configuration de l'environnement

Créez un fichier `.env` à la racine du dossier `backend/` avec le contenu suivant:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/product_configurator?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="24h"
PORT=3000
```

## Variables d'environnement

- `DATABASE_URL`: URL de connexion à PostgreSQL
  - Format: `postgresql://username:password@host:port/database?schema=public`
  - Remplacez `user`, `password`, `localhost`, `5432` et `product_configurator` par vos valeurs

- `JWT_SECRET`: Clé secrète pour signer les tokens JWT
  - Utilisez une chaîne aléatoire et sécurisée en production
  - Exemple: `openssl rand -base64 32`

- `JWT_EXPIRES_IN`: Durée de validité des tokens JWT
  - Format: nombre suivi de l'unité (ex: "24h", "7d", "3600s")

- `PORT`: Port sur lequel le serveur écoute (par défaut: 3000)

