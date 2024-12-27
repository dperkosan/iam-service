# Stage 1: Base setup
FROM node:20.16-alpine3.19 AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Stage 2: Development setup
FROM base AS development

COPY . ./

USER node

ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "run", "dev"]

# Stage 3: Production build
FROM base AS build

COPY . ./

RUN npm run build

# Stage 4: Production setup
FROM node:20.16-alpine3.19 AS production

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

RUN npm ci --omit=dev --ignore-scripts

USER node

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]