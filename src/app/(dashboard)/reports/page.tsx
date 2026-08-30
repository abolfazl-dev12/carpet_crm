"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  MapPin,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatToman, toPersianDigits } from "@/lib/persian";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.error("Error loading reports:", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const monthlyTrends = data?.monthlyTrends || [];
  const salesByCollection = data?.salesByCollection || [];
  const provinceData = data?.provinceData || [];
  const paymentMethodsSplit = data?.paymentMethodsSplit || [];

  const COLORS = ["#991B1B", "#D97706", "#059669", "#3B82F6", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-carpet-crimson" />
          <span>گزارش‌های تحلیلی و هوش تجاری فروش (BI & Analytics)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          تحلیل روند درآمدی ماه‌های گذشته، محبوبیت کلکسیون‌های فرش و پراکندگی جغرافیایی مشتریان
        </p>
      </div>

      {/* Row 1: Monthly Sales Trend & Collections Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <Card className="p-6">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-carpet-crimson" />
            <span>روند فروش و درآمد ماهیانه (میلیون تومان)</span>
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#991B1B" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#991B1B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any) => [`${toPersianDigits(val)} میلیون تومان`, "فروش"]}
                  contentStyle={{ direction: "rtl", borderRadius: "12px", textAlign: "right" }}
                />
                <Area
                  type="monotone"
                  dataKey="فروش_کل"
                  stroke="#991B1B"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Collection */}
        <Card className="p-6">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-carpet-gold" />
            <span>سهم فروش کلکسیون‌های مختلف فرش</span>
          </h3>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByCollection}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salesByCollection.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${toPersianDigits(val)} میلیون تومان`, "ارزش"]}
                  contentStyle={{ direction: "rtl", borderRadius: "12px", textAlign: "right" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2: Top Provinces & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Province Heatmap */}
        <Card className="p-6">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>تراکم تقاضا و فروش بر حسب استان (میلیون تومان)</span>
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provinceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="province" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any) => [`${toPersianDigits(val)} میلیون تومان`, "حجم فروش"]}
                  contentStyle={{ direction: "rtl", borderRadius: "12px", textAlign: "right" }}
                />
                <Bar dataKey="sales" fill="#059669" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment Methods Split */}
        <Card className="p-6">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>تفکیک روش‌های تسویه (اقساطی vs نقدی)</span>
          </h3>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodsSplit}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${toPersianDigits(value)}٪`}
                >
                  {paymentMethodsSplit.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${toPersianDigits(val)} درصد`, "سهم"]}
                  contentStyle={{ direction: "rtl", borderRadius: "12px", textAlign: "right" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
