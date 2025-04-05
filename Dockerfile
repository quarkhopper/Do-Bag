FROM node:18-slim

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy server source code
COPY server/ ./

# Build TypeScript
RUN npm run build

# Start the server
CMD ["node", "dist/index.js"] 