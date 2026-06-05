# Use Node.js 20 lightweight Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies (runs prisma generate automatically via postinstall)
RUN npm ci

# Copy source code
COPY src ./src/

# Expose backend port
EXPOSE 4000

# Start Express server
CMD ["npm", "start"]
