# راهنمای مهاجرت ایمن SQLite به PostgreSQL

## وضعیت و معماری مقصد

- `prisma/schema.prisma` و `prisma/migrations/` مسیر سازگاری SQLite برای توسعه و تست ایزوله هستند.
- `prisma/postgresql/schema.prisma` و `prisma/postgresql/migrations/` تنها مسیر production هستند.
- تاریخچه‌های migration دو provider عمداً جدا هستند؛ SQL مخصوص SQLite نباید روی PostgreSQL اجرا شود.
- `prisma/sqlite-source/schema.prisma` فقط مدل قدیمیِ string-encoded JSON را برای ابزار انتقال داده توصیف می‌کند و application runtime از آن استفاده نمی‌کند.
- `npm run build` کلاینت PostgreSQL می‌سازد. `npm run dev` و تست یکپارچه کلاینت SQLite را به‌صورت صریح می‌سازند.
- در production، `DATABASE_URL` هنگام بارگذاری تنظیمات Next و دوباره هنگام initialize شدن server بررسی می‌شود؛ مقدار خالی، malformed، SQLite یا provider غیر PostgreSQL باعث fail-fast می‌شود. command عادی هیچ URL ساختگی تزریق نمی‌کند.
- `npm run build:offline-validation` و `prisma:*:postgresql:offline` فقط کنترل محلی schema/compile و بدون اتصال‌اند. این مسیرها صریحاً offline نام‌گذاری شده، در CI/production غیرفعال‌اند و artifact قابل استقرار یا جایگزین بررسی staging نیستند.

دیتابیس محلی موجود در این فاز تغییر داده نشده است. migration جدید SQLite برای تبدیل ستون‌های JSON شامل بازسازی کنترل‌شدهٔ چهار جدول است و تا اجرای صریح `npm run prisma:migrate:sqlite` روی آن دیتابیس اعمال نمی‌شود. پیش از اجرای این دستور روی دیتابیس قدیمی، backup قابل‌بازیابی الزامی است.

## فرض‌های SQLite که برطرف شدند

- تاریخچهٔ قبلی شامل `DATETIME`، `REAL`، کلید اصلی inline و foreign keyهای مخصوص SQLite بود؛ PostgreSQL اکنون migration اولیهٔ مستقل با enumهای native، `TIMESTAMP(3)`، `DOUBLE PRECISION` و constraintهای خودش دارد.
- JSON قبلاً در `TEXT` نگهداری و در چند مسیر application با `JSON.parse`/`JSON.stringify` مدیریت می‌شد. ستون‌های مقصد `JSONB` هستند و Prisma مقدار native JSON را می‌خواند/می‌نویسد.
- فایل محلی SQLite برای deployment چند-instance، connection pooling و rate-limit مشترک مناسب نیست. production باید از یک PostgreSQL مشترک استفاده کند.
- Prisma `Int` در PostgreSQL به `INTEGER` تبدیل می‌شود. مبالغ فعلی عمداً برای حفظ رفتار به تومان و `Int` باقی مانده‌اند و محدودیت موجود `2,147,483,647` همچنان برقرار است؛ تغییر به `BigInt` یک فاز مالی جداگانه و نیازمند تغییر contractهای JSON است.
- جست‌وجوی `contains` در PostgreSQL به collation دیتابیس وابسته است. collation و locale باید پیش از provision نهایی با دادهٔ فارسی در staging آزموده شود.

## ستون‌های JSON تبدیل‌شده

| مدل | ستون | SQLite قدیمی | PostgreSQL |
| --- | --- | --- | --- |
| `CarpetNeedProfile` | `preferredSizes` | JSON string در `TEXT` | `JSONB` آرایهٔ string |
| `CarpetNeedProfile` | `preferredColors` | JSON string در `TEXT` | `JSONB` آرایهٔ string |
| `Product` | `images` | JSON string در `TEXT` | `JSONB` آرایهٔ string |
| `AutomationRule` | `conditions` | JSON string در `TEXT` | `JSONB` object |
| `AutomationRule` | `actions` | JSON string در `TEXT` | `JSONB` object |
| `AuditLog` | `details` | JSON string nullable در `TEXT` | `JSONB` nullable |

خوانندهٔ transitional در `src/lib/json-fields.ts` رشتهٔ قدیمی و مقدار native را می‌پذیرد؛ بنابراین rollout کد و migration SQLite به یک لحظه وابسته نیستند. دادهٔ فعلی به‌صورت read-only بررسی شده و JSON نامعتبر در فیلدهای بالا پیدا نشد.

## پیکربندی محیط‌ها

### توسعه با SQLite

```env
NODE_ENV=development
DATABASE_URL="file:./dev.db"
```

برای دیتابیس تازه:

```bash
npm install --legacy-peer-deps
npm run prisma:migrate:sqlite
npm run dev
```

برای دیتابیس قدیمی ابتدا backup بگیرید، `npm run db:migrate:data:check` را با `SQLITE_DATABASE_URL` اجرا کنید و سپس migration SQLite را در maintenance window اعمال کنید. seed اختیاری و مخرب است؛ `npm run prisma:seed:sqlite` فقط روی دیتابیس disposable مجاز است.

### production با PostgreSQL

```env
NODE_ENV=production
DATABASE_URL="postgresql://app_user:<password>@db.example.internal:5432/carpet_crm?schema=public&sslmode=require"
```

کاربر دیتابیس باید least-privilege باشد، ارتباط TLS داشته باشد و secret در secret manager قرار گیرد. ترتیب استقرار:

```bash
npm ci
npm run prisma:validate:postgresql
npm run prisma:migrate:production
npm run build
npm start
```

`prisma:migrate:production` فقط `prisma migrate deploy` را با history PostgreSQL اجرا می‌کند. اگر `DATABASE_URL` به Prisma Postgres pooler (`pooled.db.prisma.io`) اشاره کند، `DIRECT_URL` مستقیم برای migration الزامی است و script روی URL pooled fail-fast می‌شود. application runtime همچنان از `DATABASE_URL` pooled استفاده می‌کند. `prisma db push` در scriptهای پروژه وجود ندارد و نباید در production استفاده شود.

## برنامهٔ انتقال دادهٔ موجود

این عملیات باید ابتدا روی staging تمرین و زمان‌سنجی شود.

1. برنامه را در maintenance mode قرار دهید تا SQLite پس از snapshot هیچ write تازه‌ای نگیرد.
2. از فایل SQLite و PostgreSQL مقصد backup قابل‌بازیابی بگیرید و checksum فایل SQLite را ثبت کنید. backup را خارج از repository نگه دارید.
3. یک database/schema خالی PostgreSQL ایجاد کنید و migrationهای production را اعمال کنید:

   ```bash
   npm run prisma:migrate:production
   ```

4. متغیرها را فقط در shell امن maintenance تنظیم کنید؛ آن‌ها را commit یا چاپ نکنید:

   ```env
   SQLITE_DATABASE_URL="file:../dev.db"
   DATABASE_URL="postgresql://..."
   ```

5. preflight فقط‌خواندنی را اجرا کنید:

   ```bash
   npm run db:migrate:data:check
   ```

   این مرحله وجود فایل source، شکل JSON و خواندن همهٔ مدل‌ها را بررسی می‌کند و به PostgreSQL متصل نمی‌شود.

6. پس از بازبینی شمار رکوردها و تأیید صریح اپراتور، انتقال را اجرا کنید:

   ```bash
   npm run db:migrate:data:apply
   ```

   ابزار در صورت غیرخالی بودن هر جدول مقصد متوقف می‌شود، شناسه‌ها، timestampها، password hashها و `sessionVersion` را حفظ می‌کند، JSON stringها را به native JSON تبدیل می‌کند و همهٔ insertها و verification را در یک transaction PostgreSQL انجام می‌دهد. اختلاف کلیدهای اصلی یا مجموع‌های مالی/انبار باعث rollback همان transaction می‌شود. ابزار هیچ write یا delete روی SQLite انجام نمی‌دهد. در Prisma Postgres، apply فقط با `DIRECT_URL` انجام می‌شود و استفاده از URL pooled رد می‌شود.

7. پس از انتقال، `prisma migrate status` با schema PostgreSQL و smoke test کنترل‌شدهٔ فارسی ورود، داشبورد، سفارش، پرداخت و انبار را اجرا کنید. runnerهای integration را هرگز روی مقصد دارای دادهٔ منتقل‌شده اجرا نکنید؛ آن‌ها فقط برای دیتابیس مستقل disposable هستند. مجموع رکوردها و جمع فیلدهای مالی را با گزارش preflight تطبیق دهید.
8. فقط پس از پذیرش staging و production، ترافیک را با تغییر `DATABASE_URL` به PostgreSQL منتقل کنید. SQLite را تا پایان دورهٔ rollback به‌صورت read-only و خارج از repository نگه دارید.

## برنامهٔ rollback

- پیش از cutover: transaction ناموفق خودکار rollback می‌شود؛ مقصد خالی باقی می‌ماند و SQLite منبع بدون تغییر است.
- artifact ساخته‌شده با `prisma/postgresql/schema.prisma` فقط Prisma Client مربوط به PostgreSQL را دارد؛ تغییر `DATABASE_URL` آن artifact به `file:...` یک rollback معتبر نیست و برنامه را به SQLite متصل نمی‌کند.
- برای rollback پس از cutover ابتدا maintenance mode را فعال کنید، ورود ترافیک و jobها را متوقف کنید و مطمئن شوید هیچ write تازه‌ای روی PostgreSQL انجام نمی‌شود. PostgreSQL و log زمان cutover باید بدون حذف یا reset نگهداری شوند.
- مقصد اجرای rollback باید یکی از این دو باشد: artifact شناخته‌شده و قبلی که با schema/Prisma Client SQLite ساخته شده است، یا build تازه و بازبینی‌شده از همان نسخهٔ کد با `prisma/schema.prisma` و `npm run prisma:generate:sqlite`. artifact PostgreSQL را reuse نکنید.
- SQLite صحیح را از snapshot تأییدشدهٔ لحظهٔ cutover بازیابی و checksum، schema و امکان restore آن را پیش از اتصال برنامه کنترل کنید. فایل واقعی فقط در maintenance window و خارج از repository جایگزین می‌شود.
- اگر بعد از cutover حتی یک write در PostgreSQL ایجاد شده باشد، قبل از بازگشت باید آن writeها export، طبقه‌بندی و با SQLite reconcile شوند. سفارش، پرداخت، موجودی، sessionVersion و audit log نیازمند تطبیق و تأیید مستقل‌اند؛ rollback کور باعث از دست رفتن داده یا ناسازگاری مالی/انبار می‌شود.
- پیش از بازکردن ترافیک، migration status نسخهٔ SQLite، شمار رکوردها، مجموع‌های مالی/انبار، روابط و smoke test ورود/سفارش/پرداخت را روی محیط rollback بررسی کنید. فقط پس از پذیرش نتایج maintenance mode را بردارید.
- حذف schema یا restore PostgreSQL عملیاتی مخرب است. runnerهای تست این مخزن `public` را در دیتابیس مستقل disposable پاک می‌کنند و محافظ چندمرحله‌ای زیر را دارند؛ برای rollback یا دیتابیس production/staging/shared مجاز نیستند.
- migrationهای version-control شده هرگز ویرایش یا حذف نمی‌شوند؛ rollback application با نسخهٔ قبلی انجام می‌شود و rollback schema در یک migration forward جداگانه و بازبینی‌شده صورت می‌گیرد.

## نکات عملیاتی باقی‌مانده برای rollout واقعی

- یک PostgreSQL staging واقعی برای آزمون collation فارسی، latency و locking لازم است.
- تا انتخاب provider، schema از URL استاندارد PostgreSQL استفاده می‌کند و تنظیم vendor-specific اختراع نشده است. برای serverless، چند instance یا تعداد connection بالا باید pooler سازگار با Prisma انتخاب و در staging آزموده شود؛ اتصال migration باید مستقیم و جدا از transaction-pooler باقی بماند.
- آزمون staging روی Prisma Postgres نشان داد runtime pooled با pool محدود پایدار است، ولی اجرای migration روی همان pooler می‌تواند روی advisory lock متوقف شود؛ بنابراین `DIRECT_URL` برای migrate و انتقال داده الزام عملی است.
- backup، restore drill، monitoring فضای دیسک، slow query و connection saturation باید پیش از cutover فعال باشند.

## محافظ fail-closed تست‌های مخرب PostgreSQL

این فرمان‌ها داده‌های `public` را در setup و cleanup پاک می‌کنند: `test:integration:postgresql`، `test:behavior:postgresql`، `test:schema:postgresql` و `test:data-migration:postgresql`. آن‌ها را سریالی و فقط روی دیتابیس مستقل دورریختنی اجرا کنید، نه staging مشترک یا دیتابیس دارای دادهٔ منتقل‌شده.

وجود `DATABASE_URL` یا `DIRECT_URL` برنامه هیچ اجازه‌ای برای تست ایجاد نمی‌کند. همهٔ شروط زیر الزامی‌اند:

- `NODE_ENV=test`
- `ALLOW_DESTRUCTIVE_POSTGRES_TESTS=I_ACCEPT_DISPOSABLE_DATA_LOSS`
- برای seed مستقیم و `test:integration:postgresql`، همچنین `ALLOW_DESTRUCTIVE_POSTGRES_SEED=I_ACCEPT_DISPOSABLE_DATA_LOSS` الزامی است. runner این opt-in را خودکار ایجاد نمی‌کند و پیش از reset آن را بررسی می‌کند.
- `POSTGRES_TEST_DATABASE_URL`: اتصال اختصاصی دیتابیس تست، فقط schema عمومی؛ هیچ fallback به اتصال برنامه وجود ندارد.
- `POSTGRES_TEST_TOKEN`: حداقل ۳۲ بایت تصادفی با نمایش base64url (حداقل ۴۳ نویسه)، نگهداری فقط در محیط امن/secret manager.
- برای تست migration و transfer: `POSTGRES_TEST_DIRECT_URL` مستقیم به همان دیتابیس. این اتصال نیز مستقل بررسی می‌شود و از نام host یا `DIRECT_URL` برنامه ساخته نمی‌شود.
- متغیرهای محیط استقرار مانند `APP_ENV`، `DEPLOYMENT_ENV`، `ENVIRONMENT` و `VERCEL_ENV` نباید production/staging/shared یا مقدار ناشناخته داشته باشند.

اپراتور باید **جدا از runner** موقتی و غیرمشترک بودن دیتابیس را تأیید و marker زیر را فقط در همان دیتابیس provision کند. runner هرگز marker را ایجاد یا تمدید نمی‌کند. `marker_sha256` پارامتر psql است و باید SHA-256 توکن تصادفیِ نگهداری‌شده در محیط امن باشد؛ مقدار واقعی توکن/هش یا URI را در Git یا log قرار ندهید.

```sql
BEGIN;
CREATE SCHEMA carpet_crm_test_guard;
CREATE TABLE carpet_crm_test_guard.disposable_identity (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  purpose text NOT NULL,
  token_hash text NOT NULL,
  database_name text NOT NULL,
  database_oid text NOT NULL,
  role_name text NOT NULL,
  expires_at timestamptz NOT NULL
);
INSERT INTO carpet_crm_test_guard.disposable_identity
  (purpose, token_hash, database_name, database_oid, role_name, expires_at)
SELECT 'carpet-crm-disposable-test', :'marker_sha256', current_database(),
  oid::text, current_user, now() + interval '24 hours'
FROM pg_database WHERE datname = current_database();
COMMIT;
```

guard پیش از هر DROP، روی همان connection و داخل همان transaction، نام/OID واقعی دیتابیس، نقش واقعی اتصال، نبود replica، دقیقاً یک marker با purpose صحیح، انقضا و تطابق هش توکن را بررسی می‌کند. marker با `FOR SHARE` تا پایان transaction قفل می‌ماند. خطای metadata، نبود marker یا هر ابهام، پیش از SQL مخرب متوقف می‌شود. cleanup دوباره همین guard را اجرا می‌کند؛ مجوز setup ذخیره و reuse نمی‌شود. marker بیرون `public` باقی می‌ماند و در migrationهای برنامه قرار نمی‌گیرد. تغییر کاربری دیتابیس مستلزم حذف/ابطال marker توسط اپراتور است.

`npm run test:postgresql-safety` بدون اتصال دیتابیس، سناریوهای رد و ترتیب guard پیش از SQL مخرب را بررسی می‌کند. تست‌های واقعی هم‌زمانی در `test:behavior:postgresql` با قفل دیتابیس و مشاهدهٔ دو درخواست منتظر اجرا می‌شوند؛ صرف `Promise.all` مدرک هم‌زمانی نیست. triggerهای ایجاد خطای عمدی فقط در این دیتابیس disposable ساخته و در finally حذف می‌شوند.

### اجرای مستقیم seed

`prisma/seed.ts` خودش اتصال اختصاصی `POSTGRES_TEST_DATABASE_URL` را به Prisma می‌دهد؛ `DATABASE_URL` برنامه مجوز یا fallback نیست. تمام ۱۶ حذف کسب‌وکار در یک transaction اجرا می‌شوند و همان guard مستقل، پیش از اولین `auditLog.deleteMany`، marker را بررسی و قفل می‌کند. token، هویت یا انقضای نامعتبر حتی با رمز seed معتبر مانع حذف می‌شود. `ALLOW_PRODUCTION_SEED` دیگر مجوزی ایجاد نمی‌کند. پس از cleanup، ساخت fixtureها آغاز می‌شود؛ کل فرایند ساخت fixture یک transaction واحد نیست و شکست آن فقط باید روی دیتابیس دورریختنی رخ دهد.

`npm run test:seed-safety` خود مسیر seed و اتصال آن به runner را در محیط شبیه‌سازی‌شده بررسی می‌کند؛ guard واقعی است و فقط ارتباط دیتابیس جایگزین می‌شود. SQLite محلی مسیر جدا دارد: URL از نوع `file:`، محیط development/test و بررسی provider پیش از حذف. برای آن از workflow محلی مستندشده استفاده کنید، نه تنظیمات اتصال PostgreSQL.
