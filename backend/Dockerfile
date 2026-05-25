# Base image
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
# Install all dependencies (including dev for Prisma/TS)
RUN npm ci

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client and build TS
RUN npx prisma generate
RUN npm run build

# Production stage
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force
# Re-generate Prisma Client for the prod environment
RUN npx prisma generate

EXPOSE 4000

# Use a startup script: run DB migrations first, then start the server.
# `prisma migrate deploy` is safe to run on every startup — it's idempotent.
COPY --from=builder /app/start.sh ./start.sh
RUN chmod +x ./start.sh
CMD ["./start.sh"]
