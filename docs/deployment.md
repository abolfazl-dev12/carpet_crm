# Persian Carpet CRM - Deployment & DevOps Guide (راهنمای استقرار و استقرار سرور)

## 1. Environment Configuration (`.env`)

```env
# Node Environment
NODE_ENV=production
PORT=3000

# Application Secret (Generate a strong 32+ character random string in production)
JWT_SECRET=<your-secure-random-32-char-jwt-secret>

# Database Connection
# For Local zero-config SQLite:
DATABASE_URL="file:./dev.db"

# For Production PostgreSQL:
# DATABASE_URL="postgresql://user:password@localhost:5432/carpet_crm?schema=public"

# App Public URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 2. Production Build & Execution Commands

```bash
# 1. Install dependencies
npm.cmd install --legacy-peer-deps

# 2. Generate Prisma Client & Run Database Migration
npx.cmd prisma generate
npx.cmd prisma db push

# 3. Seed Realistic Iranian Carpet Sales Data
npx.cmd prisma db seed

# 4. Build Next.js Production App
npm.cmd run build

# 5. Start Production Server
npm.cmd start
```

---

## 3. Docker Deployment (Optional Dockerfile)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
```
