# ---- deps & build ----
FROM node:20-alpine AS builder
WORKDIR /app
# better-sqlite3 is a native module; alpine needs build tools to compile it
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# .env must be present at build time so NEXT_PUBLIC_* values get baked in
RUN npm run build

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
# SQLite database lives here — mount a volume to persist it
VOLUME /app/data
EXPOSE 3000
CMD ["npm", "start"]
