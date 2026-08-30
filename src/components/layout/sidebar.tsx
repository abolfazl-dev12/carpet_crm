"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  Target,
  Kanban,
  CalendarClock,
  Layers,
  Boxes,
  Sparkles,
  Receipt,
  CreditCard,
  BarChart3,
  UserCheck,
  Bell,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  count?: string;
  badge?: string;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  userAvatar?: string | null;
  onLogout?: () => void;
}

export function Sidebar({
  userRole = "SALES_REP",
  userName = "کارشناس فروش",
  userAvatar,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  const navigationItems: NavSection[] = [
    {
      title: "اصلی",
      items: [
        { href: "/", label: "داشبورد مدیریت", icon: LayoutDashboard },
        { href: "/leads", label: "سرنخ‌ها (لیدها)", icon: Target, count: "۱۲" },
        { href: "/customers", label: "مشتریان", icon: Users },
        { href: "/pipeline", label: "پایپ‌لاین فروش (کانبان)", icon: Kanban },
        { href: "/followups", label: "پیگیری‌ها و وظایف", icon: CalendarClock, count: "۴" },
      ],
    },
    {
      title: "محصولات و انبار",
      items: [
        { href: "/products", label: "کاتالوگ فرش‌ها", icon: Layers },
        { href: "/inventory", label: "موجودی و گردش انبار", icon: Boxes },
        { href: "/recommendation", label: "موتور هوشمند پیشنهاد فرش", icon: Sparkles, badge: "جدید" },
      ],
    },
    {
      title: "فروش و مالی",
      items: [
        { href: "/orders", label: "سفارش‌ها و فاکتورها", icon: Receipt },
        { href: "/installments", label: "دفترچه اقساط و چک‌ها", icon: CreditCard },
        { href: "/reports", label: "گزارش‌های تحلیلی و BI", icon: BarChart3 },
      ],
    },
    {
      title: "مدیریت و سیستم",
      items: [
        { href: "/team", label: "تیم فروش و دسترسی‌ها", icon: UserCheck, roles: ["ADMIN", "SALES_MANAGER"] },
        { href: "/notifications", label: "مرکز اعلان‌ها", icon: Bell },
        { href: "/audit-logs", label: "گزارش رویدادها و امنیت", icon: ShieldCheck, roles: ["ADMIN"] },
        { href: "/settings", label: "تنظیمات سیستم", icon: Settings, roles: ["ADMIN"] },
      ],
    },
  ];

  return (
    <aside className="w-72 bg-carpet-navy text-white flex flex-col h-screen sticky top-0 shadow-2xl border-l border-slate-800 select-none z-30 hidden lg:flex">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 p-1 border border-white/20 flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="فرش یاشار" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-black text-base tracking-wide text-white flex items-center gap-1.5">
              <span>فرش یاشار</span>
            </h1>
            <p className="text-[10px] text-sky-300 font-medium">
              Yashar Carpet CRM
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {navigationItems.map((section, idx) => {
          // Filter items based on user role
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(userRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1.5">
              <h2 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h2>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                        isActive
                          ? "bg-carpet-crimson text-white shadow-md shadow-carpet-crimson/30 font-bold"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={clsx(
                            "w-4 h-4 transition-transform group-hover:scale-110",
                            isActive ? "text-white" : "text-slate-400 group-hover:text-sky-300"
                          )}
                        />
                        <span>{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                            {item.badge}
                          </span>
                        )}
                        {item.count && (
                          <span
                            className={clsx(
                              "text-xs px-2 py-0.5 rounded-full font-bold",
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-800 text-slate-300 group-hover:bg-slate-700"
                            )}
                          >
                            {item.count}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Info & Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-carpet-crimson/30 border border-carpet-crimson/50 flex items-center justify-center text-sky-300 font-bold text-sm overflow-hidden flex-shrink-0">
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-sky-300 truncate">
                {userRole === "ADMIN"
                  ? "مدیر ارشد سیستم"
                  : userRole === "SALES_MANAGER"
                  ? "مدیر فروش"
                  : "کارشناس فروش"}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="خروج از حساب کاربری"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
