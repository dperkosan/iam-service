FROM node:20.16-alpine3.19

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . ./

USER node
