# امنیت مخزن و نگهداری داده‌های حساس

این مخزن فقط باید شامل کد، migrationها، مستندات و داده‌های آزمایشی کاملاً ساختگی باشد. وجود یک فایل در `.gitignore` به‌تنهایی فایل‌هایی را که قبلاً commit شده‌اند از تاریخچه حذف نمی‌کند.

## مواردی که هرگز نباید commit شوند

- فایل‌های SQLite و ضمایم آن‌ها: `*.db`، `*.db.bak`، `*.sqlite*`، فایل‌های journal، WAL و SHM
- فایل‌های محیط محلی مانند `.env`، `.env.local` و گونه‌های production/staging آن‌ها
- JWT secret، API key، access/refresh token، private key، service-account و credentialهای package registry
- exportها، uploadها، backupها، logها یا spreadsheetهایی که اطلاعات مشتری، شماره تماس، سفارش یا پرداخت دارند
- خروجی‌های generated مانند `.next`، `coverage`، `build` و `node_modules`
- رمز واقعی یا رمز مشترک برای حساب‌های seed، demo و production

فقط `.env.example` با placeholderهای خالی یا غیرمحرمانه مجاز به commit است.

## Seed و تست

`prisma/seed.ts` مخرب است: داده‌های کسب‌وکار دیتابیس هدف را حذف و fixtureهای ساختگی را جایگزین می‌کند. رمز `SEED_DEFAULT_PASSWORD` مجوز حذف داده نیست. seed تولید مجاز نیست و override قدیمی `ALLOW_PRODUCTION_SEED` دیگر اثری ندارد.

SQLite محلی فقط با `DATABASE_URL=file:...` در development/test مجاز است؛ پیش از حذف، سازگاری اتصال SQLite بررسی می‌شود. این مسیر همچنان مخرب است و نباید روی دیتابیس کاری بدون backup و تأیید اجرا شود.

برای PostgreSQL، حتی اجرای مستقیم seed نیازمند `ALLOW_DESTRUCTIVE_POSTGRES_SEED=I_ACCEPT_DISPOSABLE_DATA_LOSS` **علاوه بر** تمام مجوزهای تست PostgreSQL است: `NODE_ENV=test`، opt-in عمومی `ALLOW_DESTRUCTIVE_POSTGRES_TESTS`، اتصال صریح `POSTGRES_TEST_DATABASE_URL`، توکن و marker مستقلِ منقضی‌نشده. اتصال معمول `DATABASE_URL` هرگز fallback این مسیر نیست. هویت واقعی، marker و توکن داخل همان transaction حذف بررسی می‌شوند و قفل marker تا پایان cleanup باقی می‌ماند. production، staging، shared و مقصد مبهم رد می‌شوند. runner نیز مجوز seed را پیش از reset مطالبه می‌کند و جایگزین محافظ خود seed نیست.

برای تست SQLite از `npm run test:integration` استفاده کنید. runner یک SQLite یکتا و git-ignored می‌سازد و پس از تست آن را پاک می‌کند؛ اجرای مستقیم seed یا `scripts/verify-all.ts` روی دیتابیس کاری مجاز نیست. runnerهای PostgreSQL مخرب‌اند و فقط با اتصال اختصاصی تست، opt-in صریح و marker مستقلِ معتبر اجرا می‌شوند؛ setup و cleanup هر دو هویت واقعی دیتابیس را بررسی می‌کنند. روش provision اپراتوری marker در [راهنمای PostgreSQL](./postgresql-migration.md#محافظ-fail-closed-تستهای-مخرب-postgresql) آمده است. توکن marker نیز secret است و نباید commit یا چاپ شود.

## کنترل پیش از commit

```bash
git status --short --ignored
git diff --cached --check
git ls-files -- '*.db' '*.db.bak' '*.sqlite*' '.env' '.env.*' '*.pem' '*.key'
```

خروجی فرمان آخر باید فقط شامل فایل‌های نمونهٔ عمداً مجاز، مانند `.env.example`، باشد. مقدار secretها را در issue، log، screenshot یا پیام تیمی قرار ندهید.

## اگر داده یا secret commit شد

1. ابتدا credential یا token را revoke/rotate کنید؛ حذف commit جایگزین rotation نیست.
2. pushها را موقتاً متوقف و با همهٔ همکاران هماهنگ کنید.
3. از repository یک mirror backup کنترل‌شده تهیه کنید.
4. با `git-filter-repo` مسیر حساس را در یک clone آینه‌ای حذف و نتیجه را اسکن کنید.
5. فقط پس از تأیید مالک مخزن، همهٔ refها را force-push کنید.
6. همهٔ همکاران باید clone تازه بگیرند؛ cloneها، forkها، cacheها و artifactهای قدیمی نیز باید بررسی شوند.

بازنویسی تاریخچه اقدامی مخرب و هماهنگ‌شونده است و نباید به‌صورت خودکار انجام شود.

### رویهٔ دقیق برای حذف `prisma/dev.db.bak` از تاریخچه

این رویه را فقط پس از rotation credentialهای در معرض خطر، توقف موقت pushها و تأیید صریح مالک مخزن اجرا کنید. از clone کاری فعلی استفاده نکنید. `git-filter-repo` باید حداقل نسخهٔ ۲.۴۷ باشد.

```powershell
git clone https://github.com/abolfazl-dev12/carpet_crm.git carpet_crm-history-cleanup
Set-Location carpet_crm-history-cleanup

git filter-repo --sensitive-data-removal --invert-paths --path prisma/dev.db.bak

git log --all -- prisma/dev.db.bak
git rev-list --objects --all | Select-String 'prisma/dev\.db\.bak'
git fsck --full

git remote -v
# فقط اگر filter-repo ریموت origin را حذف کرده بود:
git remote add origin https://github.com/abolfazl-dev12/carpet_crm.git

# فقط پس از بازبینی نتیجه و تأیید نهایی مالک مخزن:
git push --force --mirror origin
```

دو فرمان بررسی مسیر باید خروجی خالی داشته باشند. گزارش `changed-refs` در `.git/filter-repo/changed-refs` و «First Changed Commit(s)» را نگه دارید. پس از push، همکاران باید clone تازه بگیرند یا شاخه‌های قدیمی را rebase کنند؛ merge کردن تاریخچهٔ قدیمی می‌تواند فایل را برگرداند. forkها، PR refها و cacheهای GitHub نیز باید بررسی شوند و اگر داده واقعاً حساس بوده است، برای پاک‌سازی cached views با GitHub Support تماس بگیرید. مرجع: [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
