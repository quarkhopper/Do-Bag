FROM node:18-slim AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Start in development mode
CMD ["npm", "run", "dev"]

FROM node:18-slim AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy source code and build
COPY . .
RUN npm run build

# Start the server
CMD ["node", "dist/index.js"] 