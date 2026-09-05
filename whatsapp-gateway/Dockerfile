FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --production

# Copy application source
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
