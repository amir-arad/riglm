
FROM node:23-alpine AS builder
RUN apk add --no-cache \
    curl \
    docker-cli
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:23-alpine
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup
WORKDIR /app
ENV NODE_ENV=production \
    PORT=56667
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env .env
# COPY --from=builder /usr/bin/docker /usr/bin/docker
RUN mkdir -p ./data ./logs && \
    chown -R appuser:appgroup ./data ./logs
VOLUME /app/data
USER appuser
EXPOSE 56667
CMD ["node", "dist/index.js"]
