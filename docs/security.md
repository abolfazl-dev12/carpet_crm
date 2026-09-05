# Persian Carpet CRM - Security Architecture & Hardening (مستند امنیت و سیاست‌های حفاظتی)

## 1. Authentication & Session Security
- **Password Hashing**: `bcryptjs` با cost factor برابر ۱۲ استفاده می‌شود. رمز خام هرگز نباید ذخیره یا لاگ شود و حداقل طول رمزهای جدید ۱۲ نویسه است.
- **Session Tokens**: توکن JWT امضاشده (JWS، نه رمزگذاری‌شده) فقط با `HS256`، issuer و audience ثابت و عمر ۱۲ ساعت صادر می‌شود. payload فقط شناسه کاربر و نسخه نشست را دارد و اطلاعات هویتی یا نقش در آن قرار نمی‌گیرد. کوکی نشست همیشه `HttpOnly` و `SameSite=Lax` است و در تولید `Secure` می‌شود.
- **Session Invalidation**: claim مربوط به `sessionVersion` در هر درخواست با رکورد فعال کاربر در دیتابیس تطبیق داده می‌شود. تغییر رمز، نقش، وضعیت فعال بودن و خروج، نسخه را افزایش داده و همه نشست‌های قبلی آن کاربر را باطل می‌کند.
- **JWT Secret**: در تولید `JWT_SECRET` باید یکتا و واقعاً تصادفی باشد؛ مقدار پیشنهادی ۳۲ بایت تصادفی با نمایش base64/base64url حداقل ۴۳ نویسه (یا hex حداقل ۶۴ نویسه) است. مقادیر پیش‌فرض، کوتاه، کم‌تنوع، تکراری و الگوهای واضح رد می‌شوند. `next.config.ts` پیش از build/start تولید و `src/instrumentation.ts` هنگام initialization هر instance آن را اعتبارسنجی می‌کنند؛ مقدار secret هرگز لاگ نمی‌شود.

---

## 2. Server-Side Role-Based Access Control (RBAC)
Frontend UI checks are purely ergonomic. Every API route and Server Action enforces server-side role validation:

ماتریس دقیق endpointها و قواعد مالکیت در [authorization-matrix.md](./authorization-matrix.md) نگهداری می‌شود.

| Permission / Action | ADMIN | SALES_MANAGER | SALES_REP | VIEWER |
|---|---|---|---|---|
| View Dashboard & Reports | Full | Full Team | Own Metrics | Read-Only Summary |
| Manage Leads & Customers | Full | Full Team | Assigned Only | Read-Only |
| Drag & Drop Deals (Kanban) | Full | Full Team | Assigned Only | Read-Only |
| Manage Products & Prices | Full | Full | Read-Only | Read-Only |
| Modify Inventory & Stock | Full | Full | Request Only | Read-Only |
| Create Orders & Invoices | Full | Full | Allowed | Disallowed |
| View Financial Ledgers | Full | Full | Restricted | Restricted |
| User & Team Management | Full | Read-Only | None | None |
| View Audit Logs | Full | Restricted | None | None |

---

## 3. Input Validation & Defense in Depth
- **Schema Validation**: All inbound payloads are validated through strict `zod` schemas on both client and server.
- **SQL Injection Prevention**: 100% of database interactions run through parameterized Prisma queries. Zero raw string concatenation in SQL.
- **XSS Sanitization**: React automatically escapes untrusted content. Rich inputs are stripped and validated.
- **Rate Limiting Architecture**: مسیر `/api/auth/login` همیشه bucket پایدار دیتابیسی برای شناسه ورود دارد و، فقط در صورت فعال‌بودن proxy مورداعتماد، bucket جداگانه IP نیز اعمال می‌کند. فقط hash کلیدها ذخیره می‌شود و پاسخ پس از عبور از حد مجاز `429` و `Retry-After` است.
- **Audit Logging**: Every sensitive mutation (user creation, price change, inventory adjustment, lead assignment, stage change) logs the actor, IP, timestamp, and entity payload.

## 4. Reverse Proxy Trust Model

مقدار پیش‌فرض `TRUST_PROXY=false` است؛ در این حالت برنامه همه headerهای اعلام IP را نادیده می‌گیرد و محدودیت مستقل شناسه ورود همچنان فعال است. فقط وقتی برنامه مستقیماً پشت reverse proxy یا load balancer تحت کنترل اجرا می‌شود، `TRUST_PROXY=true` و دقیقاً یکی از `x-forwarded-for`، `x-real-ip` یا `cf-connecting-ip` در `TRUST_PROXY_HEADER` تنظیم شود. proxy باید header انتخاب‌شده ورودی کاربر را حذف و با IP تأییدشده خودش بازنویسی کند. مقدار malformed پذیرفته نمی‌شود.

ذخیره rate limit در دیتابیس Prisma انجام می‌شود. در استقرار چند-instance، همه instanceها باید به یک دیتابیس مشترک دسترسی داشته باشند؛ فایل‌های SQLite محلی جداگانه محدودیت سراسری ایجاد نمی‌کنند. مهاجرت به Redis در این فاز انجام نشده است.
