# Safe Prisma Migration Baseline Plan

## وضعیت تأییدشده پیش از reconciliation

- سه migration در repository وجود دارد: migration اولیه، افزودن `ProductVariant.isActive` و سخت‌سازی authentication.
- schema واقعی `prisma/dev.db` از نظر جدول‌ها، ستون‌ها و indexها با migration اولیه هم‌ارز است.
- دیتابیس موجود هنوز `ProductVariant.isActive`، `User.sessionVersion` و جدول `AuthRateLimit` را ندارد.
- جدول `_prisma_migrations` وجود ندارد؛ بنابراین Prisma هر سه migration را pending گزارش می‌کند.
- migrationها روی دیتابیس موقت و ایزوله توسط test runner از ابتدا اعمال می‌شوند. این نتیجه جای baseline دیتابیس واقعی را نمی‌گیرد.

این بررسی با `prisma migrate diff` فقط به‌صورت read-only انجام شده است. هیچ schema، داده یا migration history در `prisma/dev.db` تغییر نکرده است.

## نتیجه اجرای تأییدشده روی دیتابیس توسعه محلی

در ۲۰۲۶-۰۹-۰۳، پس از تهیه backup و تطبیق hash، migration اولیه با `migrate resolve` baseline و دو migration افزایشی با `migrate deploy` اعمال شدند. `migrate status` اکنون دیتابیس توسعه محلی را up-to-date و `migrate diff` بدون اختلاف گزارش می‌کند. شمار رکوردهای تمام جدول‌های کسب‌وکار با backup برابر باقی ماند.

در Phase 5 یک migration جدید SQLite برای تبدیل شش فیلد string-encoded JSON اضافه شد. این migration در repository موجود است اما روی `prisma/dev.db` اجرا نشده؛ بنابراین عبارت up-to-date بالا فقط وضعیت پیش از Phase 5 را توصیف می‌کند. این migration چهار جدول SQLite را با copy/rename بازسازی می‌کند و اجرای آن روی فایل موجود بدون backup و maintenance window مجاز نیست. production از تاریخچهٔ مستقل PostgreSQL در `prisma/postgresql/migrations/` استفاده می‌کند.

این نتیجه فقط درباره `prisma/dev.db` همین workspace است و نباید برای staging یا production تعمیم داده شود.

## برنامه reconciliation بدون حذف داده

این عملیات باید در maintenance window و پس از توقف برنامه انجام شود:

1. از `prisma/dev.db` یک backup خارج از repository بگیرید و بازیابی آن را بررسی کنید.
2. دوباره diff و `prisma migrate status` را اجرا کنید. اگر schema دیگر با وضعیت بالا یکسان نیست، ادامه ندهید.
3. پس از تأیید صریح مالک پروژه، فقط migration اولیه را به‌عنوان قبلاً اعمال‌شده ثبت کنید:

   ```bash
   npx prisma migrate resolve --applied 20260831000000_init
   ```

   این دستور migration اولیه را دوباره اجرا نمی‌کند؛ جدول history مربوط به Prisma را ایجاد/به‌روزرسانی می‌کند. انتظار حذف داده وجود ندارد، ولی backup الزامی است.

4. پس از بازبینی مجدد وضعیت، دو migration افزایشی باقی‌مانده را اعمال کنید:

   ```bash
   npm run prisma:migrate:sqlite
   ```

   SQL فعلی فقط دو ستون دارای default، جدول rate-limit و indexهای مربوط را اضافه می‌کند. حذف داده انتظار نمی‌رود؛ با این حال هر تغییر schema ریسک عملیاتی دارد و backup باید قابل‌بازیابی باشد.

5. `prisma migrate status`، `prisma validate` و `prisma migrate diff` را اجرا و سپس smoke test ورود و داشبورد را انجام دهید.

## خط قرمزها

- migrationهای موجود را حذف یا ویرایش نکنید.
- برای «رفع» اختلاف، دیتابیس واقعی را حذف یا `prisma db push --force-reset` اجرا نکنید.
- migration اولیه را بدون تطبیق schema به‌عنوان applied ثبت نکنید.
- این برنامه باید جداگانه برای هر دیتابیس محیط staging/production ارزیابی شود؛ وضعیت دیتابیس توسعه مدرک وضعیت production نیست.
