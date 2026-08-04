FROM node:22-alpine

WORKDIR /app

# Install build dependencies required for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ libc6-compat

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/data/app.sqlite
ENV RUNNINGHUB_API_KEY=ae079bdc75d6461ba2905fbebd47ef3a
ENV RUNNINGHUB_API_BASE_URL=https://www.runninghub.cn/openapi/v2
ENV RUNNINGHUB_TASK_API_BASE_URL=https://www.runninghub.cn/task/openapi
ENV KIE_API_KEY=6fa9d9d07fff547ffa2361756df5dbe9
ENV KIE_API_BASE_URL=https://api.kie.ai
ENV KIE_FILE_API_BASE_URL=https://kieai.redpandaai.co
ENV PAYPAL_MODE=live
ENV PAYPAL_CLIENT_ID=BAAWrJCI0ULGzPDfYne7fRLiX6r9T5-dCcfDnL2apHyg0GhawS-6nk23wTqhmlGVnywczj-opGvqpbrOoM
ENV PAYPAL_CLIENT_SECRET=ENmGS7ucT62kGzIOdBgXfx-0c55cTeqoi9lhXzwSXDe3Vz_R5PPh-eoD4THDvyuyBThrs4YVEZ6sSu3I
ENV PAYPAL_API_BASE_URL=https://api-m.paypal.com
ENV PAYPAL_WEBHOOK_ID=64K6657558033082R
ENV CREEM_API_KEY=creem_4IKBFK2TdVnkHCBXJhqsVh
ENV CREEM_WEBHOOK_SECRET=whsec_3Io7NTpye3JxczQVxME7rL
ENV CREEM_API_BASE_URL=https://api.creem.io/v1
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
