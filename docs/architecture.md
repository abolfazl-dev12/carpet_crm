# Persian Carpet CRM - System Architecture (معماری جامع سیستم)

## 1. High-Level Architecture Overview

The Persian Carpet CRM is built as a unified, modular, modern web application on top of Next.js 15 (App Router), TypeScript, Prisma ORM, and Tailwind CSS. It is architected for strict Persian RTL, high performance, enterprise data consistency, and seamless responsive execution across mobile, tablet, and desktop viewports.

```
+-----------------------------------------------------------------------------------+
|                              Client Browser Layer                                 |
|   - Persian RTL Native Layout (dir="rtl", lang="fa", Vazirmatn Font)              |
|   - Responsive UI: Mobile Drawer / Sticky Actions / Desktop Sidebar               |
|   - Interactive Views: Kanban Pipeline (dnd-kit), Analytics (Recharts)            |
|   - Smart Forms (React Hook Form + Zod), Jalali Datepicker, Persian Digits        |
+-----------------------------------------------------------------------------------+
                                         │  HTTPS / JSON / Server Actions
                                         ▼
+-----------------------------------------------------------------------------------+
|                                Next.js App Router                                 |
|  ┌─────────────────────────┐ ┌──────────────────────────┐ ┌────────────────────┐  |
|  │ Presentation & Pages    │ │ Route Handlers / API     │ │ Middleware & Auth  │  |
|  │ - Dashboards (Manager/  │ │ - REST Endpoints         │ │ - Session Verifier │  |
|  │   Rep modes)            │ │ - Search & Rec Engine    │ │ - RBAC Guard       │  |
|  │ - Customers & Leads     │ │ - Report Aggregators     │ │ - Security Headers │  |
|  │ - Carpet Inventory/POS  │ │ - Excel Importer/Exporter│ │ - Audit Log Hook   │  |
|  └─────────────────────────┘ └──────────────────────────┘ └────────────────────┘  |
+-----------------------------------------------------------------------------------+
                                         │  Type-Safe Invocation
                                         ▼
+-----------------------------------------------------------------------------------+
|                               Business Logic Layer                                |
|  - Lead Scoring Engine (Dynamic scoring based on customer intent & interactions)  |
|  - Carpet Recommendation Engine (Multi-criteria deterministic spec matching)      |
|  - Automation & Notification Rule Engine (SLA breach, due dates, stock alerts)    |
|  - Order & Installment Scheduler (Due date computation, payment reconciliations) |
|  - Audit Trail Engine (Granular mutation logging with entity diffs)               |
+-----------------------------------------------------------------------------------+
                                         │  ORM Queries (Prisma)
                                         ▼
+-----------------------------------------------------------------------------------+
|                               Data Persistence Layer                              |
|  - Prisma ORM (Type-safe models, relations, indices, transactions)                |
|  - Database: SQLite (local/test compatibility) / PostgreSQL (production)          |
|  - Indexed entities: Phone numbers, Carpet SKUs, Deal Stages, Customer IDs        |
+-----------------------------------------------------------------------------------+
```

---

## 2. Directory Structure & Module Organization

```
/
├── docs/                        # Comprehensive Architecture & System Docs
│   ├── dependencies.md
│   ├── architecture.md
│   ├── database.md
│   ├── security.md
│   ├── api.md
│   ├── deployment.md
│   └── responsive.md
├── prisma/                      # Database Layer
│   ├── schema.prisma            # Relational models & indexes
│   └── seed.ts                  # Realistic Persian Carpet demo data generator
├── public/                      # Static assets & web fonts
│   └── fonts/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/login/        # Secure Authentication Page
│   │   ├── (dashboard)/         # Authenticated Application Shell
│   │   │   ├── page.tsx         # Role-adaptive Dashboard
│   │   │   ├── leads/           # Leads Table, Scoring, Conversion
│   │   │   ├── customers/       # Customer Directory & 360 Profile
│   │   │   ├── pipeline/        # Drag & Drop Kanban Pipeline
│   │   │   ├── followups/       # Follow-up Schedule & SLA Manager
│   │   │   ├── products/        # Carpet Catalog & Variant Specifier
│   │   │   ├── inventory/       # Stock Control & Movement History
│   │   │   ├── recommendation/  # Carpet Recommendation Engine
│   │   │   ├── orders/          # Orders, Invoices & Print View
│   │   │   ├── installments/    # Installment Ledger & Due Dates
│   │   │   ├── reports/         # Executive BI & Recharts Visualizations
│   │   │   ├── team/            # Sales Team & RBAC Management
│   │   │   ├── notifications/   # Notification Center & Automation
│   │   │   ├── audit-logs/      # Security & Audit Logs Viewer
│   │   │   └── settings/        # System Configuration
│   │   ├── api/                 # Secure REST API Endpoints
│   │   ├── layout.tsx           # Persian RTL Root Layout
│   │   └── globals.css          # Tailwind & Custom Design Tokens
│   ├── components/              # Reusable UI & Business Components
│   │   ├── ui/                  # Primitives (Button, Input, Modal, Badge, Table)
│   │   ├── layout/              # Sidebar, TopBar, MobileDrawer, NotificationDrawer
│   │   ├── kanban/              # Drag-and-drop Pipeline Board
│   │   ├── carpet/              # Carpet Card, Spec Badge, Variant Picker
│   │   ├── jalali/              # Jalali Date Picker & Formatter
│   │   └── search/              # Global Search Dialog (Ctrl+K)
│   ├── lib/                     # Utilities & Core Services
│   │   ├── auth.ts              # Session, JWT, Password & RBAC logic
│   │   ├── prisma.ts            # Singleton Prisma Client instance
│   │   ├── persian.ts           # Persian numbers, Jalali math, Toman formats
│   │   ├── scoring.ts           # Rule-based Lead Scoring Engine
│   │   ├── recommendation.ts    # Carpet Match & Recommendation Engine
│   │   ├── automation.ts        # Automated trigger & SLA evaluator
│   │   └── audit.ts             # Server-side Audit Logger
│   └── types/                   # Shared TypeScript Interfaces & Enums
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 3. Core Business Workflows

### 3.1 Carpet Need Profile & Matching Algorithm
1. A lead or customer provides requirements (سایز، شانه، تراکم، سبک، رنگ، بودجه).
2. The `CarpetNeedProfile` is saved and linked to the Customer/Lead.
3. The Deterministic Recommendation Engine evaluates inventory variants against these requirements:
   - Size match: 30 pts
   - Shane / Density match: 25 pts
   - Color tone match: 20 pts
   - Style match (Modern / Classic / Vintage / Tribal): 15 pts
   - Budget affordability: 10 pts
4. Match Score (۰ تا ۱۰۰٪) is generated with clear Persian explanations (e.g. "تطابق کامل ابعاد و شانه، همخوانی رنگ گردویی با سلیقه مشتری").

### 3.2 Lead Scoring Engine
- Real-time scoring calculates the temperature (داغ: +۶۰, گرم: ۳۵-۵۹, سرد: ۱۵-۳۴, ضعیف: <۱۵).
- Actions adjust score immediately:
  - استعلام قیمت: +10
  - درخواست تصویر یا کاتالوگ: +5
  - انتخاب تخته فرش: +15
  - استعلام شرایط اقساط: +15
  - اعلام بودجه مشخص: +10
  - درخواست ارسال / پرو در محل: +20
  - پاسخ به پیگیری تلفنی/پیامکی: +5
  - عدم پاسخ در ۲ پیگیری متوالی: -10

### 3.3 Sales Pipeline & Kanban
- Fully interactive Kanban board allowing smooth drag-and-drop transitions between stages.
- Automated deal value calculations in Persian Toman.
- Stage changes automatically trigger Audit Logs and SLA notifications.

### 3.4 Installment Ledger (دفتر اقساط)
- Generates automatic monthly or custom installment schedules upon order creation with installment payment mode.
- Tracks due date (سررسید شمسی), payment status (در انتظار، پرداخت شده، معوق), tracking number, and recipient.
- Overdue installments trigger automatic manager and sales rep notifications.
