# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Installer OpenSSL pour Prisma
RUN apk add --no-cache openssl libc6-compat

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer toutes les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier le reste du code
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Build l'application et vérifier que main.js est créé
RUN npm run build
RUN echo "=== Checking dist directory ===" && ls -la dist/ && echo "=== Looking for main.js ===" && find dist -name "main.js" -o -name "main.*" && test -f dist/main.js && echo "✓ dist/main.js exists" || (echo "✗ dist/main.js NOT FOUND" && echo "=== Full dist structure ===" && find dist -type f && exit 1)

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Installer OpenSSL pour Prisma
RUN apk add --no-cache openssl libc6-compat

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier le client Prisma généré et les fichiers buildés depuis le stage builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copier le dossier dist complet
COPY --from=builder /app/dist ./dist

# Vérifier que dist/main.js existe avant de démarrer
RUN test -f dist/main.js && echo "✓ dist/main.js exists in production" || (echo "✗ dist/main.js NOT FOUND in production" && ls -la dist/ && exit 1)

# Script de démarrage avec migrations Prisma
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Running Prisma migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'node dist/main.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Exposer le port (Railway utilisera le PORT de l'environnement)
EXPOSE 3000

# Commande de production avec migrations
CMD ["/app/start.sh"]
