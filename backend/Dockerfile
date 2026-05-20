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

# Install only production dependencies (no PM2 needed in Docker)
RUN npm ci --omit=dev && npm cache clean --force
# Re-generate Prisma Client for the prod environment
RUN npx prisma generate

EXPOSE 4000
# Run Node directly — Docker/Kubernetes handle process supervision and scaling.
# PM2 cluster mode is reserved for bare-metal via `npm run start:prod`.
CMD ["node", "dist/index.js"]
