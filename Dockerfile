# Step 1: Base Image
FROM node:20-slim AS base

# Install build dependencies (if needed for bcrypt, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Step 2: Dependencies
COPY package*.json ./
# RUN npm ci --only=production
RUN npm ci --omit=dev

# Step 3: Final Build Stage
FROM node:20-slim AS runner

WORKDIR /app

# Copy production dependencies from base
COPY --from=base /app/node_modules ./node_modules
COPY . .

# Set Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Use a non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { if (res.statusCode !== 200) process.exit(1); })"

# Start the application
CMD ["node", "index.js"]