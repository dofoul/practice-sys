# ============================================================
# Многоступенчатый Dockerfile для Next.js 15 + Prisma
# Цели (targets):
#   dev    — разработка с hot-reload (docker-compose)
#   runner — production-образ (минимальный, standalone)
#
# Использует BuildKit cache для npm — повторные сборки быстрее.
# Требует: DOCKER_BUILDKIT=1 (включён по умолчанию в Docker Desktop)
# ============================================================

# ---------- Базовый слой с зависимостями ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm config set registry https://registry.npmmirror.com/ && \
    npm install --no-audit --no-fund --prefer-offline

# ---------- Слой разработки (hot-reload) ----------
FROM node:20-alpine AS dev
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------- Сборка production ----------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Финальный production-образ ----------
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
