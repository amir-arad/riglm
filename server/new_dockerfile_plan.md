# New Dockerfile Plan

## Overview

This document outlines the plan for creating a new Dockerfile for the ABC server project. The Dockerfile will be designed to:

1. Build and run the server only (no client-side build)
2. Run on port 56667
3. Read configuration from a mounted ./data folder
4. Use node:23-alpine as the base image
5. Support running Docker commands when the Docker socket is mounted

## Dockerfile Structure

The Dockerfile will use a multi-stage build approach:

### Builder Stage (`node:23-alpine AS builder`)
- Install build tools and curl
- Download and install Docker CLI
- Copy package*.json and install all dependencies
- Copy source code and build the application

### Final Stage (`node:23-alpine`)
- Create non-root user
- Set up working directory and environment
- Copy built artifacts and Docker CLI from builder
- Configure volumes and permissions
- Set up runtime parameters

## Architecture Diagram

```mermaid
graph TD
    A[Base: node:23-alpine AS builder] --> B(Install build tools, curl);
    B --> B1(Download & Install Docker CLI);
    B1 --> C(Copy package*.json);
    C --> D(RUN npm ci);
    D --> E(Copy all source code);
    E --> F(RUN npm run build);

    G[Base: node:23-alpine AS final] --> H(Create appuser/appgroup);
    H --> I(Set WORKDIR /app);
    I --> J(ENV NODE_ENV=production PORT=56667);
    J --> K(COPY --from=builder package*.json ./);
    K --> L(RUN npm ci --omit=dev);
    L --> M(COPY --from=builder /app/dist ./dist);
    M --> N(COPY --from=builder /usr/local/bin/docker /usr/local/bin/docker);
    N --> O(RUN mkdir -p ./data ./logs && chown -R appuser:appgroup ./data ./logs);
    O --> P(VOLUME /app/data);
    P --> Q(USER appuser);
    Q --> R(EXPOSE 56667);
    R --> S(CMD ["node", "dist/index.js"]);

    subgraph Builder Stage
        A
        B
        B1
        C
        D
        E
        F
    end

    subgraph Final Stage
        G
        H
        I
        J
        K
        L
        M
        N
        O
        P
        Q
        R
        S
    end
```

## Runtime Considerations

### Configuration Files
- The `.env` file should be mounted at `/app/data/.env` in the container
- The main configuration file path should be specified as an environment variable in the `.env` file
- The application should be configured to load `.env` from `/app/data/.env`

### Volume Mounts
When running the container, you'll need to:
1. Mount your local `./data` directory to `/app/data` in the container
2. Mount the Docker socket (e.g., `-v /var/run/docker.sock:/var/run/docker.sock`) if Docker commands are needed

### Security
- The application runs as a non-root user (`appuser`)
- Only production dependencies are installed in the final image
- The Docker socket mount should be used cautiously as it grants significant privileges

## Next Steps

1. Implement the Dockerfile according to this plan
2. Test the build process
3. Verify configuration loading from mounted volumes
4. Test Docker command functionality when socket is mounted
5. Validate security measures