"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  Target,
  Flame,
  Clock,
  CalendarCheck,
  Award,
  Sparkles,
  ArrowUpRight,
  Phone,
  Layers,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatToman, toPersianDigits, formatJalaliDate } from "@/lib/persian";
import { FOLLOWUP_TYPE_LABELS } from "@/types";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.error("Failed to load dashboard:", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const todayFollowUps = data?.todayFollowUps || [];
  const hotLeads = data?.hotLeads || [];
  const topCarpets = data?.topCarpetDetails || [];
  const leaderboard = data?.leaderboard || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-800 via-sky-600 to-sky-500 text-white shadow-xl shadow-sky-600/20 overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-sky-100 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>میز کار هوشمند فروش فرش یاشار</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold">
              سلام، روز کاری پرفروشی داشته باشید!
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 mt-1">
              امروز {toPersianDigits(todayFollowUps.length)} پیگیری زمان‌بندی‌شده و{" "}
              {toPersianDigits(kpis.hotLeadsCount)} لید داغ آماده عقد قرارداد در فرش یاشار دارید.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/leads">
              <Button variant="secondary" size="md" className="font-bold text-xs sm:text-sm">
                <span>ثبت لید جدید</span>
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </Link>
            <Link href="/recommendation">
              <Button variant="gold" size="md" className="font-bold text-xs sm:text-sm">
                <span>پیشنهاد هوشمند فرش</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Won Sales */}
        <Card className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              فروش موفق کل
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatToman(kpis.totalWonRevenue)}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {toPersianDigits(kpis.wonDealsCount)} معامله نهایی‌شده
            </p>
          </div>
        </Card>

        {/* Active Pipeline Value */}
        <Card className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ارزش معاملات باز پایپ‌لاین
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatToman(kpis.openPipelineValue)}
            </p>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-1">
              در حال مذاکره و پیش‌فاکتور
            </p>
          </div>
        </Card>

        {/* Hot Leads */}
        <Card className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              لیدهای داغ (آماده خرید)
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(kpis.hotLeadsCount)} <span className="text-sm font-medium">مورد</span>
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
              نرخ تبدیل کلی: {toPersianDigits(kpis.conversionRate)}٪
            </p>
          </div>
        </Card>

        {/* Overdue Follow-ups */}
        <Card className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              پیگیری‌های عقب‌افتاده
            </span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(kpis.overdueFollowUps)} <span className="text-sm font-medium">وظیفه</span>
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-1">
              نیازمند اقدام فوری کارشناسان
            </p>
          </div>
        </Card>
      </div>

      {/* Main Two-Column Workflow Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Hot Leads & Today's Follow-ups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hot Leads Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  فرصت‌های داغ فروش (نیاز به اقدام سریع)
                </h3>
              </div>
              <Link
                href="/leads?temperature=HOT"
                className="text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline"
              >
                مشاهده همه ({toPersianDigits(kpis.hotLeadsCount)})
              </Link>
            </div>

            <div className="space-y-3">
              {hotLeads.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  در حال حاضر لید داغی ثبت نشده است.
                </p>
              ) : (
                hotLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-sky-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <Badge variant="danger" size="sm">
                          امتیاز {toPersianDigits(lead.score)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {toPersianDigits(lead.phone)} • {lead.city} • بودجه:{" "}
                        {formatToman(lead.estimatedBudget)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/leads`}>
                        <Button variant="outline" size="sm">
                          مشاهده پرونده
                        </Button>
                      </Link>
                      <a href={`tel:${lead.phone}`}>
                        <Button variant="primary" size="sm">
                          <Phone className="w-3.5 h-3.5" />
                          <span>تماس سریع</span>
                        </Button>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Today's Tasks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  پیگیری‌های برنامه‌ریزی‌شده امروز
                </h3>
              </div>
              <Link
                href="/followups"
                className="text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline"
              >
                تقویم کامل پیگیری‌ها
              </Link>
            </div>

            <div className="space-y-3">
              {todayFollowUps.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  امروز وظیفه پیگیری ثبت نشده است.
                </p>
              ) : (
                todayFollowUps.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        مشتری/لید: {task.lead?.firstName || task.customer?.firstName}{" "}
                        {task.lead?.lastName || task.customer?.lastName} • ساعت:{" "}
                        {formatJalaliDate(task.scheduledAt, true)}
                      </p>
                    </div>

                    <Link href="/followups">
                      <Button variant="outline" size="sm">
                        ثبت نتیجه
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Reps Leaderboard & Top Products */}
        <div className="space-y-6">
          {/* Sales Leaderboard */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                رتبه‌بندی کارشناسان فروش یاشار
              </h3>
            </div>

            <div className="space-y-3">
              {leaderboard.map((rep: any, idx: number) => (
                <div
                  key={rep.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? "bg-sky-500 text-white"
                          : idx === 1
                          ? "bg-slate-300 text-slate-900"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {toPersianDigits(idx + 1)}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {rep.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {toPersianDigits(rep.leadsCount)} لید • تبدیل: {toPersianDigits(rep.conversionRate)}٪
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {formatToman(rep.totalSales)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Selling Carpets */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                پرفروش‌ترین طرح‌های فرش یاشار
              </h3>
            </div>

            <div className="space-y-3">
              {topCarpets.map((c: any, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {c.productName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      کد {c.code} • ابعاد {c.size}
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 block">
                      {toPersianDigits(c.soldCount)} تخته
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatToman(c.totalRevenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
