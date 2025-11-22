#!/bin/bash

# Script pour démarrer rapidement la base de données Docker

echo "🚀 Démarrage de PostgreSQL avec Docker..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Installez Docker d'abord."
    exit 1
fi

# Démarrer la base de données
docker-compose up -d postgres

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente que PostgreSQL soit prêt..."
sleep 5

# Vérifier le statut
if docker ps | grep -q product_configurator_db; then
    echo "✅ PostgreSQL est démarré et accessible sur localhost:5432"
    echo ""
    echo "📝 Prochaines étapes:"
    echo "   1. cd backend"
    echo "   2. npm install"
    echo "   3. npm run prisma:generate"
    echo "   4. npm run prisma:migrate"
    echo "   5. npm run start:dev"
    echo ""
    echo "🔍 Voir les logs: docker-compose logs -f postgres"
    echo "🛑 Arrêter: docker-compose down"
else
    echo "❌ Erreur lors du démarrage de PostgreSQL"
    docker-compose logs postgres
    exit 1
fi

