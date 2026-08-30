"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatJalaliDate, toPersianDigits } from "@/lib/persian";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
      })
      .catch((err) => console.error("Failed to load logs:", err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-carpet-crimson" />
          <span>گزارش رویدادهای امنیتی و ثبت تغییرات (Audit Trail)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          ردیابی تغییرات قیمت، ورود/خروج کاربران، اصلاح موجودی انبار و تغییر وضعیت لیدها
        </p>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال بارگذاری وقایع امنیتی...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-slate-700 dark:text-slate-300">لاگی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-carpet-cream dark:bg-slate-800/80 border-b font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3.5">نوع عملیات</th>
                  <th className="p-3.5">موجودیت (Entity)</th>
                  <th className="p-3.5">کاربر مجری</th>
                  <th className="p-3.5">جزئیات و تغییرات</th>
                  <th className="p-3.5">آدرس IP</th>
                  <th className="p-3.5">تاریخ و ساعت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <Badge
                        variant={
                          log.action === "CREATE"
                            ? "success"
                            : log.action === "DELETE"
                            ? "danger"
                            : log.action === "LOGIN"
                            ? "gold"
                            : "secondary"
                        }
                        size="sm"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {log.entity}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {log.user?.name || "سیستم خودکار"}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {log.details || "-"}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {formatJalaliDate(log.createdAt, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
