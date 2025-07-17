# Build stage
FROM node:24.4.0-alpine AS builder

# Install pnpm globally with specific version
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY backend/package.json ./backend/
COPY backend/packages/*/package.json ./backend/packages/*/
COPY backend/apps/*/package.json ./backend/apps/*/
COPY frontend/package.json ./frontend/
COPY frontend/packages/*/package.json ./frontend/packages/*/
COPY frontend/apps/*/package.json ./frontend/apps/*/
COPY specs/package.json ./specs/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build backend packages
RUN pnpm --filter "./backend/**" run build

# Development stage
FROM node:24.4.0-alpine AS development

# Install pnpm globally and development tools
RUN apk add --no-cache bash wget && \
    corepack enable && corepack prepare pnpm@10.13.1 --activate

# Create non-root user
RUN adduser -D -s /bin/sh appuser

# Set working directory
WORKDIR /app

# Copy root package.json first to get packageManager
COPY --chown=appuser:appuser package.json ./

# Copy everything for development
COPY --chown=appuser:appuser . .

# Install all dependencies (including dev)
RUN pnpm install

# Build all packages in development for tsx to work properly
RUN pnpm --filter "./backend/packages/**" run build

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Default command for development
CMD ["pnpm", "--filter", "@beauty-salon-backend/server", "dev"]

# Production stage
FROM node:24.4.0-alpine AS production

# Install pnpm globally and runtime dependencies
RUN apk add --no-cache bash wget && \
    corepack enable && corepack prepare pnpm@10.13.1 --activate

# Create non-root user
RUN adduser -D -s /bin/sh appuser

# Set working directory
WORKDIR /app

# Copy remaining package files
COPY --chown=appuser:appuser pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY --chown=appuser:appuser backend/package.json ./backend/
COPY --chown=appuser:appuser backend/packages/*/package.json ./backend/packages/*/
COPY --chown=appuser:appuser backend/apps/*/package.json ./backend/apps/*/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder --chown=appuser:appuser /app/backend/packages/*/dist ./backend/packages/*/dist/
COPY --from=builder --chown=appuser:appuser /app/backend/apps/*/dist ./backend/apps/*/dist/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Production command
CMD ["node", "backend/apps/server/dist/index.js"]