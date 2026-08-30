# Persian Carpet CRM - REST API Reference & Endpoints (مستند وب‌سرویس‌ها و API)

## 1. Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user with email/phone & password | No |
| `POST` | `/api/auth/logout` | Invalidate active session and clear HTTP-only cookie | Yes |
| `GET` | `/api/auth/me` | Fetch active user profile, role, and permission scope | Yes |

---

## 2. Core CRM Endpoints

| Method | Endpoint | Description | Roles Allowed |
|---|---|---|---|
| `GET` / `POST` | `/api/leads` | List leads (filtered/paginated) or create new lead | All / Rep, Manager, Admin |
| `GET` / `PUT` / `DELETE` | `/api/leads/[id]` | Get lead detail, update lead data / score, delete lead | Rep (assigned), Manager, Admin |
| `POST` | `/api/leads/[id]/convert` | Convert qualified lead to official Customer & Deal | Rep, Manager, Admin |
| `GET` / `POST` | `/api/customers` | List customers or register new carpet customer | All / Rep, Manager, Admin |
| `GET` / `PUT` | `/api/customers/[id]` | Customer 360 profile, timeline, carpet need profile | Rep, Manager, Admin |
| `GET` / `POST` | `/api/pipeline` | List deals grouped by pipeline stages or create deal | All / Rep, Manager, Admin |
| `PUT` | `/api/pipeline/[id]/stage` | Drag & drop transition deal to new stage | Rep (assigned), Manager, Admin |
| `GET` / `POST` / `PUT` | `/api/followups` | Manage next-actions, scheduled followups, SLA status | Rep, Manager, Admin |
| `GET` / `POST` | `/api/products` | Carpet catalog with variants, shane, density, prices | All / Manager, Admin |
| `POST` | `/api/recommendation` | Carpet matching engine: input need profile -> match % | All |
| `GET` / `POST` | `/api/inventory` | Real-time stock status and inventory movements | All / Manager, Admin |
| `GET` / `POST` | `/api/orders` | Create carpet orders, calculate totals & discounts | Rep, Manager, Admin |
| `GET` / `POST` | `/api/installments` | Installment ledger, payment record, receipt confirmation | Rep, Manager, Admin |
| `GET` | `/api/dashboard` | Aggregated sales stats, conversion rates, KPIs | All (Role-scoped) |
| `GET` | `/api/reports` | Analytical data for Recharts visualizations & BI | Manager, Admin |
| `GET` | `/api/notifications` | Unread notifications & alert count | All |
| `GET` | `/api/search` | Unified global search across customers, leads, carpets | All |
| `GET` / `POST` | `/api/excel/export` | Export leads/customers/products to Excel (.xlsx) | Manager, Admin |
| `POST` | `/api/excel/import` | Bulk import leads from Excel with validation | Manager, Admin |
| `GET` | `/api/audit-logs` | Query system security and audit trail | Admin |
