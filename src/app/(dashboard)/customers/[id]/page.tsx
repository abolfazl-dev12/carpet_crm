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
import { FOLLOWUP_TYPE_LABELS } from "@/types";

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="md:col-span-2 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
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
  const preferredSizes = needProfile?.preferredSizes
    ? JSON.parse(needProfile.preferredSizes)
    : [];
  const preferredColors = needProfile?.preferredColors
    ? JSON.parse(needProfile.preferredColors)
    : [];

  const totalSpent = customer.orders?.reduce(
    (sum: number, o: any) => sum + (o.finalAmount || 0),
    0
  ) || 0;

  return (
    <div className="space-y-8">
      {/* Header Profile Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-carpet-navy text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-carpet-crimson to-amber-600 flex items-center justify-center font-black text-2xl text-white shadow-lg flex-shrink-0">
            {customer.firstName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {customer.firstName} {customer.lastName}
              </h1>
              <Badge variant="gold" size="sm">
                {customer.code}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                {toPersianDigits(customer.phone)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-carpet-crimson-light" />
                {customer.province}، {customer.city}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-slate-700"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="w-4 h-4 ml-1.5" />
            <span>ویرایش مشخصات</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-rose-400 border-rose-800 hover:bg-rose-950/40"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="w-4 h-4 ml-1.5" />
            <span>حذف مشتری</span>
          </Button>

          <a href={`tel:${customer.phone}`}>
            <Button variant="primary" size="md">
              <Phone className="w-4 h-4 ml-1.5" />
              <span>تماس مستقیم</span>
            </Button>
          </a>
        </div>
      </div>

      {/* 3-Column Layout: Overview & Needs vs Orders Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Carpet Need Profile & Address */}
        <div className="space-y-6">
          {/* Carpet Need Profile */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-carpet-gold" />
              <span>پروفایل نیازسنجی تخصصی فرش</span>
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
                    {toPersianDigits(needProfile.preferredShane)} شانه /{" "}
                    {toPersianDigits(needProfile.preferredDensity)} تراکم
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">تم رنگی مورد علاقه:</span>
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
                  <span className="text-slate-500">روش پرداخت:</span>
                  <span className="font-bold text-emerald-600">
                    {needProfile.paymentPreference === "INSTALLMENT"
                      ? "اقساطی / چکی"
                      : "تسویه نقدی"}
                  </span>
                </div>
                {needProfile.spaceType && (
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">نوع فضا:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {needProfile.spaceType}
                    </span>
                  </div>
                )}
                {needProfile.notes && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-1">یادداشت سلیقه مشتری:</span>
                    <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {needProfile.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                پروفایل نیازسنجی هنوز ثبت نشده است.
              </p>
            )}

            <div className="mt-4 pt-4 border-t">
              <Link href="/recommendation">
                <Button variant="gold" size="sm" className="w-full">
                  <Sparkles className="w-3.5 h-3.5 ml-1.5" />
                  <span>تطابق با موجودی انبار</span>
                </Button>
              </Link>
            </div>
          </Card>

          {/* Contact & Address Information */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-carpet-crimson" />
              <span>اطلاعات آدرس و ارسال</span>
            </h3>
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <p>
                <span className="text-slate-400">آدرس دقیق: </span>
                {customer.address || "ثبت نشده"}
              </p>
              <p>
                <span className="text-slate-400">کارشناس مسئول: </span>
                {customer.assignedTo?.name || "تعیین‌نشده"}
              </p>
              <p>
                <span className="text-slate-400">تاریخ عضویت: </span>
                {formatJalaliDate(customer.createdAt)}
              </p>
            </div>
          </Card>
        </div>

        {/* Right 2 Columns: Orders & Invoices and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orders & Invoices List */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  فاکتورها و سوابق خرید ({toPersianDigits(customer.orders?.length || 0)})
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                مجموع خرید: {formatToman(totalSpent)}
              </span>
            </div>

            <div className="space-y-4">
              {customer.orders?.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  هنوز سفارشی برای این مشتری ثبت نشده است.
                </p>
              ) : (
                customer.orders?.map((order: any) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700 pb-3">
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

                    {/* Order Items */}
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

                    {/* Financial Summary */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-700 text-xs">
                      <span className="text-slate-500">مبلغ نهایی فاکتور:</span>
                      <span className="font-black text-sm text-carpet-crimson dark:text-amber-400">
                        {formatToman(order.finalAmount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Interaction & Follow-up History */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-carpet-gold" />
              <span>تاریخچه تعاملات و پیگیری‌ها</span>
            </h3>

            <div className="space-y-3">
              {customer.followUps?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  تاریخچه‌ای برای این مشتری ثبت نشده است.
                </p>
              ) : (
                customer.followUps?.map((f: any) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border flex items-center justify-between gap-3 text-xs"
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
            </div>
          </Card>
        </div>
      </div>

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
            label="یادداشت‌ها"
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
