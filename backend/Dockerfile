# Multi-stage Dockerfile for Backend Production (Debian-based glibc with OpenSSL 3.0)
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL and CA certificates for Prisma engines and SSL connections
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --no-audit
RUN npx prisma generate

COPY . .
RUN npm run build

# Production Runner
FROM node:20-slim AS runner

WORKDIR /app

# Ensure OpenSSL runtime libraries are installed in the production runner
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --only=production --no-audit

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 5000

CMD ["npm", "start"]
