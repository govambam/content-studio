FROM node:22-slim AS builder
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies
RUN npm ci

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/
COPY tsconfig.json ./

# Build shared + web
RUN npm run build -w packages/shared && npm run build -w apps/web

# Serve static files with a lightweight server
FROM node:22-slim
WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/apps/web/dist/ ./dist/

CMD ["serve", "-s", "dist", "-l", "3000"]
