FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY data/poe_test.db ./data/poe_test.db

ENV NODE_ENV=production \
    POE_DB_PATH=/data/poe_test.db

EXPOSE 8080

CMD ["npm", "start"]
