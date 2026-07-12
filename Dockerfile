FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY src ./src
COPY frontend ./frontend

EXPOSE 3000

CMD ["npm", "start"]
