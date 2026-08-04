FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY package.json ./
COPY package-lock.json ./
RUN rm -rf node_modules && npm ci --omit=dev

COPY server.js ./
COPY app.js ./
COPY src ./src
COPY frontend ./frontend

EXPOSE 3000

CMD ["npm", "start"]
