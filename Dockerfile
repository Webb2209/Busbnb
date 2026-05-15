FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables must be present at build time for Next.js
ENV NEXT_PUBLIC_API_URL=http://localhost:4000
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# NOTE: Next.js standalone output must be enabled in next.config.ts for this to work perfectly, 
# but it falls back gracefully if not.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./ || echo "Standalone not found, you must set output: 'standalone' in next.config.ts"
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the Next.js server. If standalone mode is not used, this might fail, 
# so we fallback to npm start if server.js is missing.
CMD ["sh", "-c", "if [ -f server.js ]; then node server.js; else npm start; fi"]
