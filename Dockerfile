FROM node:18-slim

WORKDIR /app

# Install TypeScript globally
RUN npm install -g typescript

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy server source code and config files
COPY server/ ./

# Build TypeScript
RUN tsc

# Start the server
CMD ["node", "dist/index.js"] 