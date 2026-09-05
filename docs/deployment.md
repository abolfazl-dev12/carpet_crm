# Persian Carpet CRM - Deployment & DevOps Guide (راهنمای استقرار و استقرار سرور)

## 1. Environment Configuration (`.env`)

```env
# Node Environment
NODE_ENV=production
PORT=3000

# Application Secret (32 random bytes encoded as 43+ base64/base64url characters)
JWT_SECRET=<generate-and-store-in-your-secret-manager>

# Keep false for direct development. Enable only behind a controlled proxy
# that strips and overwrites the selected header.
TRUST_PROXY=false
TRUST_PROXY_HEADER=x-forwarded-for

# Local development only:
DATABASE_URL="file:./dev.db"

# Production must use PostgreSQL instead:
# DATABASE_URL="postgresql://app_user:<password>@db.example.internal:5432/carpet_crm?schema=public&sslmode=require"

# One-time migration source only; file:../dev.db points to prisma/dev.db.
# Unset during normal runtime:
SQLITE_DATABASE_URL=

# App Public URL
NEXT_PUBLIC_APP_URL="https://crm.example.com"
```

---

## 2. Production Build & Execution Commands

```bash
# 1. Install dependencies
npm.cmd install --legacy-peer-deps

# 2. Validate and apply the reviewed PostgreSQL migration history
npm.cmd run prisma:validate:postgresql
npm.cmd run prisma:migrate:production

# 3. Build Next.js and the PostgreSQL Prisma Client
npm.cmd run build

# 4. Start Production Server
npm.cmd start
```

`prisma db push` در scriptهای پروژه وجود ندارد و بخشی از استقرار production نیست. seed فعلی داده‌ها را پاک می‌کند و فقط برای محیط توسعه/تست ایزوله مجاز است. قبل از `prisma:migrate:production` از دیتابیس نسخه پشتیبان قابل‌بازیابی تهیه کنید.

برای تولید secret می‌توان خارج از repository از `openssl rand -base64 48` استفاده کرد و خروجی را مستقیماً در secret manager زیرساخت قرار داد. secret را در فایل‌های Git یا لاگ‌ها کپی نکنید.

`next.config.ts` پیش از آغاز production build/start و `src/instrumentation.ts` هنگام initialization هر instance سرور Next.js تنظیمات را بررسی می‌کنند. secret ناموجود، پیش‌فرض، کوتاه یا واضحاً قابل‌حدس باعث fail-fast شدن build/server می‌شود.

اتصال عمومی باید فقط از طریق HTTPS باشد. بدون proxy مورداعتماد، `TRUST_PROXY=false` باقی بماند. پشت proxy تحت کنترل، `TRUST_PROXY=true` تنظیم شود و proxy باید header انتخاب‌شده را حذف و بازنویسی کند. در استقرار چند-instance همه instanceها برای rate limit باید به یک دیتابیس مشترک وصل باشند؛ SQLite محلی مجزا برای این معماری مناسب نیست.

دیتابیس SQLite توسعه و تاریخچهٔ PostgreSQL دو مسیر جدا هستند. برای انتقال production، دستورالعمل کامل [postgresql-migration.md](./postgresql-migration.md) را اجرا و بازبینی کنید. migration جدید JSON روی فایل SQLite موجود در این فاز اجرا نشده است.

---

## 3. Docker Deployment (Optional Dockerfile)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run prisma:generate:postgresql
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
