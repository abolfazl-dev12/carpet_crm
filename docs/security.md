# Persian Carpet CRM - Security Architecture & Hardening (مستند امنیت و سیاست‌های حفاظتی)

## 1. Authentication & Session Security
- **Password Hashing**: Industry-grade `bcryptjs` with salt rounds = 12. Never store plain-text passwords.
- **Session Tokens**: Signed encrypted JWT / JWE tokens issued using `jose`, stored in `HttpOnly`, `SameSite=Lax` (or `Strict`), and `Secure` (in HTTPS production) cookies.
- **Session Invalidation**: Immediate cookie clearing on logout with token expiration validation on every authenticated request.

---

## 2. Server-Side Role-Based Access Control (RBAC)
Frontend UI checks are purely ergonomic. Every API route and Server Action enforces server-side role validation:

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
- **Rate Limiting Architecture**: Sensitive routes (e.g. `/api/auth/login`) protect against brute-force attacks.
- **Audit Logging**: Every sensitive mutation (user creation, price change, inventory adjustment, lead assignment, stage change) logs the actor, IP, timestamp, and entity payload.
