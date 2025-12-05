FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build
RUN echo "=== Checking dist directory ===" && ls -la dist/ && echo "=== Looking for main.js ===" && find dist -name "main.js" -o -name "main.*" && test -f dist/main.js && echo "✓ dist/main.js exists" || (echo "✗ dist/main.js NOT FOUND" && echo "=== Full dist structure ===" && find dist -type f && exit 1)

FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

RUN test -f dist/main.js && echo "✓ dist/main.js exists in production" || (echo "✗ dist/main.js NOT FOUND in production" && ls -la dist/ && exit 1)

RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Running Prisma migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'node dist/main.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
