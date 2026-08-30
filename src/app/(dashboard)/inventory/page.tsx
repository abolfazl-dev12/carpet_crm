"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  ArrowDownUp,
  History,
  AlertTriangle,
  CheckCircle2,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  formatToman,
  toPersianDigits,
  formatJalaliDate,
  formatCarpetSize,
} from "@/lib/persian";

export default function InventoryPage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"STOCK" | "MOVEMENTS">("STOCK");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [movementType, setMovementType] = useState("PURCHASE");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.variants) setVariants(data.variants);
      if (data.movements) setMovements(data.movements);
    } catch (err) {
      console.error("Error loading inventory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          type: movementType,
          quantity: Number(quantity),
          reason,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setReason("");
        loadInventory();
      } else {
        alert("خطا در ثبت عملیات انبار");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-carpet-crimson" />
            <span>مدیریت موجودی و گردش انبار فرش (Inventory)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            کنترل لحظه‌ای موجودی آزاد، رزروهای فعال، ثبت ورود، مرجوعی و اصلاحیه‌های انبار
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("STOCK")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "STOCK"
              ? "bg-carpet-crimson text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          موجودی کالاها به تفکیک سایز
        </button>
        <button
          onClick={() => setActiveTab("MOVEMENTS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "MOVEMENTS"
              ? "bg-carpet-crimson text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          سابقه گردش و اسناد جابجایی ({toPersianDigits(movements.length)})
        </button>
      </div>

      {/* Content */}
      {activeTab === "STOCK" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-carpet-cream dark:bg-slate-800/80 border-b text-xs font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-4">نام طرح و فرش</th>
                  <th className="p-4">کد انبار (SKU)</th>
                  <th className="p-4">سایز</th>
                  <th className="p-4">موجودی کل</th>
                  <th className="p-4">رزرو شده</th>
                  <th className="p-4">فروخته شده</th>
                  <th className="p-4">موجودی آزاد</th>
                  <th className="p-4 text-center">عملیات انبار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {variants.map((v) => {
                  const available = v.stock - v.reservedStock;
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {v.product?.name}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">{v.sku}</td>
                      <td className="p-4 text-xs font-semibold">{formatCarpetSize(v.size)}</td>
                      <td className="p-4 font-bold">{toPersianDigits(v.stock)}</td>
                      <td className="p-4 text-amber-600 font-bold">{toPersianDigits(v.reservedStock)}</td>
                      <td className="p-4 text-slate-500">{toPersianDigits(v.soldStock)}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            available > 2
                              ? "success"
                              : available > 0
                              ? "warning"
                              : "danger"
                          }
                          size="sm"
                        >
                          {toPersianDigits(available)} تخته
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVariant(v);
                            setIsModalOpen(true);
                          }}
                        >
                          <ArrowDownUp className="w-3.5 h-3.5 ml-1" />
                          <span>تغییر موجودی</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-carpet-cream dark:bg-slate-800/80 border-b text-xs font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-4">کالا و سایز</th>
                  <th className="p-4">نوع عملیات</th>
                  <th className="p-4">تعداد</th>
                  <th className="p-4">موجودی قبلی → جدید</th>
                  <th className="p-4">دلیل و شرح سند</th>
                  <th className="p-4">کاربر ثبت‌کننده</th>
                  <th className="p-4">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {m.variant?.product?.name} ({m.variant?.size})
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          m.type === "PURCHASE" || m.type === "RETURN"
                            ? "success"
                            : m.type === "SALE"
                            ? "danger"
                            : "warning"
                        }
                        size="sm"
                      >
                        {m.type === "PURCHASE"
                          ? "ورود از بافندگی"
                          : m.type === "SALE"
                          ? "خروج فروش"
                          : m.type === "RESERVATION"
                          ? "رزرو مشتری"
                          : m.type === "RETURN"
                          ? "مرجوعی"
                          : "اصلاح انبارگردانی"}
                      </Badge>
                    </td>
                    <td className="p-4 font-black">{toPersianDigits(m.quantity)}</td>
                    <td className="p-4 text-xs font-mono">
                      {toPersianDigits(m.previousStock)} ← {toPersianDigits(m.newStock)}
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-300">
                      {m.reason}
                    </td>
                    <td className="p-4 text-xs text-slate-500">{m.user?.name || "-"}</td>
                    <td className="p-4 text-xs text-slate-400">
                      {formatJalaliDate(m.createdAt, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Adjust Inventory */}
      {selectedVariant && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="ثبت سند گردش انبار"
          subtitle={`${selectedVariant.product?.name} - ابعاد ${selectedVariant.size}`}
        >
          <form onSubmit={handleCreateMovement} className="space-y-4">
            <Select
              label="نوع عملیات انبارداری"
              options={[
                { value: "PURCHASE", label: "ورود بار جدید از کارخانه بافندگی" },
                { value: "SALE", label: "خروج کالا برای تحویل به مشتری" },
                { value: "RESERVATION", label: "رزرو موقت برای مشتری" },
                { value: "RELEASE_RESERVATION", label: "آزادسازی رزرو موقت" },
                { value: "RETURN", label: "مرجوعی و بازگشت به انبار" },
                { value: "ADJUSTMENT", label: "اصلاح و شمارش انبارگردانی" },
              ]}
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            />

            <Input
              label="تعداد تخته"
              type="number"
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />

            <Input
              label="دلیل و شماره سند / حواله"
              required
              placeholder="مثال: حواله بارگیری شماره ۹۹۸۵ کارخانه کاشان"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" variant="primary">
                ثبت در انبار
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
