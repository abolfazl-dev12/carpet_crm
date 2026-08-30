"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Printer,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  Truck,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  formatToman,
  toPersianDigits,
  formatJalaliDate,
  formatCarpetSize,
} from "@/lib/persian";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Delete Order State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      const res = await fetch(`/api/orders?id=${orderToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setOrderToDelete(null);
        if (selectedOrder?.id === orderToDelete.id) {
          setIsInvoiceModalOpen(false);
        }
        loadOrders();
      } else {
        alert(data.error || "خطا در حذف سفارش");
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
            <Receipt className="w-6 h-6 text-sky-600" />
            <span>مدیریت سفارش‌ها و فاکتورهای رسمی فرش یاشار</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            صدور پیش‌فاکتور، فاکتور نهایی، چاپ رسمی فرش یاشار و پیگیری وضعیت ارسال مرسولات
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال بارگذاری فاکتورها...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40 text-sky-600" />
            <p className="font-bold text-slate-700 dark:text-slate-300">سفارشی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-sky-50/50 dark:bg-slate-800/80 border-b text-xs font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-4">شماره فاکتور</th>
                  <th className="p-4">خریدار (مشتری)</th>
                  <th className="p-4">اقلام فرش یاشار</th>
                  <th className="p-4">مبلغ نهایی</th>
                  <th className="p-4">وضعیت پرداخت</th>
                  <th className="p-4">کارشناس فروش</th>
                  <th className="p-4">تاریخ ثبت</th>
                  <th className="p-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                      {o.orderNumber}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {o.customer?.firstName} {o.customer?.lastName}
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-300">
                      {o.items?.map((it: any) => `${it.variant?.product?.name} (${toPersianDigits(it.quantity)} تخته)`).join("، ")}
                    </td>
                    <td className="p-4 font-black text-slate-900 dark:text-white text-xs">
                      {formatToman(o.finalAmount)}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          o.status === "PAID"
                            ? "success"
                            : o.status === "CONFIRMED"
                            ? "gold"
                            : "secondary"
                        }
                        size="sm"
                      >
                        {o.status === "PAID"
                          ? "تسویه کامل"
                          : o.paymentMethod === "INSTALLMENT"
                          ? "اقساطی فعال"
                          : "در انتظار پرداخت"}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{o.seller?.name || "-"}</td>
                    <td className="p-4 text-xs text-slate-400">{formatJalaliDate(o.createdAt)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsInvoiceModalOpen(true);
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 ml-1" />
                          <span>مشاهده فاکتور</span>
                        </Button>
                        <button
                          onClick={() => {
                            setOrderToDelete(o);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="حذف سفارش"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Delete Order Confirmation */}
      {orderToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="تایید حذف سفارش"
          subtitle={`آیا از حذف فاکتور "${orderToDelete.orderNumber}" اطمینان دارید؟`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                هشدار: با حذف این سفارش، سوابق اقلام، پرداخت‌ها و جدول اقساط مرتبط با آن حذف خواهند شد.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                انصراف
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteOrder}>
                حذف قطعی سفارش
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Official Printable Invoice */}
      {selectedOrder && (
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title={`فاکتور رسمی فروش: ${selectedOrder.orderNumber}`}
          subtitle={`تاریخ صدور: ${formatJalaliDate(selectedOrder.createdAt)}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-end gap-2 no-print">
              <Button variant="primary" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 ml-1.5" />
                <span>چاپ فاکتور رسمی فرش یاشار</span>
              </Button>
            </div>

            {/* Printable Invoice Container */}
            <div className="printable-invoice p-6 sm:p-8 bg-white border border-slate-300 rounded-2xl text-slate-900 space-y-6">
              {/* Header with Yashar Logo */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.jpg" alt="فرش یاشار" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      کارخانجات و بازرگانی فرش یاشار
                    </h2>
                    <p className="text-xs text-slate-500">
                      شماره ثبت: ۸۸۴۵۲ • شناسه ملی: ۱۰۱۰۰۳۲۱۵۴ • Yashar Carpet
                    </p>
                  </div>
                </div>

                <div className="text-left text-xs space-y-1">
                  <p>
                    <span className="font-bold">شماره فاکتور: </span>
                    <span className="font-mono">{selectedOrder.orderNumber}</span>
                  </p>
                  <p>
                    <span className="font-bold">تاریخ صدور: </span>
                    {formatJalaliDate(selectedOrder.createdAt)}
                  </p>
                </div>
              </div>

              {/* Customer & Seller Specs */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="font-bold text-slate-700 mb-1">مشخصات خریدار:</p>
                  <p>نام: {selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}</p>
                  <p>تلفن همراه: {toPersianDigits(selectedOrder.customer?.phone)}</p>
                  <p>استان و شهر: {selectedOrder.customer?.province}، {selectedOrder.customer?.city}</p>
                  <p>نشانی تحویل: {selectedOrder.shippingAddress || selectedOrder.customer?.address || "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-1">اطلاعات سفارش:</p>
                  <p>کارشناس فروش: {selectedOrder.seller?.name || "واحد فروش مرکزی فرش یاشار"}</p>
                  <p>روش پرداخت: {selectedOrder.paymentMethod === "INSTALLMENT" ? "خرید اقساطی چکی" : "تسویه نقدی"}</p>
                  <p>وضعیت تحویل: باربری اختصاصی فرش یاشار با بسته‌بندی پلمپ کارخانه</p>
                </div>
              </div>

              {/* Table of Items */}
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2.5 border-l border-slate-300 text-center">ردیف</th>
                    <th className="p-2.5 border-l border-slate-300">شرح کالا و مشخصات فنی</th>
                    <th className="p-2.5 border-l border-slate-300">سایز</th>
                    <th className="p-2.5 border-l border-slate-300 text-center">تعداد</th>
                    <th className="p-2.5 border-l border-slate-300">قیمت واحد (تومان)</th>
                    <th className="p-2.5">مبلغ کل (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedOrder.items?.map((it: any, idx: number) => (
                    <tr key={it.id}>
                      <td className="p-2.5 border-l border-slate-300 text-center">{toPersianDigits(idx + 1)}</td>
                      <td className="p-2.5 border-l border-slate-300 font-bold">
                        فرش {it.variant?.product?.name} ({toPersianDigits(it.variant?.product?.shane)} شانه، تراکم {toPersianDigits(it.variant?.product?.density)})
                      </td>
                      <td className="p-2.5 border-l border-slate-300">{formatCarpetSize(it.variant?.size)}</td>
                      <td className="p-2.5 border-l border-slate-300 text-center font-bold">{toPersianDigits(it.quantity)}</td>
                      <td className="p-2.5 border-l border-slate-300">{formatToman(it.unitPrice, false)}</td>
                      <td className="p-2.5 font-bold">{formatToman(it.totalPrice, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Calculation */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex justify-between">
                    <span>جمع کل فاکتور:</span>
                    <span>{formatToman(selectedOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>تخفیف ویژه:</span>
                    <span>{formatToman(selectedOrder.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-900 border-t pt-1.5">
                    <span>مبلغ نهایی قابل پرداخت:</span>
                    <span>{formatToman(selectedOrder.finalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-10 text-center text-xs">
                <div>
                  <p className="font-bold">مهر و امضای کارشناس فروش فرش یاشار</p>
                </div>
                <div>
                  <p className="font-bold">امضا و تایید خریدار</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
