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
