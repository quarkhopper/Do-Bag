# Build stage
FROM node:18-slim as builder

WORKDIR /build

# Copy package files and TypeScript config
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY server/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy built files from builder stage
COPY --from=builder /build/dist ./dist

# Start the server
CMD ["node", "dist/index.js"] 