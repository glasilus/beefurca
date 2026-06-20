# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.4

# Копируем весь монорепозиторий целиком: так pnpm видит все workspace-пакеты,
# и lockfile сходится с воркспейсом (иначе --frozen-lockfile падает).
COPY . .

# Ставим все зависимости (включая dev — они нужны для компиляции tsc).
RUN pnpm install --frozen-lockfile

# Собираем ТОЛЬКО API и его workspace-зависимости (database, shared-types и т.д.)
# в правильном порядке. turbo сам подтянет зависимости через dependsOn "^build"
# и не трогает web/mobile.
RUN pnpm exec turbo run build --filter=api

# ---- Runner stage ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@8.15.4
ENV NODE_ENV=production \
    PORT=5000

# Переносим собранный код и установленные зависимости из build-стадии.
COPY --from=builder /app ./

EXPOSE 5000
CMD ["pnpm", "--filter", "api", "start"]
