"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Download,
  Phone,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Edit,
  Trash2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Crown,
  Repeat,
  Compass,
  ArrowUpDown,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  formatToman,
  toPersianDigits,
  formatJalaliDate,
  IRANIAN_PROVINCES,
} from "@/lib/persian";
import { getCustomerSegmentConfig } from "@/lib/customer-intelligence";

const SEGMENT_FILTERS = [
  { key: "", label: "همه مشتریان" },
  { key: "HOT", label: "🔥 داغ (آماده خرید)" },
  { key: "HIGH_VALUE", label: "⭐ VIP / خرید کلان" },
  { key: "REPEAT_BUYER", label: "💎 خریدار مکرر" },
  { key: "AT_RISK", label: "⚠️ در معرض ریسک" },
  { key: "NEW", label: "🌱 مشتری جدید" },
  { key: "WARM", label: "مشتریان گرم" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [activeSegment, setActiveSegment] = useState("");
  const [sortBy, setSortBy] = useState("score_desc");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Customer State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    phone: "",
    province: "تهران",
    city: "تهران",
    address: "",
    notes: "",
  });

  // Delete Customer State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    province: "تهران",
    city: "تهران",
    address: "",
    preferredSizes: ["3x4"],
    preferredShane: "1200",
    preferredColors: ["سرمه‌ای"],
    notes: "",
  });

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedProvince) params.append("province", selectedProvince);
      if (activeSegment) params.append("segment", activeSegment);
      if (sortBy) params.append("sort", sortBy);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [selectedProvince, activeSegment, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        loadCustomers();
        setFormData({
          firstName: "",
          lastName: "",
          phone: "",
          province: "تهران",
          city: "تهران",
          address: "",
          preferredSizes: ["3x4"],
          preferredShane: "1200",
          preferredColors: ["سرمه‌ای"],
          notes: "",
        });
      } else {
        alert(data.error || "خطا در ثبت مشتری");
      }
    } catch (err) {
      alert("خطا در ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/customers/${editFormData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        loadCustomers();
      } else {
        alert(data.error || "خطا در ویرایش مشتری");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
        loadCustomers();
      } else {
        alert(data.error || "خطا در حذف مشتری");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const openEdit = (c: any) => {
    setEditFormData({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      province: c.province || "تهران",
      city: c.city || "تهران",
      address: c.address || "",
      notes: c.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const openDelete = (c: any) => {
    setCustomerToDelete(c);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            <span>هوشمندی و پرونده ۳۶۰ مشتریان (Customer Intelligence)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ارزیابی هوشمند امتیاز تعامل، دسته‌بندی رفتاری، تحلیل ریسک و پیشنهاد اقدام بعدی فروش
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a href="/api/excel/export?type=customers" download>
            <Button variant="outline" size="md">
              <Download className="w-4 h-4 ml-1.5" />
              <span>خروجی اکسل</span>
            </Button>
          </a>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-md shadow-sky-600/25"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            <span>ثبت مشتری جدید</span>
          </Button>
        </div>
      </div>

      {/* Segment Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SEGMENT_FILTERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSegment(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeSegment === tab.key
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-sky-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Sorting Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی نام مشتری، کد، تلفن همراه، استان، شهر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] pr-10 pl-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:border-sky-600"
              />
            </div>
            <Button type="submit" variant="secondary" size="md">
              جستجو
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none flex-1 sm:flex-initial"
            >
              <option value="">همه استان‌ها</option>
              {IRANIAN_PROVINCES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none flex-1 sm:flex-initial"
            >
              <option value="score_desc">مرتب‌سازی: بالاترین امتیاز هوشمندی</option>
              <option value="spent_desc">مرتب‌سازی: بیشترین حجم خرید</option>
              <option value="created_desc">مرتب‌سازی: جدیدترین ثبت‌نام</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Customers Table with Customer Intelligence */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال بارگذاری و ارزیابی هوشمندی مشتریان...
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-40 text-sky-600" />
            <p className="font-bold text-slate-700 dark:text-slate-300">مشتری‌ای مطابق با فیلترها یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-sky-50/70 dark:bg-slate-800/80 border-b border-sky-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-4">امتیاز هوشمندی</th>
                  <th className="p-4">کد و نام مشتری</th>
                  <th className="p-4">دسته‌بندی و وضعیت</th>
                  <th className="p-4">حجم خرید / مانده بدهی</th>
                  <th className="p-4">اقدام پیشنهادی بعدی (Next Best Action)</th>
                  <th className="p-4">کارشناس و آخرین تعامل</th>
                  <th className="p-4 text-center">پرونده و عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {customers.map((c) => {
                  const intel = c.intelligence || {};
                  const segmentCfg = getCustomerSegmentConfig(intel.segment || "WARM");
                  const score = intel.score || 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Intelligence Score */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                              score >= 75
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300"
                                : score >= 50
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {toPersianDigits(score)}
                          </div>
                          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                        </div>
                      </td>

                      {/* Code & Name */}
                      <td className="p-4">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                            {c.code} • {toPersianDigits(c.phone)}
                          </span>
                        </div>
                      </td>

                      {/* Segment Badge */}
                      <td className="p-4">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${segmentCfg.badgeClass}`}
                          >
                            {segmentCfg.label}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            {c.province}، {c.city}
                          </span>
                        </div>
                      </td>

                      {/* Financial Value */}
                      <td className="p-4 text-xs">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            خرید: {formatToman(intel.totalSpent || 0)}
                          </span>
                          {intel.totalRemainingBalance > 0 ? (
                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              مانده اقساط: {formatToman(intel.totalRemainingBalance)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-600">تسویه کامل</span>
                          )}
                        </div>
                      </td>

                      {/* Next Best Action */}
                      <td className="p-4 max-w-xs">
                        {intel.nextBestAction ? (
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-[11px]">
                            <div className="flex items-center gap-1 font-bold text-sky-700 dark:text-sky-300">
                              <Zap className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              <span>{intel.nextBestAction.action}</span>
                            </div>
                            <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1">
                              {intel.nextBestAction.reason}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Rep & Interaction */}
                      <td className="p-4 text-xs">
                        <div>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold block">
                            {c.assignedTo?.name || "تعیین‌نشده"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {intel.daysSinceLastInteraction !== null
                              ? `${toPersianDigits(intel.daysSinceLastInteraction)} روز پیش`
                              : "بدون سابقه"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/customers/${c.id}`}>
                            <Button variant="primary" size="sm" className="text-xs">
                              <span>پرونده ۳۶۰</span>
                              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            </Button>
                          </Link>
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="ویرایش مشتری"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDelete(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="حذف مشتری"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Create Customer */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ثبت مشتری جدید در سامانه فرش یاشار"
        subtitle="اطلاعات هویتی و ترجیحات فرش مشتری را تکمیل نمایید"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="نام"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="نام خانوادگی"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
            <Input
              label="شماره تلفن همراه"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="09123456789"
            />
            <Select
              label="استان"
              options={IRANIAN_PROVINCES.map((p) => ({ value: p.name, label: p.name }))}
              value={formData.province}
              onChange={(e) => {
                const prov = IRANIAN_PROVINCES.find((p) => p.name === e.target.value);
                setFormData({
                  ...formData,
                  province: e.target.value,
                  city: prov ? prov.cities[0] : "",
                });
              }}
            />
            <Input
              label="شهر"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="آدرس پستی تحویل فرش"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <Input
            label="یادداشت‌ها و توضیحات سلیقه مشتری"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت مشتری
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Customer */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش مشخصات مشتری"
        subtitle="به‌روزرسانی اطلاعات فردی و آدرس مشتری"
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
            label="آدرس تحویل"
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
      {customerToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="تایید حذف مشتری"
          subtitle={`آیا از حذف مشتری "${customerToDelete.firstName} ${customerToDelete.lastName}" اطمینان دارید؟`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                هشدار: با حذف این مشتری، تمامی پرونده نیازسنجی، سوابق فاکتورها و اقساط ثبت‌شده حذف خواهند شد.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                انصراف
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteCustomer}>
                حذف قطعی مشتری
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
