"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
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
} from "@/lib/persian";

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentTracking, setPaymentTracking] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [notes, setNotes] = useState("");

  const loadInstallments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/installments?${params.toString()}`);
      const data = await res.json();
      if (data.installments) setInstallments(data.installments);
    } catch (err) {
      console.error("Error loading installments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInstallments();
  }, [statusFilter]);

  const handlePayInstallment = async () => {
    if (!selectedInst) return;

    try {
      const res = await fetch("/api/installments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedInst.id,
          status: "PAID",
          paymentTracking,
          chequeNumber,
          notes,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadInstallments();
      } else {
        alert("خطا در ثبت وصولی قسط");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-carpet-crimson" />
            <span>دفترچه اقساط و سررسید چک‌های مشتریان</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            پیگیری زمان‌بندی وصول اقساط، شماره چک‌های صیادی و ثبت خودکار وصولی در حسابداری
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING">در انتظار سررسید</option>
          <option value="PAID">وصول‌شده (پرداخت‌شده)</option>
          <option value="OVERDUE">معوق و سررسیدگذشته</option>
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال بارگذاری دفترچه اقساط...
          </div>
        ) : installments.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-40 text-carpet-crimson" />
            <p className="font-bold text-slate-700 dark:text-slate-300">موردی یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-carpet-cream dark:bg-slate-800/80 border-b text-xs font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-4">شماره قسط</th>
                  <th className="p-4">فاکتور و خریدار</th>
                  <th className="p-4">مبلغ قسط</th>
                  <th className="p-4">موعد سررسید</th>
                  <th className="p-4">شماره چک صیادی</th>
                  <th className="p-4">وضعیت</th>
                  <th className="p-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {installments.map((inst) => (
                  <tr
                    key={inst.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      قسط {toPersianDigits(inst.installmentNumber)}
                    </td>
                    <td className="p-4 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {inst.order?.customer?.firstName} {inst.order?.customer?.lastName}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {inst.order?.orderNumber}
                      </span>
                    </td>
                    <td className="p-4 font-black text-xs text-slate-900 dark:text-white">
                      {formatToman(inst.amount)}
                    </td>
                    <td className="p-4 font-bold text-xs text-carpet-crimson dark:text-amber-400">
                      {formatJalaliDate(inst.dueDate)}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {inst.chequeNumber || "-"}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          inst.status === "PAID"
                            ? "success"
                            : inst.status === "OVERDUE"
                            ? "danger"
                            : "gold"
                        }
                        size="sm"
                      >
                        {inst.status === "PAID"
                          ? "وصول‌شده"
                          : inst.status === "OVERDUE"
                          ? "معوق"
                          : "در انتظار سررسید"}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      {inst.status !== "PAID" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedInst(inst);
                            setChequeNumber(inst.chequeNumber || "");
                            setIsModalOpen(true);
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                          <span>ثبت وصول</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Confirm Payment */}
      {selectedInst && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="ثبت وصولی قسط و تسویه چک"
          subtitle={`قسط شماره ${toPersianDigits(selectedInst.installmentNumber)} - مبلغ ${formatToman(selectedInst.amount)}`}
        >
          <div className="space-y-4">
            <Input
              label="شماره پیگیری پرداخت یا کد صیادی"
              value={paymentTracking}
              onChange={(e) => setPaymentTracking(e.target.value)}
              placeholder="مثال: ۷۷۸۸۹۹۲۱ یا رسید پوز"
            />
            <Input
              label="شماره سریال چک"
              value={chequeNumber}
              onChange={(e) => setChequeNumber(e.target.value)}
            />
            <Input
              label="یادداشت واریز"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="primary" onClick={handlePayInstallment}>
                تایید وصولی و به‌روزرسانی فاکتور
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
