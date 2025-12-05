# 🚀 Product Configurator

Full-stack NestJS + React app (deployed on Railway) to manage an industrial articles catalog, generate unique article codes, and feed SAP orders with those codes.

## 🎬 Demo

<iframe src="https://player.vimeo.com/video/1141417291?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" width="1434" height="722" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" title="demo-fivesCode"></iframe>

## 🧰 Requirements
- Node.js 18+
- npm
- PostgreSQL (or Docker)

## ⚡ Quick start (local)
```bash
# 1) Database (Docker) 🐳
POSTGRES_USER=postgres \
POSTGRES_PASSWORD=postgres \
POSTGRES_DB=product_configurator \
POSTGRES_PORT=5432 \
docker compose -f docker-compose.dev.yml up -d

# 2) Backend (API) 🛠️
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev     # http://localhost:3000

# 3) Frontend (UI) 🎨
cd ../frontend
npm install
echo "VITE_API_URL=http://localhost:3000" > .env
npm run dev           # http://localhost:5173
```

## 🔑 Environment variables
- Backend: `PORT`, `CORS_ORIGIN`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- Frontend: `VITE_API_URL`

## 📜 Useful scripts
- Backend: `npm run start:dev`, `npm run test`, `npm run prisma:migrate`, `npm run prisma:seed`
- Frontend: `npm run dev`, `npm run build`, `npm run preview`