# Persian Carpet CRM - Responsive Design & Mobile-First Specification (مستند طراحی واکنش‌گرا و تجربه موبایل)

## 1. Breakpoint Strategy

| Target Device | Viewport Range | Layout Behavior | Navigation Mode |
|---|---|---|---|
| **Mobile Compact** | 360px – 430px | Single-column cards, full-width drawers, bottom action bar | Off-canvas Drawer + Bottom Nav |
| **Tablet** | 768px – 1024px | 2-column grids, horizontal swipeable Kanban, compact tables | Collapsible Icon Sidebar |
| **Laptop & Desktop** | 1024px – 1440px | Multi-column layouts, expanded data tables, full Kanban | Expanded Persistent Sidebar |
| **Large Desktop / 4K** | 1920px+ | Max container width constraint, high information density | Expanded Persistent Sidebar |

---

## 2. Mobile-First Interaction Principles

1. **Touch Target Standard**: All buttons, links, inputs, and tabs have a minimum touch footprint of `44×44px`.
2. **Zero Horizontal Page Overflow**: No element overflows `100vw`. Tables feature a card-view switcher on mobile or smooth horizontal scroll wrappers with shadow indicator boundaries.
3. **Persian RTL Drawer Navigation**: Mobile menu smoothly opens from the right (RTL direction).
4. **Sticky Quick Actions**: Critical actions (e.g. "ثبت لید جدید", "ثبت سفارش", "تماس سریع") stick to the screen bottom on mobile for thumb accessibility.
5. **No Hover-Only Functions**: Action menus rely on explicit tap/click dropdowns rather than mouse hover states.
6. **Adaptive Data Visualizations**: Recharts responsive containers resize dynamically to preserve Persian axis labels and tooltips.
