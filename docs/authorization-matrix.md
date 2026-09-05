# Server-side Authorization Matrix

این ماتریس مرجع مجوز Route Handlerهای `src/app/api` است. `Own` یعنی منبع اصلی و تمام منابع مرتبط دارای مالک/فروشنده برابر با `session.userId` باشند. `Read` فقط عملیات بدون تغییر داده است. پاسخ نشست نامعتبر `401` و پاسخ نقش یا مالکیت نامعتبر `403` است.

| Endpoint | Method | ADMIN | SALES_MANAGER | SALES_REP | VIEWER |
| --- | --- | --- | --- | --- | --- |
| `/api/audit-logs` | GET | Read | Deny | Deny | Deny |
| `/api/auth/login` | POST | Public | Public | Public | Public |
| `/api/auth/logout` | POST | Revoke own session | Revoke own session | Revoke own session | Revoke own session |
| `/api/auth/me` | GET | Own session | Own session | Own session | Own session |
| `/api/customers` | GET | Read all | Read all | Read own | Read all |
| `/api/customers` | POST | Create | Create | Create own | Deny |
| `/api/customers/:id` | GET | Read all | Read all | Read own | Read all |
| `/api/customers/:id` | PUT | Update | Update | Update own | Deny |
| `/api/customers/:id` | DELETE | Delete | Delete | Deny | Deny |
| `/api/dashboard` | GET | Read organization | Read organization | Read own | Read organization |
| `/api/excel/export` | GET | Export | Export | Export own | Deny |
| `/api/followups` | GET | Read all | Read all | Read own | Read all |
| `/api/followups` | POST | Create | Create | Create own/own relations | Deny |
| `/api/followups` | PUT | Update | Update | Update own | Deny |
| `/api/followups` | DELETE | Delete | Delete | Delete own | Deny |
| `/api/installments` | GET | Read all | Read all | Read own orders | Read all |
| `/api/installments` | PUT | Update | Update | Update own orders | Deny |
| `/api/inventory` | GET | Read | Read | Read | Read |
| `/api/inventory` | POST | Mutate | Mutate | Deny | Deny |
| `/api/leads` | GET | Read all | Read all | Read own | Read all |
| `/api/leads` | POST | Create | Create | Create own | Deny |
| `/api/leads/:id` | GET | Read all | Read all | Read own | Read all |
| `/api/leads/:id` | PUT | Update | Update | Update own | Deny |
| `/api/leads/:id` | DELETE | Delete | Delete | Deny | Deny |
| `/api/leads/:id/convert` | POST | Convert | Convert | Convert own | Deny |
| `/api/notifications` | GET | Read own | Read own | Read own | Read own |
| `/api/notifications` | PUT | Update own | Update own | Update own | Deny |
| `/api/orders` | GET | Read all | Read all | Read own | Read all |
| `/api/orders` | POST | Create | Create | Create for own customer | Deny |
| `/api/orders` | DELETE | Delete unpaid | Delete unpaid | Deny | Deny |
| `/api/pipeline` | GET | Read all | Read all | Read own/own relations | Read all |
| `/api/pipeline` | POST | Create | Create | Create with own relations | Deny |
| `/api/pipeline` | PUT | Update | Update | Update own/own relations | Deny |
| `/api/pipeline` | DELETE | Delete | Delete | Delete own/own relations | Deny |
| `/api/pipeline/:id/stage` | PUT | Update | Update | Update own/own relations | Deny |
| `/api/products` | GET | Read | Read | Read | Read |
| `/api/products` | POST | Create | Create | Deny | Deny |
| `/api/products` | PUT | Update | Update | Deny | Deny |
| `/api/products` | DELETE | Delete | Deny | Deny | Deny |
| `/api/recommendation` | POST | Read calculation | Read calculation | Read calculation | Read calculation |
| `/api/reports` | GET | Read | Read | Deny | Deny |
| `/api/search` | GET | Read all | Read all | Read own | Read all |
| `/api/team` | GET | Read | Read | Deny | Deny |
| `/api/team` | POST | Create | Deny | Deny | Deny |
| `/api/team` | PUT | Update | Deny | Deny | Deny |
| `/api/team` | DELETE | Delete | Deny | Deny | Deny |

## قواعد مالکیت SALES_REP

- Customer و Lead بر اساس `assignedToId` محدود می‌شوند.
- Deal و FollowUp علاوه بر `assignedToId`، مالکیت Customer/Lead/Deal مرتبط را نیز بررسی می‌کنند.
- Order بر اساس `sellerId` و مالکیت Customer محدود می‌شود؛ Payment و Installment از همین Order scope تبعیت می‌کنند.
- داده‌های توکار، شمارنده‌ها، dashboard، search و export نیز باید همان scope را اعمال کنند؛ داشتن دسترسی به منبع اصلی نباید راهی برای مشاهده رابطه متعلق به نماینده دیگر باشد.
- کنترل‌های UI صرفاً برای تجربه کاربری هستند و هیچ مجوزی ایجاد نمی‌کنند.

`POST /api/auth/logout` عمداً idempotent است: اگر نشست معتبر باشد نسخهٔ همان کاربر را افزایش می‌دهد و در هر حالت فقط کوکی همان درخواست را پاک می‌کند. بنابراین درخواست فاقد نشست نیز برای خروج امن پاسخ موفق می‌گیرد و به داده‌ای دسترسی ندارد.
