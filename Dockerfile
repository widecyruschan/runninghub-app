FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=./data/app.sqlite
ENV RUNNINGHUB_API_KEY=ae079bdc75d6461ba2905fbebd47ef3a
ENV RUNNINGHUB_API_BASE_URL=https://www.runninghub.cn/openapi/v2
ENV RUNNINGHUB_TASK_API_BASE_URL=https://www.runninghub.cn/task/openapi
ENV KIE_API_KEY=6fa9d9d07fff547ffa2361756df5dbe9
ENV KIE_API_BASE_URL=https://api.kie.ai
ENV KIE_FILE_API_BASE_URL=https://kieai.redpandaai.co
ENV PAYPAL_MODE=sandbox
ENV PAYPAL_CLIENT_ID=BAALo29H-ZLTt6zx7irvWVACa8ILRQEpDT1XrjxWorQgOdWbAcbWLK215KEesECl7jE9dT0nNoor4VzAdM
ENV PAYPAL_CLIENT_SECRET=EO4wZGK_Ti9lVmeK58djzETLP70P_qYI17_yxKQNiUNSwWxhrsg03qB6-VW8L1AJDnEaUg51YEWGU1my
ENV PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com
ENV PAYPAL_WEBHOOK_ID=64K6657558033082R
ENV PUBLIC_APP_BASE_URL=https://imgkit.io
ENV PUBLIC_API_BASE_URL=https://api.imgkit.io
ENV API_CORS_ALLOWED_ORIGINS=https://imgkit.io,https://www.imgkit.io,https://api.imgkit.io
ENV SESSION_COOKIE_DOMAIN=.imgkit.io
ENV TRANSLATION_PROVIDER=deepl
ENV DEEPL_API_KEY=bf059940-55ad-440c-93eb-63a34aaf9062:fx
ENV DEEPL_API_BASE_URL=https://api-free.deepl.com/v2

COPY package.json ./
COPY package-lock.json ./
COPY .env ./
RUN npm ci --omit=dev

COPY server.js ./
COPY app.js ./
COPY src ./src
COPY frontend ./frontend

EXPOSE 3000

CMD ["npm", "start"]
