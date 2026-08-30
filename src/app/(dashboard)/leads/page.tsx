"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  Plus,
  Search,
  Filter,
  Flame,
  Phone,
  Download,
  CheckCircle,
  MoreVertical,
  Calendar,
  Sparkles,
  ArrowRight,
  UserCheck,
  Edit,
  Trash2,
  AlertTriangle,
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
import { getTemperatureLabel } from "@/lib/scoring";
import { SOURCE_LABELS, STAGE_CONFIG } from "@/types";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTemp, setSelectedTemp] = useState("");
  const [selectedSource, setSelectedSource] = useState("");

  // Create Lead Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Lead Detail Modal
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Edit Lead Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    phone: "",
    province: "تهران",
    city: "تهران",
    source: "INSTAGRAM",
    status: "NEW",
    score: 25,
    estimatedBudget: "30000000",
    purchaseTimeframe: "این ماه",
    notes: "",
  });

  // Delete Lead Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);

  // New Lead Form Data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    province: "تهران",
    city: "تهران",
    source: "INSTAGRAM",
    estimatedBudget: "30000000",
    score: 25,
    preferredSizes: ["3x4"],
    preferredShane: "1200",
    preferredDensity: "3600",
    preferredColors: ["سرمه‌ای"],
    preferredStyle: "کلاسیک",
    paymentPreference: "CASH",
    purchaseTimeframe: "این ماه",
    notes: "",
  });

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedTemp) params.append("temperature", selectedTemp);
      if (selectedSource) params.append("source", selectedSource);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch (err) {
      console.error("Error loading leads:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [selectedTemp, selectedSource]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        loadLeads();
        setFormData({
          firstName: "",
          lastName: "",
          phone: "",
          province: "تهران",
          city: "تهران",
          source: "INSTAGRAM",
          estimatedBudget: "30000000",
          score: 25,
          preferredSizes: ["3x4"],
          preferredShane: "1200",
          preferredDensity: "3600",
          preferredColors: ["سرمه‌ای"],
          preferredStyle: "کلاسیک",
          paymentPreference: "CASH",
          purchaseTimeframe: "این ماه",
          notes: "",
        });
      } else {
        alert(data.error || "خطا در ثبت لید");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/leads/${editFormData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        loadLeads();
      } else {
        alert(data.error || "خطا در ویرایش لید");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    try {
      const res = await fetch(`/api/leads/${leadToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setLeadToDelete(null);
        if (selectedLead?.id === leadToDelete.id) {
          setIsDetailModalOpen(false);
        }
        loadLeads();
      } else {
        alert(data.error || "خطا در حذف لید");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const openEdit = (lead: any) => {
    setEditFormData({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      province: lead.province || "تهران",
      city: lead.city || "تهران",
      source: lead.source,
      status: lead.status,
      score: lead.score,
      estimatedBudget: String(lead.estimatedBudget || "30000000"),
      purchaseTimeframe: lead.purchaseTimeframe || "این ماه",
      notes: lead.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const openDelete = (lead: any) => {
    setLeadToDelete(lead);
    setIsDeleteModalOpen(true);
  };

  const handleConvertToCustomer = async (leadId: string) => {
    if (!confirm("آیا از تبدیل این سرنخ به مشتری رسمی و ایجاد پرونده فروش اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("سرنخ با موفقیت به مشتری تبدیل شد!");
        setIsDetailModalOpen(false);
        loadLeads();
      } else {
        alert(data.error || "خطا در تبدیل لید");
      }
    } catch (err) {
      alert("خطا در تبدیل لید");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-carpet-crimson" />
            <span>مدیریت سرنخ‌های فروش (Leads)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ثبت، امتیازدهی هوشمند، ویرایش، پیگیری و تبدیل سرنخ‌های ورودی به مشتریان قطعی
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a href="/api/excel/export?type=leads" download>
            <Button variant="outline" size="md">
              <Download className="w-4 h-4 ml-1.5" />
              <span>خروجی اکسل</span>
            </Button>
          </a>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-md shadow-carpet-crimson/25"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            <span>ثبت سرنخ جدید</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی نام، تلفن همراه، استان، شهر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] pr-10 pl-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:border-carpet-crimson"
              />
            </div>
            <Button type="submit" variant="secondary" size="md">
              جستجو
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Temperature Filter */}
            <select
              value={selectedTemp}
              onChange={(e) => setSelectedTemp(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="">همه دماها (داغ/گرم/سرد)</option>
              <option value="HOT">🔥 لیدهای داغ (+۵۵)</option>
              <option value="WARM">⚡ لیدهای گرم (۳۵-۵۴)</option>
              <option value="COLD">❄️ لیدهای سرد (۱۵-۳۴)</option>
            </select>

            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="">همه کانال‌های ورودی</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Leads Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال بارگذاری سرنخ‌ها...
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-40 text-carpet-crimson" />
            <p className="font-bold text-slate-700 dark:text-slate-300">سرنخی یافت نشد.</p>
            <p className="text-xs mt-1">با معیارهای جستجوی دیگر تلاش کنید یا سرنخ جدید ثبت کنید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-carpet-cream dark:bg-slate-800/80 border-b border-carpet-cream-border dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-4">نام و نام خانوادگی</th>
                  <th className="p-4">شماره همراه</th>
                  <th className="p-4">استان و شهر</th>
                  <th className="p-4">منبع لید</th>
                  <th className="p-4">امتیاز و دما</th>
                  <th className="p-4">مرحله پایپ‌لاین</th>
                  <th className="p-4">بودجه تخمینی</th>
                  <th className="p-4">مسئول</th>
                  <th className="p-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {leads.map((lead) => {
                  const tempMeta = getTemperatureLabel(lead.temperature);
                  const stageMeta = STAGE_CONFIG[lead.status as keyof typeof STAGE_CONFIG];

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {toPersianDigits(lead.phone)}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 text-xs">
                        {lead.province} • {lead.city}
                      </td>
                      <td className="p-4">
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md">
                          {SOURCE_LABELS[lead.source as keyof typeof SOURCE_LABELS] || lead.source}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${tempMeta.badgeClass}`}
                          >
                            {toPersianDigits(lead.score)} امتیاز
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold ${stageMeta?.badgeClass || "bg-slate-100"}`}
                        >
                          {stageMeta?.label || lead.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-xs text-slate-800 dark:text-slate-200">
                        {formatToman(lead.estimatedBudget)}
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                        {lead.assignedTo?.name || "تعیین‌نشده"}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            پرونده
                          </Button>
                          <button
                            onClick={() => openEdit(lead)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-carpet-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="ویرایش لید"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDelete(lead)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="حذف لید"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <a href={`tel:${lead.phone}`}>
                            <Button variant="ghost" size="icon" className="text-emerald-600">
                              <Phone className="w-4 h-4" />
                            </Button>
                          </a>
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

      {/* Modal: Create Lead */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ثبت سرنخ جدید (لید)"
        subtitle="مشخصات هویتی و ترجیحات فرش مشتری را وارد کنید"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="نام"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="مثال: رضا"
            />
            <Input
              label="نام خانوادگی"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="مثال: محمدی"
            />
            <Input
              label="شماره تلفن همراه"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="09123456789"
            />
            <Select
              label="کانال ورودی لید"
              options={Object.entries(SOURCE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
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
              label="بودجه تقریبی (تومان)"
              type="number"
              value={formData.estimatedBudget}
              onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
            />
            <Select
              label="روش ترجیحی پرداخت"
              options={[
                { value: "CASH", label: "نقدی با تخفیف" },
                { value: "INSTALLMENT", label: "خرید اقساطی / چکی" },
                { value: "HYBRID", label: "ترکیبی (پیش‌پرداخت + چک)" },
              ]}
              value={formData.paymentPreference}
              onChange={(e) => setFormData({ ...formData, paymentPreference: e.target.value })}
            />
          </div>

          <div className="p-3.5 rounded-xl bg-carpet-cream dark:bg-slate-800/60 border border-carpet-cream-border dark:border-slate-700 space-y-3">
            <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-carpet-gold" />
              <span>پروفایل نیازسنجی اولیه فرش</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Select
                label="ابعاد مورد نظر"
                options={[
                  { value: "3x4", label: "۳×۴ (۱۲ متری)" },
                  { value: "2.5x3.5", label: "۲.۵×۳.۵ (۹ متری)" },
                  { value: "2x3", label: "۲×۳ (۶ متری)" },
                  { value: "1.5x2.25", label: "۱.۵×۲.۲۵ (۴ متری)" },
                ]}
                value={formData.preferredSizes[0]}
                onChange={(e) => setFormData({ ...formData, preferredSizes: [e.target.value] })}
              />
              <Select
                label="شانه فرش"
                options={[
                  { value: "1500", label: "۱۵۰۰ شانه (فوق ریزبافت)" },
                  { value: "1200", label: "۱۲۰۰ شانه (دستباف‌گونه)" },
                  { value: "1000", label: "۱۰۰۰ شانه" },
                  { value: "700", label: "۷۰۰ شانه (ضخیم و بادوام)" },
                ]}
                value={formData.preferredShane}
                onChange={(e) => setFormData({ ...formData, preferredShane: e.target.value })}
              />
              <Select
                label="تم رنگی"
                options={[
                  { value: "سرمه‌ای", label: "سرمه‌ای / لاجوردی" },
                  { value: "کرم صدفی", label: "کرم صدفی / فیلی" },
                  { value: "طوسی نقره‌ای", label: "طوسی متالیک / دلفینی" },
                  { value: "لاکی روناسی", label: "لاکی روناسی / زرشکی" },
                  { value: "گردویی", label: "گردویی چندرنگ" },
                ]}
                value={formData.preferredColors[0]}
                onChange={(e) => setFormData({ ...formData, preferredColors: [e.target.value] })}
              />
              <Select
                label="سبک طرح"
                options={[
                  { value: "کلاسیک", label: "کلاسیک سنتی" },
                  { value: "نئوکلاسیک", label: "نئوکلاسیک / طلاکوب" },
                  { value: "مدرن", label: "مدرن وینتیج" },
                  { value: "عشایری", label: "عشایری / خشتی" },
                ]}
                value={formData.preferredStyle}
                onChange={(e) => setFormData({ ...formData, preferredStyle: e.target.value })}
              />
            </div>
          </div>

          <Input
            label="یادداشت و توضیحات تکمیلی"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="مثال: برای جهیزیه عروس، نیازمند ارسال عکس و استعلام شرایط اقساط ۶ ماهه..."
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت لید و آغاز فرآیند فروش
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Lead */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش سرنخ فروش"
        subtitle="به‌روزرسانی مشخصات تماس، مرحله، امتیاز و بودجه لید"
      >
        <form onSubmit={handleEditLead} className="space-y-4">
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
              label="تلفن همراه"
              required
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
            <Select
              label="مرحله پایپ‌لاین"
              options={Object.entries(STAGE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="امتیاز لید (۰-۱۰۰)"
              type="number"
              value={String(editFormData.score)}
              onChange={(e) => setEditFormData({ ...editFormData, score: Number(e.target.value) })}
            />
            <Input
              label="بودجه تخمینی (تومان)"
              type="number"
              value={editFormData.estimatedBudget}
              onChange={(e) => setEditFormData({ ...editFormData, estimatedBudget: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="استان"
              value={editFormData.province}
              onChange={(e) => setEditFormData({ ...editFormData, province: e.target.value })}
            />
            <Input
              label="شهر"
              value={editFormData.city}
              onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
            />
          </div>

          <Input
            label="یادداشت کارشناس"
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

      {/* Modal: Delete Lead Confirmation */}
      {leadToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="تایید حذف سرنخ"
          subtitle={`آیا از حذف لید "${leadToDelete.firstName} ${leadToDelete.lastName}" اطمینان دارید؟`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                هشدار: با حذف این لید، سوابق پیگیری‌ها و پروفایل نیازمندی‌های ثبت‌شده پاک خواهند شد.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                انصراف
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteLead}>
                حذف قطعی لید
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Lead Detail & Conversion */}
      {selectedLead && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`پرونده لید: ${selectedLead.firstName} ${selectedLead.lastName}`}
          subtitle={`ثبت شده در تاریخ ${formatJalaliDate(selectedLead.createdAt)}`}
          maxWidth="3xl"
        >
          <div className="space-y-6">
            {/* Top Stat Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-[11px] text-slate-400 block">امتیاز لید</span>
                <span className="text-base font-black text-rose-600">
                  {toPersianDigits(selectedLead.score)} (
                  {getTemperatureLabel(selectedLead.temperature).label})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-[11px] text-slate-400 block">بودجه اعلامی</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {formatToman(selectedLead.estimatedBudget)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-[11px] text-slate-400 block">شهر و استان</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedLead.province}، {selectedLead.city}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-[11px] text-slate-400 block">کارشناس مسئول</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedLead.assignedTo?.name || "تخصیص‌نیافته"}
                </span>
              </div>
            </div>

            {/* Carpet Need Profile Details */}
            {selectedLead.needProfile && (
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> نیازمندی‌های ثبت‌شده فرش:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-semibold text-slate-400">شانه: </span>
                    {toPersianDigits(selectedLead.needProfile.preferredShane || "-")}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400">تراکم: </span>
                    {toPersianDigits(selectedLead.needProfile.preferredDensity || "-")}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400">سبک: </span>
                    {selectedLead.needProfile.preferredStyle || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400">پرداخت: </span>
                    {selectedLead.needProfile.paymentPreference === "INSTALLMENT"
                      ? "اقساطی"
                      : "نقدی"}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    openEdit(selectedLead);
                  }}
                >
                  <Edit className="w-4 h-4 ml-1.5" />
                  <span>ویرایش لید</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => {
                    openDelete(selectedLead);
                  }}
                >
                  <Trash2 className="w-4 h-4 ml-1.5" />
                  <span>حذف</span>
                </Button>
                <a href={`tel:${selectedLead.phone}`}>
                  <Button variant="secondary" size="md">
                    <Phone className="w-4 h-4 ml-1.5" />
                    <span>تماس با {toPersianDigits(selectedLead.phone)}</span>
                  </Button>
                </a>
              </div>

              <div className="flex items-center gap-2">
                {selectedLead.status !== "WON" && (
                  <Button
                    variant="gold"
                    size="md"
                    onClick={() => handleConvertToCustomer(selectedLead.id)}
                  >
                    <UserCheck className="w-4 h-4 ml-1.5" />
                    <span>تبدیل به مشتری قطعی (Won)</span>
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
                  بستن
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
