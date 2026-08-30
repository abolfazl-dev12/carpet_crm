"use client";

import React, { useState, useEffect } from "react";
import { Bell, Flame, AlertTriangle, CreditCard, Package, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPersianRelativeTime } from "@/lib/persian";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PUT" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "HOT_LEAD":
        return <Flame className="w-5 h-5 text-rose-500" />;
      case "OVERDUE_ALERT":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "PAYMENT_DUE":
        return <CreditCard className="w-5 h-5 text-indigo-500" />;
      case "LOW_STOCK":
        return <Package className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-carpet-crimson" />
            <span>مرکز اعلان‌ها و هشدارهای اتوماسیون (Notification Hub)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            هشدارهای آنی لیدهای داغ، پیگیری‌های عقب‌افتاده و سررسید چک‌های مشتریان
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={markAllRead}>
          <Check className="w-4 h-4 ml-1.5" />
          <span>خواندن همه اعلان‌ها</span>
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال بارگذاری اعلان‌ها...
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-slate-700 dark:text-slate-300">اعلان جدیدی ثبت نشده است.</p>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 sm:p-5 transition-all ${
                n.isRead
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
                  : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm flex-shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {n.title}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {formatPersianRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
