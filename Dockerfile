# syntax=docker/dockerfile:1

# ---- base ---------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
# libc6-compat + openssl are needed by the Prisma query engine on Alpine.
RUN apk add --no-cache libc6-compat openssl

# ---- deps (installs node_modules + generates Prisma client) --------------
FROM base AS deps
# Copy the Prisma schema too: the package.json "postinstall" runs
# `prisma generate`, which needs prisma/schema.prisma to exist.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---- build --------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Full node_modules is copied so the Prisma CLI is available at boot for
# `prisma db push`, and the generated client + query engine ship with it.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
