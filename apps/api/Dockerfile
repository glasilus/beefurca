# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.4

# Copy monorepo configuration and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package descriptors for caching layer
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/bracket-engine/package.json ./packages/bracket-engine/
COPY packages/elo-calculator/package.json ./packages/elo-calculator/
COPY packages/excel-generator/package.json ./packages/excel-generator/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy codebase and compile TypeScript
COPY . .
RUN pnpm build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@8.15.4

# Copy built outputs and dependencies
COPY --from=builder /app ./

EXPOSE 5000
ENV NODE_ENV=production \
    PORT=5000

CMD ["pnpm", "--filter", "api", "start"]
