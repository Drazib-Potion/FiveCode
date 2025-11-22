FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 5173

# Commande par défaut
CMD ["npm", "run", "dev", "--", "--host"]

