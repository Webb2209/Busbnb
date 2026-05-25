# Base image
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies stage — copy only package files to leverage Docker cache
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build stage — compile TypeScript and generate Prisma client
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
# Build context is ./backend (Railway sets context = Dockerfile's directory)
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage — lean image with only what's needed to run
FROM base AS runner
ENV NODE_ENV=production

# Prisma's native schema engine requires OpenSSL — not included in node:20-alpine
RUN apk add --no-cache openssl

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/start.sh ./start.sh

# Install only production dependencies and re-generate Prisma Client
RUN npm ci --omit=dev && npm cache clean --force
RUN npx prisma generate
RUN chmod +x ./start.sh

EXPOSE 4000
# start.sh runs `prisma migrate deploy` then `node dist/index.js`
CMD ["./start.sh"]
