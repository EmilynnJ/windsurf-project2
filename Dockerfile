# SoulSeer Dockerfile for Fly.io
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies for building native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build all packages
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS production

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/sh -m nodejs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs shared/package*.json ./shared/
COPY --chown=nodejs:nodejs client/package*.json ./client/
COPY --chown=nodejs:nodejs server/package*.json ./server/

# Install only production dependencies
RUN npm install --omit=dev

# Copy built files from builder
COPY --chown=nodejs:nodejs --from=builder /app/shared/dist ./shared/dist
COPY --chown=nodejs:nodejs --from=builder /app/client/dist ./client/dist
COPY --chown=nodejs:nodejs --from=builder /app/server/dist ./server/dist

USER nodejs

# Expose port
EXPOSE 8080

# Start the production server
CMD ["node", "server/dist/src/production.js"]