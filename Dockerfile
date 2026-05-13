# Step 1: Base Image (Use full node 20 for build stability)
FROM node:20 AS base

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Step 2: Dependencies
COPY package*.json ./

# CRITICAL FIX: Add --legacy-peer-deps if you have version conflicts
RUN npm ci --omit=dev --legacy-peer-deps

# Step 3: Final Build Stage
FROM node:20-slim AS runner

# Install timezone data (tzdata) to prevent crash
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production dependencies from base stage
COPY --from=base /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Security: Use non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Start
CMD ["node", "index.js"]