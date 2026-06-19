# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.4

# Copy monorepo configuration and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package descriptors for caching layer
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy codebase and build Next.js app
COPY . .
RUN pnpm --filter web build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@8.15.4

# Copy built outputs and dependencies
COPY --from=builder /app ./

EXPOSE 3000
ENV NODE_ENV=production
PORT=3000

CMD ["pnpm", "--filter", "web", "start"]
