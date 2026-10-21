# Node.js API Gateway Container (ShaktiSense Express & Admin Dashboard)
FROM node:20-slim

WORKDIR /app

# Install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend application source
COPY backend/ .

# Copy admin dashboard assets
COPY admin/ ./admin/

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]
