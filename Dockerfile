FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:20-slim
WORKDIR /app

# 1) Install CA bundle + tzdata (TLS + time)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tzdata curl \
 && update-ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# 2) Copy only what's needed at runtime
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./
# Or if you build to /dist: COPY --from=builder /app/dist ./dist

# Security: drop root
RUN useradd -m appuser
USER appuser

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
# Or: ["node", "dist/server.js"] if you build TS
