FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production=false

# Build
COPY tsconfig.json ./
COPY src/ ./src/
COPY drizzle.config.ts ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY --from=base /app/dist ./dist
COPY --from=base /app/drizzle.config.ts ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/index.js"]
