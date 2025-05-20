# Docker Environment Setup Plan

## Current State Analysis

1. The server has a Dockerfile for containerizing the Node.js application
2. The server has a `.env` file with development configuration
3. There's an `.env.example` file for reference
4. The docker-compose.yml file has minimal environment configuration
5. The `.gitignore` file only ignores node_modules, but not `.env` files

## Implementation Plan

### 1. Update .gitignore

Add `.env` files to `.gitignore` to prevent committing sensitive information while keeping the `.env.example` file for reference:

```
node_modules
.env
server/.env
```

### 2. Update Dockerfile

Modify the Dockerfile to properly handle environment variables:

```dockerfile
# Stage 1: Build stage
FROM node:23-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies first (good caching practice)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy remaining source files
COPY . .

# Run build (uncomment if your app has a build step, e.g., TypeScript)
# RUN npm run build

# Stage 2: Production stage
FROM node:23-alpine

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# App directory setup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app ./

# Default environment variables (can be overridden at runtime)
ENV NODE_ENV=production \
    PORT=3000 \
    DB_TYPE=sqlite \
    SQLITE_DB_PATH=./data/database.sqlite \
    LOG_LEVEL=info \
    CORS_ORIGIN=* \
    ALLOWED_REDIRECT_DOMAINS=localhost

# Expose port (matches PORT environment variable)
EXPOSE 3000

# Switch to non-root user
USER appuser

# Start your application
CMD ["node", "index.js"]
```

### 3. Update docker-compose.yml

Configure docker-compose.yml to load environment variables from `.env` file:

```yaml
services:
  ghostwheels:
    build:
      context: ./server
      dockerfile: Dockerfile
      # Enable BuildKit features
      args:
        BUILDKIT_INLINE_CACHE: 1
    ports:
      - "3000:3000"  # Match the port inside the container
    env_file:
      - ./server/.env
    environment:
      - NODE_ENV=production
    volumes:
      - ./server/data:/app/data  # For database persistence
    restart: unless-stopped
```

### 4. Create production-ready .env file

Ensure the `.env` file has production-appropriate settings:

```
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
# Options: in-memory, sqlite
DB_TYPE=sqlite
# Only used when DB_TYPE is sqlite
SQLITE_DB_PATH=./data/database.sqlite

# JWT Configuration
JWT_SECRET=replace_with_strong_secret_in_production
JWT_EXPIRES_IN=1d

# OAuth Configuration
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_CALLBACK_URL=http://your-production-domain.com/api/auth/callback

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://your-frontend-domain.com

# Security
# Comma-separated list of allowed domains for redirect URLs
ALLOWED_REDIRECT_DOMAINS=your-production-domain.com
```

### 5. Security Best Practices

1. Use Docker secrets or environment variables for sensitive information
2. Never bake secrets into Docker images
3. Set proper file permissions for .env files
4. Use strong, unique values for all secrets
5. Consider using a secrets management service for production deployments

## Implementation Steps

1. Update `.gitignore` to exclude `.env` files
2. Update the Dockerfile to properly handle environment variables
3. Update docker-compose.yml to use the `.env` file and expose the correct ports
4. Create a production-ready `.env` file with secure values
5. Test the Docker setup locally before deploying

## Notes

- The `.env.example` file should remain in the repository as a template
- For actual production deployment, consider using Docker Swarm or Kubernetes secrets
- Implement proper backup strategies for database volumes