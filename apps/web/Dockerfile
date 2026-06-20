# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.4

# Копируем весь монорепозиторий целиком: так pnpm видит все workspace-пакеты,
# и lockfile сходится с воркспейсом (иначе --frozen-lockfile падает).
COPY . .

# Ставим все зависимости (включая dev — нужны для сборки Next.js).
RUN pnpm install --frozen-lockfile

# Адрес API вшивается в бандл Next.js на этапе СБОРКИ, поэтому пробрасываем его
# build-аргументом (по умолчанию — локальный dev-сервер).
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Собираем только веб и его workspace-зависимости.
RUN pnpm exec turbo run build --filter=web

# ---- Runner stage ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@8.15.4
ENV NODE_ENV=production \
    PORT=3000

# Переносим собранный код и установленные зависимости из build-стадии.
COPY --from=builder /app ./

EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
