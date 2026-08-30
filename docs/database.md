# Persian Carpet CRM - Database Architecture & Data Dictionary (طراحی پایگاه داده و مدل داده‌ها)

## 1. Overview
The database layer is modeled with relational integrity, foreign key constraints, cascading policies, and compound indexes to deliver sub-millisecond query performance for carpet sales operations.

---

## 2. Entity Relational Model & Schema Definition

### 2.1 Core Entities

#### User (کاربران سیستم و تیم فروش)
- `id` (String / UUID / CUID)
- `name` (String - نام و نام خانوادگی)
- `email` (String, Unique)
- `phone` (String - موبایل)
- `passwordHash` (String - هش ایمن)
- `role` (Enum: `ADMIN`, `SALES_MANAGER`, `SALES_REP`, `VIEWER`)
- `isActive` (Boolean)
- `createdAt`, `updatedAt`

#### Customer (مشتریان قطعی)
- `id` (String / UUID)
- `code` (String, Unique - کد مشتری)
- `firstName`, `lastName` (String)
- `phone` (String, Indexed - شماره همراه اصلی)
- `secondPhone` (String, Optional)
- `province` (String - استان)
- `city` (String - شهر)
- `address` (String, Optional)
- `postalCode` (String, Optional)
- `notes` (String, Optional)
- `assignedToId` (FK -> User)
- `createdAt`, `updatedAt`

#### Lead (سرنخ‌های فروش)
- `id` (String / UUID)
- `firstName`, `lastName` (String)
- `phone` (String, Indexed - شماره همراه)
- `secondPhone` (String, Optional)
- `province`, `city` (String)
- `source` (Enum: `INSTAGRAM`, `WHATSAPP`, `TELEGRAM`, `WEBSITE`, `CALL`, `SMS`, `ADS`, `REFERRAL`, `STORE`, `OTHER`)
- `campaign` (String, Optional - نام کمپین)
- `status` (Enum: `NEW`, `CONTACTED`, `QUALIFIED`, `NEEDS_ASSESSMENT`, `PROPOSAL_SENT`, `NEGOTIATION`, `DECISION_PENDING`, `WON`, `LOST`, `FUTURE_FOLLOWUP`)
- `score` (Integer - امتیاز لید)
- `temperature` (Enum: `HOT`, `WARM`, `COLD`, `UNQUALIFIED`)
- `estimatedBudget` (Float / BigInt - بودجه تخمینی به تومان)
- `purchaseTimeframe` (String - زمان خرید: فوری، این ماه، دو ماه آینده)
- `notes` (String, Optional)
- `assignedToId` (FK -> User)
- `convertedToCustomerId` (FK -> Customer, Optional)
- `createdAt`, `updatedAt`, `lastActivityAt`

#### CarpetNeedProfile (پروفایل نیازسنجی تخصصی فرش)
- `id` (String)
- `customerId` (FK -> Customer, Optional)
- `leadId` (FK -> Lead, Optional)
- `preferredSizes` (String / JSON - ابعاد مورد نظر: ۶، ۹، ۱۲ متری، قالیچه، کناره)
- `preferredShane` (String - شانه: ۷۰۰، ۱۰۰۰، ۱۲۰۰، ۱۵۰۰)
- `preferredDensity` (String - تراکم: ۲۵۵۰، ۳۰۰۰، ۳۶۰۰، ۴۵۰۰)
- `preferredColors` (String / JSON - رنگ‌های ترجیحی: سرمه‌ای، کرم، طوسی، گردویی، لاکی)
- `preferredStyle` (String - سبک: کلاسیک، مدرن، وینتیج، نئوکلاسیک، عشایری)
- `preferredCollection` (String, Optional - کلکسیون ترجیحی: اصفهان، کاشان، تبریز، نائین)
- `budgetMin`, `budgetMax` (Float)
- `quantity` (Integer - تعداد تخته)
- `paymentPreference` (Enum: `CASH`, `INSTALLMENT`, `HYBRID`)
- `spaceType` (String - نوع فضا: پذیرایی، اتاق خواب، راهرو، هتل/دفتر)
- `notes` (String, Optional)

#### Product (کاتالوگ فرش)
- `id` (String)
- `code` (String, Unique - کد محصول)
- `name` (String - نام طرح و فرش)
- `pattern` (String - نام نقشه: ترنج، افشان، خشتی، شاه عباسی، لچک ترنج، شکارگاه)
- `collection` (String - کلکسیون: اصفهان، کاشان، تبریز، ابریشم قم، مدرن طلاکوب)
- `shane` (Integer - شانه: ۷۰۰، ۱۰۰۰، ۱۲۰۰، ۱۵۰۰)
- `density` (Integer - تراکم: ۲۵۵۰، ۳۰۰۰، ۳۶۰۰، ۴۵۰۰)
- `colorCount` (Integer - تعداد رنگ: ۸، ۱۰، ۱۲ رنگ)
- `yarnMaterial` (String - جنس نخ: اکریلیک هیت ست شده، ابریشم بامبو، پشم دستباف)
- `weavingMachine` (String - دستگاه بافت: شونهر آلمان، وندویل بلژیک)
- `style` (String - سبک: کلاسیک، مدرن، وینتیج، نئوکلاسیک)
- `primaryColor` (String - رنگ زمینه اصلی: سرمه‌ای، کرم، طوسی، گردویی، لاکی)
- `images` (String / JSON - آدرس تصاویر باکیفیت)
- `description` (String - توضیحات و اصالت طرح)
- `isActive` (Boolean)

#### ProductVariant (تنوع‌های ابعاد و قیمت فرش)
- `id` (String)
- `productId` (FK -> Product)
- `sku` (String, Unique - کد انبار)
- `size` (String - ابعاد: ۲×۳ [۶ متری]، ۲.۵×۳.۵ [۹ متری]، ۳×۴ [۱۲ متری]، ۱.۵×۲.۲۵ [۴ متری]، ۱×۱.۵ [قالیچه]، ۱×۳ [کناره])
- `areaSquareMeters` (Float - متراژ به متر مربع)
- `cashPrice` (Float - قیمت نقدی به تومان)
- `installmentPrice` (Float - قیمت اقساطی به تومان)
- `stock` (Integer - موجودی کل)
- `reservedStock` (Integer - تعداد رزرو شده)
- `soldStock` (Integer - تعداد فروخته شده)

#### InventoryMovement (گردش انبار و سابقه جابجایی موجودی)
- `id` (String)
- `variantId` (FK -> ProductVariant)
- `type` (Enum: `PURCHASE`, `RESERVATION`, `RELEASE_RESERVATION`, `SALE`, `RETURN`, `ADJUSTMENT`)
- `quantity` (Integer - تعداد جابجایی)
- `previousStock` (Integer)
- `newStock` (Integer)
- `reason` (String - دلیل جابجایی و شماره سند)
- `userId` (FK -> User)
- `createdAt`

#### Deal (فرصت فروش / پرونده معامله در پایپ‌لاین)
- `id` (String)
- `title` (String - عنوان معامله)
- `leadId` (FK -> Lead, Optional)
- `customerId` (FK -> Customer, Optional)
- `productId` (FK -> Product, Optional)
- `variantId` (FK -> ProductVariant, Optional)
- `value` (Float - ارزش معامله به تومان)
- `stage` (Enum: `NEW`, `CONTACTED`, `QUALIFIED`, `NEEDS_ASSESSMENT`, `PROPOSAL_SENT`, `NEGOTIATION`, `DECISION_PENDING`, `WON`, `LOST`, `FUTURE_FOLLOWUP`)
- `priority` (Enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `assignedToId` (FK -> User)
- `expectedCloseDate` (DateTime, Optional)
- `lostReason` (String, Optional)
- `notes` (String, Optional)
- `createdAt`, `updatedAt`

#### FollowUp (وظایف پیگیری و گام بعدی فروش)
- `id` (String)
- `title` (String)
- `type` (Enum: `CALL`, `WHATSAPP`, `SMS`, `SEND_CARPET_PHOTO`, `SEND_PRICE`, `SEND_CATALOG`, `NEGOTIATION`, `PAYMENT_REMINDER`, `IN_PERSON_VISIT`, `OTHER`)
- `priority` (Enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `status` (Enum: `PENDING`, `DONE`, `CANCELLED`, `OVERDUE`)
- `scheduledAt` (DateTime - تاریخ و ساعت برنامه‌ریزی شده)
- `completedAt` (DateTime, Optional)
- `resultNote` (String, Optional - گزارش نتیجه پیگیری)
- `leadId` (FK -> Lead, Optional)
- `customerId` (FK -> Customer, Optional)
- `dealId` (FK -> Deal, Optional)
- `assignedToId` (FK -> User)
- `createdAt`, `updatedAt`

#### Order & OrderItem (سفارشات قطعی و اقلام فاکتور)
- `Order`: `id`, `orderNumber` (Unique), `customerId`, `sellerId`, `totalAmount`, `discountAmount`, `taxAmount`, `finalAmount`, `paymentMethod` (`CASH`, `INSTALLMENT`, `CHEQUE`, `MIXED`), `paidAmount`, `remainingAmount`, `shippingStatus` (`PENDING`, `PREPARING`, `SHIPPED`, `DELIVERED`, `CANCELLED`), `status` (`DRAFT`, `CONFIRMED`, `PAID`, `COMPLETED`, `CANCELLED`), `shippingAddress`, `notes`, `createdAt`
- `OrderItem`: `id`, `orderId`, `variantId`, `quantity`, `unitPrice`, `totalPrice`, `notes`

#### Payment & Installment (پرداخت‌ها و دفترچه اقساط)
- `Payment`: `id`, `orderId`, `amount`, `method` (`CASH`, `POS`, `CARD_TO_CARD`, `CHEQUE`, `ONLINE`), `trackingNumber`, `paidAt`, `status` (`CONFIRMED`, `PENDING`, `REJECTED`), `notes`, `recordedById`
- `Installment`: `id`, `orderId`, `installmentNumber`, `amount`, `dueDate` (DateTime), `status` (`PENDING`, `PAID`, `OVERDUE`, `CANCELLED`), `paidDate`, `paymentTracking`, `chequeNumber`, `notes`

#### Notification & AutomationRule (سیستم اعلان‌ها و اتوماسیون)
- `Notification`: `id`, `userId`, `title`, `message`, `type` (`LEAD_ASSIGNED`, `HOT_LEAD`, `FOLLOWUP_REMINDER`, `OVERDUE_ALERT`, `PAYMENT_DUE`, `LOW_STOCK`, `ORDER_CONFIRMED`), `isRead`, `linkUrl`, `createdAt`
- `AutomationRule`: `id`, `name`, `triggerType`, `conditions` (JSON), `actions` (JSON), `isActive`

#### AuditLog (ردیابی رویدادها و امنیت)
- `id`, `userId`, `action` (`LOGIN`, `LOGOUT`, `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `ASSIGNMENT`), `entity` (String), `entityId` (String), `details` (JSON), `ipAddress`, `userAgent`, `createdAt`

---

## 3. Indexing Strategy
- Fast phone lookup: `CREATE INDEX idx_customer_phone ON Customer(phone);`
- Fast lead phone & status lookup: `CREATE INDEX idx_lead_phone_status ON Lead(phone, status);`
- Rapid product search: `CREATE INDEX idx_product_code_pattern ON Product(code, pattern, collection);`
- Order and Installment due date queries: `CREATE INDEX idx_installment_due_status ON Installment(dueDate, status);`
- Follow-up SLA monitor: `CREATE INDEX idx_followup_status_date ON FollowUp(status, scheduledAt);`
