FROM node:22-alpine

# Install build dependencies for sqlite3 native module + Postfix for SMTP
RUN apk add --no-cache python3 make g++ postfix

# Configure Postfix as send-only (null client)
RUN postconf -e "myhostname=imgkit.io" && \
    postconf -e "mydestination=" && \
    postconf -e "mynetworks=127.0.0.0/8" && \
    postconf -e "inet_interfaces=loopback-only" && \
    postconf -e "relayhost=" && \
    postconf -e "smtp_tls_security_level=may" && \
    postconf -e "smtp_use_tls=yes" && \
    postconf -e "smtp_tls_CAfile=/etc/ssl/certs/ca-certificates.crt" && \
    mkdir -p /var/spool/postfix && \
    chown -R postfix:postfix /var/spool/postfix

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY package.json ./
COPY package-lock.json ./
RUN npm install --omit=dev --prefer-offline --no-audit --no-fund

COPY server.js ./
COPY app.js ./
COPY src ./src
COPY frontend ./frontend

EXPOSE 3000

# Start Postfix then Node.js app
CMD sh -c "postfix start && npm start"
