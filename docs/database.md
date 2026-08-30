# Persian Carpet CRM - Database Architecture & Hardening Guide (طراحی پایگاه داده و راهنمای پایداری)

## 1. Overview & Core Philosophy
The database layer is modeled with strict relational integrity, composite unique constraints, transactional atomicity, and query performance indexes to deliver enterprise-level reliability for carpet sales operations.

---

## 2. Entity Relational Model & Schema Invariants

### 2.1 Core Entities

#### User (کاربران سیستم و تیم فروش)
- `id` (String / CUID)
- `name` (String - نام و نام خانوادگی)
- `email` (String, Unique)
- `phone` (String - موبایل)
- `passwordHash` (String - هش ایمن bcrypt)
- `role` (Enum: `ADMIN`, `SALES_MANAGER`, `SALES_REP`, `VIEWER`)
- `isActive` (Boolean - ابطال آنی سشن در صورت false بودن)
- `createdAt`, `updatedAt`

#### Customer (مشتریان قطعی)
- `id` (String / CUID)
- `code` (String, Unique - کد مشتری یکتا)
- `firstName`, `lastName` (String)
- `phone` (String, Indexed - شماره همراه اصلی)
- `secondPhone` (String, Optional)
- `province`, `city` (String, Compound Indexed)
- `address`, `postalCode`, `notes` (String, Optional)
- `assignedToId` (FK -> User, Indexed)
- `createdAt` (Indexed), `updatedAt`

#### Lead (سرنخ‌های فروش)
- `id` (String / CUID)
- `firstName`, `lastName` (String)
- `phone` (String, Indexed)
- `province`, `city` (String)
- `source`, `campaign`, `status` (Indexed), `score`, `temperature` (Indexed)
- `estimatedBudget` (Int - تومان صحیح)
- `assignedToId` (FK -> User, Indexed)
- `convertedToCustomerId` (FK -> Customer, Optional)
- `createdAt` (Indexed), `updatedAt`, `lastActivityAt`

#### CarpetNeedProfile (پروفایل نیازسنجی تخصصی فرش)
- `id` (String / CUID)
- `customerId` (FK -> Customer, @unique 1-to-1)
- `leadId` (FK -> Lead, @unique 1-to-1)
- `preferredSizes` (JSON Array), `preferredShane`, `preferredDensity`, `preferredColors` (JSON Array), `preferredStyle`, `preferredCollection`
- `budgetMin`, `budgetMax` (Int - تومان صحیح)
- `quantity` (Int), `paymentPreference` (Enum), `spaceType`, `notes`

#### Product & ProductVariant (کاتالوگ فرش و تنوع‌های انبار)
- **Product:** `code` (Unique), `name`, `pattern`, `collection`, `shane`, `density`, `style`, `primaryColor`, `images`, `isActive`
- **ProductVariant:** `sku` (Unique), `size`, `areaSquareMeters` (Float), `cashPrice` (Int), `installmentPrice` (Int), `stock` (Int), `reservedStock` (Int), `soldStock` (Int)

#### InventoryMovement (دفتر کل گردش انبار)
- `id` (String / CUID)
- `variantId` (FK -> ProductVariant, Indexed)
- `type` (Enum: `PURCHASE`, `RESERVATION`, `RELEASE_RESERVATION`, `SALE`, `RETURN`, `ADJUSTMENT`)
- `quantity` (Int), `previousStock` (Int), `newStock` (Int), `reason` (String), `userId` (FK -> User, Indexed)
- `createdAt` (Indexed)

#### Order & OrderItem (فاکتورهای فروش)
- **Order:** `orderNumber` (Unique), `totalAmount` (Int), `discountAmount` (Int), `taxAmount` (Int), `finalAmount` (Int), `paidAmount` (Int), `remainingAmount` (Int), `paymentMethod` (Enum), `status` (Enum), `customerId` (FK, Indexed), `sellerId` (FK, Indexed), `createdAt` (Indexed)
- **OrderItem:** `orderId` (FK, Cascade), `variantId` (FK, Restrict), `quantity` (Int), `unitPrice` (Int), `totalPrice` (Int)

#### Payment (تراکنش‌های مالی و دفتر پرداخت)
- `id` (String / CUID)
- `idempotencyKey` (String, @unique - جلوگیری قطعی از ثبت تراکنش تکراری)
- `orderId` (FK -> Order, Cascade, Indexed)
- `amount` (Int - تومان صحیح)
- `method` (Enum: `CASH`, `POS`, `CARD_TO_CARD`, `CHEQUE`, `ONLINE`, `INSTALLMENT`)
- `trackingNumber` (String, Optional - شماره پیگیری بانکی)
- `paidAt` (Indexed), `status`, `notes`, `createdAt`

#### Installment (دفترچه اقساط)
- `id` (String / CUID)
- `orderId` (FK -> Order, Cascade, Indexed)
- `installmentNumber` (Int)
- `amount` (Int), `dueDate` (DateTime, Compound Indexed with `status`)
- `status` (Enum: `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`)
- `paidDate` (DateTime, Optional), `paymentTracking`, `chequeNumber`
- **Constraint:** `@@unique([orderId, installmentNumber])`

---

## 3. Production Hardening Invariants

### 3.1 Inventory Atomicity & Oversell Prevention
- **Available Stock Calculation:** `availableStock = stock - reservedStock`
- In any sale operation, if `requestedQuantity > availableStock`, the transaction fails immediately before any state mutation.
- Stock decrement, sold increment, order creation, and `InventoryMovement` recording are wrapped in a single `prisma.$transaction`.

### 3.2 Financial Consistency & Ledger Integrity
- **Formula:** `paidAmount = SUM(valid payments)` and `remainingAmount = MAX(0, finalAmount - paidAmount)`.
- All prices, totals, discounts, and payments are stored as pure **Integers (Iranian Toman)**.
- Installment payments use `idempotencyKey: INST-{orderId}-{installmentNumber}`.
- Reversal (`PAID -> PENDING`) safely removes the associated payment and recalculates true ledger balances.

### 3.3 Customer Deletion Protection
- Customers with registered `orders` cannot be hard-deleted, protecting accounting history.

---

## 4. Production Migration Strategy
```bash
# Apply version-controlled migrations safely:
npx prisma migrate deploy

# Verify schema and generate client:
npx prisma validate
npx prisma generate
```
