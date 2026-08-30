"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  formatToman,
  toPersianDigits,
  formatCarpetSize,
} from "@/lib/persian";

export default function RecommendationPage() {
  const [preferredSizes, setPreferredSizes] = useState<string[]>(["3x4"]);
  const [preferredShane, setPreferredShane] = useState("1200");
  const [preferredColors, setPreferredColors] = useState<string[]>(["سرمه‌ای"]);
  const [preferredStyle, setPreferredStyle] = useState("کلاسیک");
  const [budgetMax, setBudgetMax] = useState("50000000");
  const [paymentPreference, setPaymentPreference] = useState<"CASH" | "INSTALLMENT">("CASH");

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredSizes,
          preferredShane,
          preferredColors,
          preferredStyle,
          budgetMax: Number(budgetMax) || null,
          paymentPreference,
        }),
      });

      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error("Match error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-carpet-navy via-slate-900 to-carpet-crimson text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
          <Sparkles className="w-4 h-4" />
          <span>موتور هوشمند تطابق و پیشنهاد فرش</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-black">
          دستیار هوشمند انتخاب و تطابق فرش با نیاز مشتری
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
          الگوریتم تطابق دقیق ابعاد، شانه، تراکم، هارمونی رنگ، سبک چیدمان و سقف بودجه اعلامی مشتری با موجودی آماده تحویل در انبار کارخانه
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs (Left 1 Col) */}
        <Card className="p-6 h-fit">
          <form onSubmit={handleMatch} className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-carpet-crimson" />
              <span>معیارهای نیازسنجی مشتری:</span>
            </h3>

            <Select
              label="ابعاد مورد نیاز"
              options={[
                { value: "3x4", label: "۳×۴ متر (۱۲ متری)" },
                { value: "2.5x3.5", label: "۲.۵×۳.۵ متر (۹ متری)" },
                { value: "2x3", label: "۲×۳ متر (۶ متری)" },
                { value: "1.5x2.25", label: "۱.۵×۲.۲۵ متر (۴ متری)" },
              ]}
              value={preferredSizes[0]}
              onChange={(e) => setPreferredSizes([e.target.value])}
            />

            <Select
              label="شانه مورد نظر"
              options={[
                { value: "1500", label: "۱۵۰۰ شانه (فوق ریزبافت)" },
                { value: "1200", label: "۱۲۰۰ شانه (دستباف‌گونه)" },
                { value: "1000", label: "۱۰۰۰ شانه" },
                { value: "700", label: "۷۰۰ شانه (ضخیم و بادوام)" },
              ]}
              value={preferredShane}
              onChange={(e) => setPreferredShane(e.target.value)}
            />

            <Select
              label="تم رنگی زمینه"
              options={[
                { value: "سرمه‌ای", label: "سرمه‌ای / لاجوردی" },
                { value: "کرم", label: "کرم صدفی / فیلی" },
                { value: "طوسی", label: "طوسی متالیک / دلفینی" },
                { value: "لاکی", label: "لاکی زرشکی / روناسی" },
                { value: "گردویی", label: "گردویی چندرنگ" },
              ]}
              value={preferredColors[0]}
              onChange={(e) => setPreferredColors([e.target.value])}
            />

            <Select
              label="سبک دکوراسیون"
              options={[
                { value: "کلاسیک", label: "کلاسیک ایرانی" },
                { value: "نئوکلاسیک", label: "نئوکلاسیک و طلاکوب" },
                { value: "مدرن", label: "مدرن و وینتیج" },
                { value: "عشایری", label: "عشایری و خشتی" },
              ]}
              value={preferredStyle}
              onChange={(e) => setPreferredStyle(e.target.value)}
            />

            <Input
              label="حداکثر سقف بودجه مشتری (تومان)"
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />

            <Select
              label="روش پرداخت ترجیحی"
              options={[
                { value: "CASH", label: "نقدی با تخفیف نقدی" },
                { value: "INSTALLMENT", label: "خرید اقساطی / چکی" },
              ]}
              value={paymentPreference}
              onChange={(e) => setPaymentPreference(e.target.value as any)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-lg shadow-carpet-crimson/25"
              isLoading={isLoading}
            >
              <Sparkles className="w-4 h-4 ml-2" />
              <span>پردازش و استخراج بهترین پیشنهادها</span>
            </Button>
          </form>
        </Card>

        {/* Results List (Right 2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {!hasSearched ? (
            <Card className="p-12 text-center text-slate-400">
              <Sparkles className="w-16 h-16 mx-auto mb-3 text-carpet-gold opacity-60" />
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base">
                معیارهای مشتری را مشخص کنید
              </h3>
              <p className="text-xs mt-1">
                سپس دکمه پردازش را بزنید تا بهترین تطابق‌ها همراه با درصد همخوانی و موجودی انبار نمایش داده شوند.
              </p>
            </Card>
          ) : isLoading ? (
            <div className="text-center py-20 text-slate-400 text-sm">
              در حال ارزیابی موجودی انبار و محاسبه درصد تطابق...
            </div>
          ) : recommendations.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-rose-500/60" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                موردی با این مشخصات و بودجه یافت نشد.
              </p>
              <p className="text-xs mt-1">سقف بودجه یا سایر معیارها را تغییر دهید.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {toPersianDigits(recommendations.length)} تخته فرش پیشنهادی با بالاترین امتیاز تطابق:
                </span>
              </div>

              {recommendations.map((item, idx) => {
                const prod = item.product;
                const variant = item.matchedVariant;
                const images = prod.images ? JSON.parse(prod.images) : [];
                const coverImage =
                  images[0] ||
                  "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=80";

                return (
                  <Card
                    key={`${prod.id}-${variant.id}`}
                    className="p-4 sm:p-5 overflow-hidden"
                    hoverEffect
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Image Thumbnail */}
                      <div className="w-full sm:w-32 h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverImage}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info & Match Score */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                              {prod.name} ({formatCarpetSize(variant.size)})
                            </h3>
                            <p className="text-xs text-slate-500">
                              کد {prod.code} • {toPersianDigits(prod.shane)} شانه • رنگ {prod.primaryColor}
                            </p>
                          </div>

                          <div className="text-left">
                            <span className="text-base sm:text-lg font-black text-carpet-crimson dark:text-amber-400 block">
                              {item.matchScore}٪ تطابق
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {formatToman(variant.cashPrice)}
                            </span>
                          </div>
                        </div>

                        {/* Match Reasons List */}
                        <div className="space-y-1 pt-1">
                          {item.matchReasons.map((r: string, rIdx: number) => (
                            <p
                              key={rIdx}
                              className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                              <span>{r}</span>
                            </p>
                          ))}
                        </div>

                        {/* Stock & Action */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                          <Badge
                            variant={
                              item.stockStatus === "AVAILABLE"
                                ? "success"
                                : item.stockStatus === "LOW_STOCK"
                                ? "warning"
                                : "danger"
                            }
                            size="sm"
                          >
                            {item.stockStatus === "AVAILABLE"
                              ? `موجود در انبار (${toPersianDigits(variant.stock)} تخته)`
                              : item.stockStatus === "LOW_STOCK"
                              ? `موجودی محدود (${toPersianDigits(variant.stock)} تخته)`
                              : "ناموجود"}
                          </Badge>

                          <Link href="/orders">
                            <Button variant="primary" size="sm">
                              <span>ثبت سفارش و صدور پیش‌فاکتور</span>
                              <ArrowRight className="w-3.5 h-3.5 mr-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
