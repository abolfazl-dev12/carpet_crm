"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Clock,
  ArrowRight,
  Plus,
  Receipt,
  CheckCircle2,
  Edit,
  Trash2,
  AlertTriangle,
  Flame,
  Zap,
  Target,
  FileText,
  Activity,
  Layers,
  ChevronLeft,
  ChevronDown,
  Info,
  CalendarClock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  formatToman,
  toPersianDigits,
  formatJalaliDate,
  formatCarpetSize,
} from "@/lib/persian";
import { getCustomerSegmentConfig } from "@/lib/customer-intelligence";
import { readStringArray } from "@/lib/json-fields";

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "TIMELINE" | "RECOMMENDATIONS" | "ORDERS" | "INSTALLMENTS" | "DEALS" | "FOLLOWUPS"
  >("TIMELINE");

  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [selectedProductForDeal, setSelectedProductForDeal] = useState<any>(null);
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealValue, setNewDealValue] = useState("");

  // Edit Customer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    province: "تهران",
    city: "تهران",
    address: "",
    notes: "",
  });

  // Delete Customer Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadProfile = () => {
    if (id) {
      setIsLoading(true);
      fetch(`/api/customers/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.customer) {
            setCustomer(data.customer);
            setIntelligence(data.intelligence);
            setRecommendations(data.recommendations || []);
            setActivityTimeline(data.activityTimeline || []);
            setEditFormData({
              firstName: data.customer.firstName,
              lastName: data.customer.lastName,
              phone: data.customer.phone,
              province: data.customer.province || "تهران",
              city: data.customer.city || "تهران",
              address: data.customer.address || "",
              notes: data.customer.notes || "",
            });
          }
        })
        .catch((err) => console.error("Error loading customer profile:", err))
        .finally(() => setIsLoading(false));
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        loadProfile();
      } else {
        alert(data.error || "خطا در ویرایش مشتری");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        router.push("/customers");
      } else {
        alert(data.error || "خطا در حذف مشتری");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleCreateDealFromRecommendation = (rec: any) => {
    setSelectedProductForDeal(rec);
    setNewDealTitle(`معامله فرش ${rec.product.name} (${rec.matchedVariant.size})`);
    setNewDealValue(String(rec.matchedVariant.cashPrice));
    setIsNewDealModalOpen(true);
  };

  const handleSubmitNewDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDealTitle,
          value: Number(newDealValue),
          customerId: customer.id,
          productId: selectedProductForDeal?.product?.id,
          variantId: selectedProductForDeal?.matchedVariant?.id,
          stage: "PROPOSAL_SENT",
          priority: "HIGH",
        }),
      });
      if (res.ok) {
        setIsNewDealModalOpen(false);
        loadProfile();
        setActiveTab("DEALS");
      } else {
        alert("خطا در ثبت معامله");
      }
    } catch (err) {
      alert("خطا در ارتباط با سرور");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
          مشتری مورد نظر یافت نشد.
        </p>
        <Link href="/customers" className="mt-4 inline-block">
          <Button variant="outline">بازگشت به فهرست مشتریان</Button>
        </Link>
      </div>
    );
  }

  const needProfile = customer.needProfiles?.[0];
  const preferredSizes = readStringArray(needProfile?.preferredSizes);
  const preferredColors = readStringArray(needProfile?.preferredColors);

  const segmentCfg = getCustomerSegmentConfig(intelligence?.segment || "WARM");
  const score = intelligence?.score || 0;
  const nextAction = intelligence?.nextBestAction;

  return (
    <div className="space-y-6">
      {/* Top Banner with Identity & Actions */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-900 via-sky-800 to-sky-700 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-sky-800">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center font-black text-2xl text-white shadow-lg flex-shrink-0">
            {customer.firstName.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {customer.firstName} {customer.lastName}
              </h1>
              <Badge variant="gold" size="sm">
                {customer.code}
              </Badge>
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${segmentCfg.badgeClass}`}
              >
                {segmentCfg.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-sky-100 mt-1 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-emerald-300" />
                {toPersianDigits(customer.phone)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-300" />
                {customer.province}، {customer.city}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-300" />
                کارشناس: {customer.assignedTo?.name || "تعیین‌نشده"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-sky-600 hover:bg-sky-800/60"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="w-4 h-4 ml-1.5" />
            <span>ویرایش</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-rose-300 border-rose-800 hover:bg-rose-950/40"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="w-4 h-4 ml-1.5" />
            <span>حذف</span>
          </Button>

          <a href={`tel:${customer.phone}`}>
            <Button variant="primary" size="md" className="bg-sky-500 hover:bg-sky-600 shadow-md">
              <Phone className="w-4 h-4 ml-1.5" />
              <span>تماس مستقیم</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Customer Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Customer Score */}
        <Card
          className="p-5 cursor-pointer hover:border-sky-400 transition-all"
          onClick={() => setIsScoreModalOpen(true)}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              امتیاز هوشمندی و تعامل
            </span>
            <Info className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(score)}
            </span>
            <span className="text-xs text-slate-400">از ۱۰۰</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                score >= 75
                  ? "bg-rose-500"
                  : score >= 50
                  ? "bg-amber-500"
                  : "bg-slate-400"
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold mt-2">
            مشاهده جزئیات محاسبه امتیاز ←
          </p>
        </Card>

        {/* Total Purchases */}
        <Card className="p-5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
            مجموع خرید تحقق‌یافته
          </span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {formatToman(intelligence?.totalSpent || 0)}
          </p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {toPersianDigits(customer.orders?.length || 0)} فاکتور ثبت‌شده
          </p>
        </Card>

        {/* Remaining Balance */}
        <Card className="p-5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
            مانده بدهی و اقساط
          </span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {formatToman(intelligence?.totalRemainingBalance || 0)}
          </p>
          <p
            className={`text-xs font-semibold mt-1 ${
              intelligence?.hasOverdueInstallment ? "text-rose-600" : "text-slate-500"
            }`}
          >
            {intelligence?.hasOverdueInstallment
              ? "⚠️ دارای قسط معوقه"
              : "وضعیت اقساط منظم"}
          </p>
        </Card>

        {/* Next Best Action Card */}
        <Card className="p-5 bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>اقدام پیشنهادی (Next Best Action)</span>
          </div>
          {nextAction ? (
            <div className="mt-2">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {nextAction.action}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                {nextAction.reason}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2">اقدام فوری وجود ندارد.</p>
          )}
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab("TIMELINE")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "TIMELINE"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>شناسنامه و تایم‌لاین ۳۶۰ درجه</span>
        </button>

        <button
          onClick={() => setActiveTab("RECOMMENDATIONS")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "RECOMMENDATIONS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>پیشنهاد هوشمند فرش ({toPersianDigits(recommendations.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab("ORDERS")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "ORDERS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>فاکتورها ({toPersianDigits(customer.orders?.length || 0)})</span>
        </button>

        <button
          onClick={() => setActiveTab("DEALS")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "DEALS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>معاملات و پایپ‌لاین ({toPersianDigits(customer.deals?.length || 0)})</span>
        </button>

        <button
          onClick={() => setActiveTab("FOLLOWUPS")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "FOLLOWUPS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>سوابق پیگیری ({toPersianDigits(customer.followUps?.length || 0)})</span>
        </button>
      </div>

      {/* Tab 1: Timeline & Need Profile */}
      {activeTab === "TIMELINE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carpet Need Profile */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>پروفایل سلیقه و نیازسنجی فرش</span>
              </h3>

              {needProfile ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">ابعاد مورد نظر:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {preferredSizes.map((s: string) => formatCarpetSize(s)).join("، ") || "نامشخص"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">شانه و تراکم:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {toPersianDigits(needProfile.preferredShane || "-")} شانه /{" "}
                      {toPersianDigits(needProfile.preferredDensity || "-")} تراکم
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">رنگ زمینه:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {preferredColors.join("، ") || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">سبک بافت:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {needProfile.preferredStyle || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">روش پرداخت ترجیحی:</span>
                    <span className="font-bold text-emerald-600">
                      {needProfile.paymentPreference === "INSTALLMENT"
                        ? "فروش اقساطی / چکی"
                        : "تسویه نقدی"}
                    </span>
                  </div>
                  {needProfile.budgetMax && (
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">سقف بودجه:</span>
                      <span className="font-black text-sky-600">
                        {formatToman(needProfile.budgetMax)}
                      </span>
                    </div>
                  )}
                  {needProfile.notes && (
                    <div className="pt-2">
                      <span className="text-slate-500 block mb-1">توضیحات سلیقه:</span>
                      <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {needProfile.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">
                  پروفایل نیازسنجی هنوز تکمیل نشده است.
                </p>
              )}

              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveTab("RECOMMENDATIONS")}
                >
                  <Sparkles className="w-3.5 h-3.5 ml-1.5" />
                  <span>مشاهده فرش‌های پیشنهادی</span>
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>اطلاعات آدرس و ارسال</span>
              </h3>
              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <p>
                  <span className="text-slate-400">آدرس دقیق: </span>
                  {customer.address || "ثبت نشده"}
                </p>
                <p>
                  <span className="text-slate-400">تاریخ افتتاح پرونده: </span>
                  {formatJalaliDate(customer.createdAt)}
                </p>
              </div>
            </Card>
          </div>

          {/* Chronological Activity Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    تایم‌لاین تعاملات و وقایع پرونده ({toPersianDigits(activityTimeline.length)})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">مرتب‌سازی زمانی از جدید به قدیم</span>
              </div>

              <div className="relative border-r-2 border-sky-100 dark:border-slate-800 pr-6 mr-3 space-y-6">
                {activityTimeline.map((ev) => {
                  let iconBg = "bg-sky-500 text-white";
                  if (ev.type === "ORDER") iconBg = "bg-emerald-500 text-white";
                  if (ev.type === "PAYMENT") iconBg = "bg-amber-500 text-white";
                  if (ev.type === "DEAL") iconBg = "bg-sky-600 text-white";
                  if (ev.type === "CUSTOMER_CREATED") iconBg = "bg-slate-700 text-white";

                  return (
                    <div key={ev.id} className="relative">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -right-[33px] top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${iconBg} shadow-md`}
                      >
                        {ev.type === "ORDER" ? (
                          <ShoppingBag className="w-3 h-3" />
                        ) : ev.type === "PAYMENT" ? (
                          <Receipt className="w-3 h-3" />
                        ) : ev.type === "DEAL" ? (
                          <Target className="w-3 h-3" />
                        ) : (
                          <Activity className="w-3 h-3" />
                        )}
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {ev.title}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatJalaliDate(ev.timestamp, true)}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Smart Carpet Recommendations */}
      {activeTab === "RECOMMENDATIONS" && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>پیشنهادات هوشمند منطبق بر سلیقه و بودجه مشتری</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تطابق الگوریتمی ابعاد، شانه، تراکم، رنگ زمینه و موجودی انبار یاشار
              </p>
            </div>
            <Link href="/recommendation">
              <Button variant="outline" size="sm">
                موتور جستجوی پیشرفته فرش
              </Button>
            </Link>
          </div>

          {recommendations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-40 text-amber-500" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                طرح منطبقی با مشخصات فعلی یافت نشد.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendations.map((rec, i) => {
                const p = rec.product;
                const v = rec.matchedVariant;
                const images = readStringArray(p.images);
                const imgUrl = images[0] || "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=400";

                return (
                  <Card
                    key={`${p.id}-${v.id}`}
                    className="overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 hover:border-sky-400 transition-all"
                  >
                    {/* Image & Match Score Badge */}
                    <div className="relative h-44 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={imgUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-black flex items-center gap-1 shadow-lg">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{toPersianDigits(rec.matchScore)}٪ تطابق</span>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <Badge
                          variant={
                            rec.stockStatus === "AVAILABLE"
                              ? "success"
                              : rec.stockStatus === "LOW_STOCK"
                              ? "warning"
                              : "danger"
                          }
                          size="sm"
                        >
                          {rec.stockStatus === "AVAILABLE"
                            ? `موجود (${toPersianDigits(rec.availableStock)} تخته)`
                            : rec.stockStatus === "LOW_STOCK"
                            ? `موجودی اندک (${toPersianDigits(rec.availableStock)})`
                            : "عدم موجودی انبار"}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {p.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          ابعاد: {formatCarpetSize(v.size)} • {toPersianDigits(p.shane)} شانه • رنگ {p.primaryColor}
                        </p>

                        {/* Reasons */}
                        <div className="mt-3 space-y-1">
                          {rec.matchReasons.slice(0, 3).map((r: string, idx: number) => (
                            <p
                              key={idx}
                              className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                              <span>{r}</span>
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-slate-500">قیمت نقدی:</span>
                          <span className="font-black text-sm text-sky-600 dark:text-sky-400">
                            {formatToman(v.cashPrice)}
                          </span>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={() => handleCreateDealFromRecommendation(rec)}
                        >
                          <Target className="w-3.5 h-3.5 ml-1.5" />
                          <span>ثبت معامله بر اساس این طرح</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Orders & Invoices */}
      {activeTab === "ORDERS" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span>فاکتورها و سوابق خرید</span>
            </h3>
            <span className="text-xs font-bold text-emerald-600">
              مجموع: {formatToman(intelligence?.totalSpent || 0)}
            </span>
          </div>

          {customer.orders?.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              فاکتوری برای این مشتری ثبت نشده است.
            </p>
          ) : (
            customer.orders?.map((order: any) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      فاکتور {order.orderNumber}
                    </span>
                    <span className="text-xs text-slate-500 mr-3">
                      {formatJalaliDate(order.createdAt)}
                    </span>
                  </div>
                  <Badge variant="success" size="sm">
                    {order.status === "PAID" ? "تسویه‌شده" : "در حال پرداخت"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {order.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        فرش {item.variant?.product?.name} ({item.variant?.size}) ×{" "}
                        {toPersianDigits(item.quantity)} تخته
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatToman(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-500">مبلغ نهایی فاکتور:</span>
                  <span className="font-black text-sm text-sky-600 dark:text-sky-400">
                    {formatToman(order.finalAmount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Tab 4: Deals & Pipeline */}
      {activeTab === "DEALS" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-sky-600" />
              <span>معاملات و مذاکرات پایپ‌لاین</span>
            </h3>
            <Link href="/pipeline">
              <Button variant="outline" size="sm">
                مشاهده در کانبان
              </Button>
            </Link>
          </div>

          {customer.deals?.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              معامله فعالی در پایپ‌لاین وجود ندارد.
            </p>
          ) : (
            customer.deals?.map((deal: any) => (
              <div
                key={deal.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {deal.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    ارزش معامله: {formatToman(deal.value)} • آخرین به‌روزرسانی:{" "}
                    {formatJalaliDate(deal.updatedAt)}
                  </p>
                </div>
                <Badge variant="secondary" size="md">
                  مرحله: {deal.stage}
                </Badge>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Tab 5: Follow-ups */}
      {activeTab === "FOLLOWUPS" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600" />
              <span>تاریخچه و وظایف پیگیری</span>
            </h3>
            <Link href="/followups">
              <Button variant="outline" size="sm">
                تقویم کامل پیگیری‌ها
              </Button>
            </Link>
          </div>

          {customer.followUps?.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              پیگیری ثبت‌شده‌ای وجود ندارد.
            </p>
          ) : (
            customer.followUps?.map((f: any) => (
              <div
                key={f.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{f.title}</p>
                  {f.resultNote && (
                    <p className="text-slate-600 dark:text-slate-300 mt-1">
                      نتیجه: {f.resultNote}
                    </p>
                  )}
                </div>
                <span className="text-slate-400 flex-shrink-0">
                  {formatJalaliDate(f.scheduledAt)}
                </span>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Modal: Score Explanation Breakdown */}
      <Modal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        title="ارزیابی و تحلیل امتیاز هوشمندی مشتری"
        subtitle={`امتیاز کل: ${toPersianDigits(score)} از ۱۰۰ • دسته‌بندی: ${segmentCfg.label}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            این امتیاز به‌صورت بلادرنگ بر اساس سابقه خرید، معاملات فعال، تعاملات اخیر و خوش‌حسابی اقساط محاسبه شده است:
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {intelligence?.scoreBreakdown?.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border flex items-center justify-between text-xs"
              >
                <span className="text-slate-800 dark:text-slate-200">{item.factor}</span>
                <span
                  className={`font-black text-xs ${
                    item.type === "POS" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {item.points > 0 ? `+${toPersianDigits(item.points)}` : toPersianDigits(item.points)} امتیاز
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button variant="ghost" onClick={() => setIsScoreModalOpen(false)}>
              بستن
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Create Deal from Recommendation */}
      <Modal
        isOpen={isNewDealModalOpen}
        onClose={() => setIsNewDealModalOpen(false)}
        title="ایجاد معامله جدید بر اساس پیشنهاد هوشمند"
        subtitle={selectedProductForDeal?.product?.name}
      >
        <form onSubmit={handleSubmitNewDeal} className="space-y-4">
          <Input
            label="عنوان معامله"
            required
            value={newDealTitle}
            onChange={(e) => setNewDealTitle(e.target.value)}
          />
          <Input
            label="مبلغ معامله (تومان)"
            required
            value={newDealValue}
            onChange={(e) => setNewDealValue(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsNewDealModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت در پایپ‌لاین
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Customer Profile */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش مشخصات مشتری"
        subtitle={`مشتری: ${customer.firstName} ${customer.lastName}`}
      >
        <form onSubmit={handleEditCustomer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="نام"
              required
              value={editFormData.firstName}
              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
            />
            <Input
              label="نام خانوادگی"
              required
              value={editFormData.lastName}
              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="شماره تلفن همراه"
              required
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
            <Input
              label="استان"
              value={editFormData.province}
              onChange={(e) => setEditFormData({ ...editFormData, province: e.target.value })}
            />
          </div>

          <Input
            label="شهر"
            value={editFormData.city}
            onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
          />

          <Input
            label="آدرس تحویل فرش"
            value={editFormData.address}
            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
          />

          <Input
            label="یادداشت"
            value={editFormData.notes}
            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Customer Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="تایید حذف مشتری"
        subtitle={`آیا از حذف پرونده "${customer.firstName} ${customer.lastName}" اطمینان دارید؟`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              هشدار: با حذف این مشتری، پرونده نیازسنجی، سوابق فاکتورها و اقساط ثبت‌شده پاک خواهند شد.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              انصراف
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteCustomer}>
              حذف قطعی پرونده مشتری
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
