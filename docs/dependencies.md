# Persian Carpet CRM - Dependency Evaluation Matrix (مستند ارزیابی و انتخاب وابستگی‌ها)

This document outlines the evaluation, justification, maintenance status, license, and security profile of every dependency used in the production-grade Persian Carpet CRM.

---

## 1. Core Framework & Runtime

| Package | Version | Justification & Purpose | Maintenance & License | Alternative Evaluated |
|---|---|---|---|---|
| `next` | `^15.1.0` | React server-side rendering, App Router, optimized API routes, route handlers, server actions, image optimization. | Active (Vercel), MIT | Vite / SPA (Lacks built-in SSR/API Route orchestration) |
| `react` | `^19.0.0` | Modern component UI library with Server Components & Action hooks. | Active (Meta), MIT | Vue / Svelte |
| `react-dom` | `^19.0.0` | DOM renderer for React. | Active (Meta), MIT | - |
| `typescript` | `^5.7.0` | Static typing, interface contracts, strict compile checks for enterprise reliability. | Active (Microsoft), Apache-2.0 | Vanilla JavaScript (unsafe for enterprise) |

---

## 2. Database & Data Layer

| Package | Version | Justification & Purpose | Maintenance & License | Alternative Evaluated |
|---|---|---|---|---|
| `prisma` & `@prisma/client` | `^6.1.0` | Type-safe ORM, auto-generated TypeScript clients, automated schema migrations, zero-leak SQL relations, supports SQLite & PostgreSQL. | Active, Apache-2.0 | Drizzle, TypeORM, raw SQL (Prisma provides superior DX, schema consistency & relations for CRM entities) |

---

## 3. UI, Design System & Persian RTL

| Package | Version | Justification & Purpose | Maintenance & License | Alternative Evaluated |
|---|---|---|---|---|
| `tailwindcss` | `^3.4.1` | Utility-first CSS engine with RTL direction plugins, custom color tokens, responsive breakpoints, zero-runtime CSS overhead. | Active, MIT | CSS Modules / Styled Components |
| `postcss` & `autoprefixer` | `^8.4.0` | CSS parsing and vendor prefixing for cross-browser support (Chrome, Safari, Edge, Firefox). | Active, MIT | - |
| `clsx` & `tailwind-merge` | `^2.1.0` | Conditional class joining and collision-free Tailwind class resolution. | Active, MIT | Manual string concat |
| `lucide-react` | `^0.468.0` | Modern, clean icon library with RTL-friendly icons (arrows, phones, carpets, money, users, tags). | Active, ISC | Heroicons, FontAwesome |
| `@dnd-kit/core` & `@dnd-kit/sortable` | `^8.0.0` | Modern, accessible, touch/mobile-friendly drag and drop engine for the Carpet Sales Kanban Pipeline. | Active, MIT | react-beautiful-dnd (deprecated) |
| `recharts` | `^2.15.0` | Declarative, SVG-based charting library for sales trends, conversion funnels, rep leaderboard, and carpet category analytics. | Active, MIT | Chart.js (Recharts integrates natively with React state) |

---

## 4. Forms, Validation & Utilities

| Package | Version | Justification & Purpose | Maintenance & License | Alternative Evaluated |
|---|---|---|---|---|
| `react-hook-form` | `^7.54.0` | Performant, uncontrolled form management with minimal re-renders. | Active, MIT | Formik (slower re-renders) |
| `zod` | `^3.24.0` | TypeScript-first schema validation for forms, APIs, and business logic. | Active, MIT | Yup, Joi |
| `@hookform/resolvers` | `^3.9.0` | Bridges Zod schema validation to React Hook Form. | Active, MIT | Manual resolvers |
| `jalaali-js` | `^1.2.7` | Lightweight, mathematically accurate Jalali (Shamsi/Persian) calendar conversions (G2J and J2G). | Active, MIT | moment-jalaali (deprecated/bloated) |
| `bcryptjs` | `^2.4.3` | Secure password hashing for server-side authentication without requiring C++ compilation bindings on Windows. | Active, MIT | Argon2 (requires native node-gyp toolchain which may fail on some Windows setups) |
| `jose` | `^5.9.0` | Universal JSON Web Token (JWT) and encryption library for secure HTTP-only session cookies. | Active, MIT | jsonwebtoken |
| `xlsx` | `^0.18.5` | High-performance Excel reading/writing for importing leads and exporting sales/inventory reports. | Active, Apache-2.0 | exceljs |

---

## 5. Summary & Installation Rationale

Every dependency selected is actively maintained, open source with commercially safe licenses (MIT / Apache-2.0 / ISC), natively supports TypeScript, and addresses a strict business requirement of the Persian Carpet Sales CRM. No superfluous dependencies have been introduced.
