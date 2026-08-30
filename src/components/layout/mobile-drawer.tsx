"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  X,
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
} from "lucide-react";
import { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole;
  userName?: string;
  onLogout?: () => void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  userRole = "SALES_REP",
  userName = "کاربر سیستم",
  onLogout,
}: MobileDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  if (!isOpen) return null;

  const navigationItems: NavSection[] = [
    {
      title: "عملیات فروش",
      items: [
        { href: "/", label: "داشبورد مدیریت", icon: LayoutDashboard },
        { href: "/leads", label: "سرنخ‌ها (لیدها)", icon: Target },
        { href: "/customers", label: "مشتریان", icon: Users },
        { href: "/pipeline", label: "پایپ‌لاین فروش", icon: Kanban },
        { href: "/followups", label: "پیگیری‌ها و وظایف", icon: CalendarClock },
      ],
    },
    {
      title: "محصولات و انبار",
      items: [
        { href: "/products", label: "کاتالوگ فرش‌ها", icon: Layers },
        { href: "/inventory", label: "موجودی انبار", icon: Boxes },
        { href: "/recommendation", label: "پیشنهاد هوشمند فرش", icon: Sparkles },
      ],
    },
    {
      title: "مالی و فاکتورها",
      items: [
        { href: "/orders", label: "سفارش‌ها و فاکتورها", icon: Receipt },
        { href: "/installments", label: "دفتر اقساط و چک‌ها", icon: CreditCard },
        { href: "/reports", label: "گزارش‌های تحلیلی", icon: BarChart3 },
      ],
    },
    {
      title: "سیستم",
      items: [
        { href: "/team", label: "تیم فروش", icon: UserCheck, roles: ["ADMIN", "SALES_MANAGER"] },
        { href: "/notifications", label: "اعلان‌ها", icon: Bell },
        { href: "/audit-logs", label: "گزارش رویدادها", icon: ShieldCheck, roles: ["ADMIN"] },
        { href: "/settings", label: "تنظیمات", icon: Settings, roles: ["ADMIN"] },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Body (Right-aligned for Persian RTL) */}
      <div className="relative mr-auto w-[85vw] max-w-sm bg-carpet-navy text-white h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 border border-white/20 flex items-center justify-center shadow-md overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="فرش یاشار" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">فرش یاشار</p>
              <p className="text-[10px] text-sky-300">Yashar Carpet CRM</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigationItems.map((section, idx) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || item.roles.includes(userRole)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1.5">
                <h3 className="px-2 text-[11px] font-bold text-slate-400 uppercase">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px]",
                          isActive
                            ? "bg-carpet-crimson text-white shadow-md shadow-carpet-crimson/30 font-bold"
                            : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-sky-300">{userRole}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs font-semibold flex items-center gap-1.5 min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج</span>
          </button>
        </div>
      </div>
    </div>
  );
}
