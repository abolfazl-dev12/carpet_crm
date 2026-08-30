"use client";

import React, { useEffect, useState } from "react";
import { X, Bell, CheckCircle, AlertTriangle, Flame, CreditCard, Package } from "lucide-react";
import Link from "next/link";
import { formatPersianRelativeTime } from "@/lib/persian";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.notifications) {
            setNotifications(data.notifications);
          }
        })
        .catch((err) => console.error("Error loading notifications:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const markAllAsRead = async () => {
    await fetch("/api/notifications", { method: "PUT" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "HOT_LEAD":
        return <Flame className="w-4 h-4 text-rose-500" />;
      case "OVERDUE_ALERT":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "PAYMENT_DUE":
        return <CreditCard className="w-4 h-4 text-indigo-500" />;
      case "LOW_STOCK":
        return <Package className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative mr-auto w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-300 border-r border-carpet-cream-border dark:border-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-carpet-cream-border dark:border-slate-800 flex items-center justify-between bg-carpet-cream/40 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-carpet-crimson dark:text-amber-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              مرکز اعلان‌ها و هشدارها
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="text-xs text-carpet-crimson dark:text-amber-400 hover:underline font-semibold"
            >
              خواندن همه
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-10 text-sm text-slate-500">
              در حال بارگذاری اعلان‌ها...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500/50" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                اعلان جدیدی وجود ندارد
              </p>
              <p className="text-xs mt-1">تمامی پیگیری‌ها و وظایف به‌روز هستند.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  notif.isRead
                    ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800"
                    : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400">
                        {formatPersianRelativeTime(notif.createdAt)}
                      </span>
                      {notif.linkUrl && (
                        <Link
                          href={notif.linkUrl}
                          onClick={onClose}
                          className="text-[11px] font-bold text-carpet-crimson dark:text-amber-400 hover:underline"
                        >
                          مشاهده جزئیات ←
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
