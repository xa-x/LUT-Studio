# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM oven/bun:1 AS deps

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy lockfile and package manifest first for layer caching
COPY package.json bun.lock ./

# Install ALL dependencies (including devDependencies for build step)
RUN bun install --frozen-lockfile

# ============================================================
# Stage 2: Build
# ============================================================
FROM oven/bun:1 AS builder

# Need build tools again in case any native module is rebuilt during build
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry — disable it
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build

# ============================================================
# Stage 3: Production Runner
# ============================================================
FROM node:22-slim AS runner

# Install runtime libs that better-sqlite3's native addon needs
RUN apt-get update && apt-get install -y \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN groupadd --gid 1001 appuser \
    && useradd --uid 1001 --gid appuser --shell /bin/bash --create-home appuser

# Copy standalone server output from builder
COPY --from=builder /app/.next/standalone ./
# Copy static assets (not included in standalone by default)
COPY --from=builder /app/.next/static ./.next/static
# Copy public folder
COPY --from=builder /app/public ./public

# Create data directory and set ownership
RUN mkdir -p /app/data && chown -R appuser:appuser /app/data /app

USER appuser

# Persistent volume for SQLite database
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/').then(r => { process.exit(r.ok ? 0 : 1) }).catch(() => process.exit(1))"

CMD ["node", "server.js"]
