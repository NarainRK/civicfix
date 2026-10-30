FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

ENV NODE_ENV=production

USER node

EXPOSE 5000

CMD ["npm", "start"]