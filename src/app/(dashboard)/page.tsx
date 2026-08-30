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
  CreditCard,
  Zap,
  BarChart3,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatToman, toPersianDigits, formatJalaliDate } from "@/lib/persian";
import { getCustomerSegmentConfig } from "@/lib/customer-intelligence";

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
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const funnelStages = data?.funnelStages || [];
  const highValueOpportunities = data?.highValueOpportunities || [];
  const atRiskCustomers = data?.atRiskCustomers || [];
  const todayFollowUps = data?.todayFollowUps || [];
  const overdueInstallments = data?.overdueInstallmentsList || [];
  const topCarpets = data?.topCarpetDetails || [];
  const leaderboard = data?.leaderboard || [];

  return (
    <div className="space-y-8">
      {/* Welcome & Command Center Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-900 via-sky-800 to-sky-700 text-white shadow-xl shadow-sky-800/20 overflow-hidden border border-sky-800">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-sky-100 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرکز فرماندهی فروش فرش یاشار (CEO Command Center)</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold">
              دیده‌بان جامع عملکرد و مانیتورینگ بلادرنگ فروش
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 mt-1">
              امروز {toPersianDigits(todayFollowUps.length)} پیگیری مقرر،{" "}
              {toPersianDigits(kpis.hotLeadsCount)} لید داغ و{" "}
              {toPersianDigits(atRiskCustomers.length)} مشتری نیازمند توجه در سیستم شناسایی شد.
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

      {/* Executive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Won Sales */}
        <Card className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              فروش کل تحقق‌یافته
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
              فروش ماه جاری: {formatToman(kpis.salesThisMonth || 0)}
            </p>
          </div>
        </Card>

        {/* Active Pipeline & Weighted Value */}
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
              ارزش وزنی با احتمال وقوع: {formatToman(kpis.weightedPipelineValue || 0)}
            </p>
          </div>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              مانده مطالبات اقساط و چک‌ها
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatToman(kpis.totalOutstandingReceivables || 0)}
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
              {toPersianDigits(kpis.overdueInstallmentsCount || 0)} قسط معوقه (
              {formatToman(kpis.overdueInstallmentsAmount || 0)})
            </p>
          </div>
        </Card>

        {/* Conversion Rate & Overdue SLA */}
        <Card className="p-5" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              نرخ تبدیل و سلامت پیگیری
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(kpis.conversionRate)}٪{" "}
              <span className="text-sm font-medium text-slate-400">تبدیل سرنخ</span>
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-1">
              {toPersianDigits(kpis.overdueFollowUps)} وظیفه معوقه نیازمند اقدام
            </p>
          </div>
        </Card>
      </div>

      {/* Row 2: Sales Funnel & High-Value Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Sales Funnel */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                قیف فروش و وضعیت مراحل پایپ‌لاین
              </h3>
            </div>
            <Link
              href="/pipeline"
              className="text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline"
            >
              نمای کانبان پایپ‌لاین ←
            </Link>
          </div>

          <div className="space-y-4">
            {funnelStages.map((st: any) => {
              const maxCount = Math.max(...funnelStages.map((s: any) => s.count), 1);
              const percentage = Math.round((st.count / maxCount) * 100);

              return (
                <div key={st.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200">
                      {st.stage} ({toPersianDigits(st.count)} مورد)
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-mono">
                      {formatToman(st.totalValue)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        st.key === "WON"
                          ? "bg-emerald-500"
                          : st.key === "LOST"
                          ? "bg-rose-400"
                          : st.key === "NEGOTIATION"
                          ? "bg-amber-500"
                          : "bg-sky-500"
                      }`}
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* High-Value Opportunities */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                معاملات کلان و طلایی
              </h3>
            </div>
            <span className="text-xs text-amber-600 font-bold">ارزش بالای ۲۰ م.ت</span>
          </div>

          <div className="space-y-3">
            {highValueOpportunities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                معامله کلان بازی در حال حاضر ثبت نشده است.
              </p>
            ) : (
              highValueOpportunities.map((opp: any) => (
                <div
                  key={opp.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {opp.title}
                    </span>
                    <Badge variant="gold" size="sm">
                      {opp.stage}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      مشتری: {opp.customer?.firstName} {opp.customer?.lastName}
                    </span>
                    <span className="font-black text-sky-600 dark:text-sky-400">
                      {formatToman(opp.value)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: At-Risk Customers & Sales Reps Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* At-Risk Accounts */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                مشتریان در معرض ریسک و نیازمند اقدام فوری
              </h3>
            </div>
            <Link
              href="/customers?segment=AT_RISK"
              className="text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline"
            >
              مشاهده همه ←
            </Link>
          </div>

          <div className="space-y-3">
            {atRiskCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                مشتری در معرض ریسک حادی یافت نشد.
              </p>
            ) : (
              atRiskCustomers.map((cust: any) => (
                <div
                  key={cust.id}
                  className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/customers/${cust.id}`}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-sky-600"
                      >
                        {cust.name} ({cust.code})
                      </Link>
                      <Badge variant="danger" size="sm">
                        امتیاز {toPersianDigits(cust.score)}
                      </Badge>
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-1 font-semibold">
                      علت ریسک: {cust.reason}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      کارشناس: {cust.assignedTo} • اقدام پیشنهادی: {cust.nextBestAction?.action}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${cust.id}`}>
                      <Button variant="primary" size="sm">
                        <span>ورود به پرونده</span>
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Sales Reps Performance */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              ماتریس عملکرد کارشناسان فروش
            </h3>
          </div>

          <div className="space-y-3">
            {leaderboard.map((rep: any, idx: number) => (
              <div
                key={rep.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        idx === 0
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {toPersianDigits(idx + 1)}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {rep.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {formatToman(rep.totalSales)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <span>{toPersianDigits(rep.leadsCount)} لید • نرخ تبدیل: {toPersianDigits(rep.conversionRate)}٪</span>
                  <span>{toPersianDigits(rep.completedFollowUps)} پیگیری موفق</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
