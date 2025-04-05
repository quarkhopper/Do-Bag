FROM node:18-slim

WORKDIR /app

# Install TypeScript globally
RUN npm install -g typescript

# Copy server package files and TypeScript config
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install dependencies
RUN npm install

# Create src directory
RUN mkdir -p src

# Copy server source code
COPY server/src ./src

# Build TypeScript
RUN npm run build

# Start the server
CMD ["node", "dist/index.js"] 