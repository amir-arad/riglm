# Stage 1: Client build stage
FROM node:23-alpine AS client-builder

# Set working directory
WORKDIR /app

# Copy client package.json and package-lock.json
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source files
COPY client/ ./

# Build client
RUN npm run build

# Stage 2: Server build stage
FROM node:23-alpine AS server-builder

# Set working directory
WORKDIR /app

# Install dependencies first (good caching practice)
COPY server/package*.json ./
# Install all dependencies for build
RUN npm ci

# Copy server source files
COPY server/ ./

# Build server
RUN npm run build

# Copy client build to server
COPY --from=client-builder /app/dist ./client-build

# Stage 3: Production stage
FROM node:23-alpine

# Default environment variables (can be overridden at runtime)
ENV NODE_ENV=production \
    PORT=3000 \
    DB_TYPE=sqlite \
    SQLITE_DB_PATH=./data/database.sqlite \
    LOG_LEVEL=info \
    CORS_ORIGIN=* \
    ALLOWED_REDIRECT_DOMAINS=localhost \
    CLIENT_BUILD_PATH=client-build

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# App directory setup
WORKDIR /app
# Copy package.json and package-lock.json
COPY --from=server-builder --chown=appuser:appgroup /app/package*.json ./
# Copy node_modules
COPY --from=server-builder --chown=appuser:appgroup /app/node_modules ./node_modules
# Copy compiled JavaScript files
COPY --from=server-builder --chown=appuser:appgroup /app/dist ./dist
# Copy client build
COPY --from=server-builder --chown=appuser:appgroup /app/client-build ./client-build
# Create data and logs directories
RUN mkdir -p ./data ./logs && \
    chown -R appuser:appgroup ./data ./logs

# Expose port (matches PORT environment variable)
EXPOSE 3000

# Switch to non-root user
USER appuser

# Start your application
CMD ["node", "dist/index.js"]
