"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Plus,
  Shield,
  Phone,
  Mail,
  Edit,
  Trash2,
  AlertTriangle,
  Key,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Save,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toPersianDigits, formatJalaliDate } from "@/lib/persian";

interface RolePermission {
  id: string;
  module: string;
  action: string;
  description: string;
  ADMIN: boolean;
  SALES_MANAGER: boolean;
  SALES_REP: boolean;
}

const DEFAULT_PERMISSIONS: RolePermission[] = [
  {
    id: "leads_view",
    module: "سرنخ‌های فروش (Leads)",
    action: "مشاهده سرنخ‌ها",
    description: "دسترسی به فهرست سرنخ‌ها و پرونده نیازسنجی اولیه",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "leads_create",
    module: "سرنخ‌های فروش (Leads)",
    action: "ثبت لید جدید",
    description: "امکان ثبت اطلاعات مشتریان بالقوه و تماس‌های ورودی",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "leads_edit",
    module: "سرنخ‌های فروش (Leads)",
    action: "ویرایش مشخصات لید",
    description: "تغییر شماره تماس، امتیازدهی هوشمند و یادداشت‌ها",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "leads_delete",
    module: "سرنخ‌های فروش (Leads)",
    action: "حذف قطعی سرنخ",
    description: "حذف لید از دیتابیس و پاکسازی تاریخچه",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: false,
  },
  {
    id: "leads_export",
    module: "سرنخ‌های فروش (Leads)",
    action: "خروجی اکسل لیدها",
    description: "دانلود فایل اکسل اطلاعات تماس لیدها",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: false,
  },

  {
    id: "cust_view",
    module: "مشتریان (Customer 360)",
    action: "مشاهده پروفایل ۳۶۰",
    description: "دسترسی به مشخصات، سابقه فاکتورها و سلیقه فرش",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "cust_edit",
    module: "مشتریان (Customer 360)",
    action: "ویرایش اطلاعات مشتری",
    description: "تغییر آدرس پستی تحویل، شماره تماس و یادداشت‌ها",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "cust_delete",
    module: "مشتریان (Customer 360)",
    action: "حذف پرونده مشتری",
    description: "حذف کامل مشتری و سوابق مالی مرتبط",
    ADMIN: true,
    SALES_MANAGER: false,
    SALES_REP: false,
  },

  {
    id: "pipeline_move",
    module: "پایپ‌لاین فروش (Kanban)",
    action: "تغییر مرحله معامله (Drag & Drop)",
    description: "هدایت فرصت فروش در طول مراحل کانبان",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "pipeline_edit",
    module: "پایپ‌لاین فروش (Kanban)",
    action: "ویرایش مبلغ و اولویت معامله",
    description: "تغییر مبلغ ریالی تخمینی و توضیحات معامله",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "pipeline_delete",
    module: "پایپ‌لاین فروش (Kanban)",
    action: "حذف معامله از پایپ‌لاین",
    description: "حذف فرصت فروش از روی بورد کانبان",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: false,
  },

  {
    id: "prod_view",
    module: "کاتالوگ و انبار (Products & Stock)",
    action: "مشاهده موجودی و قیمت‌ها",
    description: "استعلام موجودی تخته فرش‌ها در انبار مرکزی یاشار",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "prod_create",
    module: "کاتالوگ و انبار (Products & Stock)",
    action: "تعریف فرش و طرح جدید",
    description: "ثبت کد جدید، شانه، تراکم، کلکسیون و قیمت‌ها",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: false,
  },
  {
    id: "prod_price_edit",
    module: "کاتالوگ و انبار (Products & Stock)",
    action: "ویرایش قیمت پایه و مشخصات",
    description: "تغییر قیمت نقدی و اقساطی ابعاد ۱۲ و ۶ متری",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: false,
  },
  {
    id: "prod_delete",
    module: "کاتالوگ و انبار (Products & Stock)",
    action: "حذف کالا از کاتالوگ",
    description: "حذف طرح فرش و تنوع‌های سایز از سیستم",
    ADMIN: true,
    SALES_MANAGER: false,
    SALES_REP: false,
  },

  {
    id: "orders_create",
    module: "سفارش‌ها و فاکتورها (Orders & Invoices)",
    action: "صدور فاکتور و پیش‌فاکتور",
    description: "ثبت خرید، محاسبه تخفیف و تولید فاکتور رسمی",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: true,
  },
  {
    id: "orders_delete",
    module: "سفارش‌ها و فاکتورها (Orders & Invoices)",
    action: "حذف یا ابطال فاکتور",
    description: "ابطال فاکتور صادرشده و برگشت کالا به موجودی",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: false,
  },

  {
    id: "installments_manage",
    module: "دفترچه اقساط و چک‌ها",
    action: "ثبت وصول چک و تسویه اقساط",
    description: "تغییر وضعیت چک‌ها به وصول‌شده یا برگشتی",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: false,
  },

  {
    id: "reports_view",
    module: "گزارش‌ها و هوش تجاری (BI)",
    action: "مشاهده تحلیل‌های فروش و درآمد",
    description: "دسترسی به نمودارهای مالی و گزارش عملکرد پرسنل",
    ADMIN: true,
    SALES_MANAGER: true,
    SALES_REP: false,
  },

  {
    id: "users_manage",
    module: "مدیریت سیستم و پرسنل",
    action: "مدیریت کاربران و ویرایش دسترسی‌ها",
    description: "ایجاد پرسنل، تغییر رمز عبور و تنظیم ماتریس مجوزها",
    ADMIN: true,
    SALES_MANAGER: false,
    SALES_REP: false,
  },
];

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "PERMISSIONS">("MEMBERS");
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Granular Permissions Matrix State
  const [permissions, setPermissions] = useState<RolePermission[]>(DEFAULT_PERMISSIONS);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "SALES_REP",
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "SALES_REP",
  });

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error("Error loading team:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // Load stored permissions if available
    const saved = localStorage.getItem("yashar_crm_permissions");
    if (saved) {
      try {
        setPermissions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved permissions:", e);
      }
    }
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        setFormData({ name: "", email: "", phone: "", password: "", role: "SALES_REP" });
        loadUsers();
      } else {
        alert(data.error || "خطا در ثبت کاربر");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        loadUsers();
      } else {
        alert(data.error || "خطا در ویرایش اطلاعات کاربر");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/team?id=${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
        loadUsers();
      } else {
        alert(data.error || "خطا در حذف کاربر");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const togglePermission = (
    permissionId: string,
    role: "ADMIN" | "SALES_MANAGER" | "SALES_REP"
  ) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id === permissionId) {
          return {
            ...p,
            [role]: !p[role],
          };
        }
        return p;
      })
    );
  };

  const savePermissionsMatrix = () => {
    localStorage.setItem("yashar_crm_permissions", JSON.stringify(permissions));
    setSaveSuccessMsg("ماتریس سطوح دسترسی با موفقیت ذخیره و در سامانه اعمال گردید.");
    setTimeout(() => {
      setSaveSuccessMsg("");
    }, 4000);
  };

  const openEdit = (u: any) => {
    setEditData({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      password: "",
      role: u.role,
    });
    setIsEditModalOpen(true);
  };

  const openDelete = (u: any) => {
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-600" />
            <span>تیم فروش و مدیریت سطوح دسترسی (RBAC)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تعریف پرسنل، ویرایش نقش‌ها و ماتریس دسترسی‌های جزئی بخش‌های سامانه فرش یاشار
          </p>
        </div>

        {activeTab === "MEMBERS" && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-md shadow-sky-600/25"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            <span>افزودن عضو جدید</span>
          </Button>
        )}

        {activeTab === "PERMISSIONS" && (
          <Button
            variant="primary"
            size="md"
            onClick={savePermissionsMatrix}
            className="shadow-md shadow-sky-600/25"
          >
            <Save className="w-4 h-4 ml-1.5" />
            <span>ذخیره تغییرات دسترسی‌ها</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("MEMBERS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "MEMBERS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
              : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          فهرست اعضای تیم و کارشناسان ({toPersianDigits(users.length)})
        </button>

        <button
          onClick={() => setActiveTab("PERMISSIONS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "PERMISSIONS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
              : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>ماتریس دسترسی‌های جزئی نقش‌ها (Granular Permissions)</span>
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* TAB 1: Team Members Grid */}
      {activeTab === "MEMBERS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {users.map((u) => (
            <Card key={u.id} className="p-5 flex flex-col justify-between space-y-4" hoverEffect>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-600 flex items-center justify-center font-bold text-base overflow-hidden">
                      {u.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        u.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {u.name}
                      </h3>
                      <Badge
                        variant={
                          u.role === "ADMIN"
                            ? "danger"
                            : u.role === "SALES_MANAGER"
                            ? "gold"
                            : "secondary"
                        }
                        size="sm"
                      >
                        {u.role === "ADMIN"
                          ? "مدیر ارشد سیستم"
                          : u.role === "SALES_MANAGER"
                          ? "مدیر فروش"
                          : "کارشناس فروش"}
                      </Badge>
                    </div>
                  </div>

                  {/* Edit & Delete Action Icons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                      title="ویرایش اطلاعات کاربر"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDelete(u)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="حذف کاربر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5" />
                    {toPersianDigits(u.phone)}
                  </p>
                  <p className="flex items-center gap-1.5 font-mono">
                    <Mail className="w-3.5 h-3.5" />
                    {u.email}
                  </p>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block text-[10px]">لیدهای فعال</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {toPersianDigits(u._count?.assignedLeads || 0)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block text-[10px]">فاکتورها</span>
                  <span className="font-bold text-emerald-600">
                    {toPersianDigits(u._count?.orders || 0)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: Granular Role Permissions Matrix Editor */}
      {activeTab === "PERMISSIONS" && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-sky-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                پیکربندی جزئی دسترسی نقش‌های کاربری فرش یاشار
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              تیک هر دسترسی را برای نقش مورد نظر فعال یا غیرفعال کنید و سپس دکمه ذخیره را بزنید.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b text-slate-700 dark:text-slate-200 font-bold">
                <tr>
                  <th className="p-3.5">بخش / ماژول</th>
                  <th className="p-3.5">عنوان دسترسی</th>
                  <th className="p-3.5">توضیحات و محدوده عملکرد</th>
                  <th className="p-3.5 text-center">مدیر ارشد (ADMIN)</th>
                  <th className="p-3.5 text-center">مدیر فروش (MANAGER)</th>
                  <th className="p-3.5 text-center">کارشناس فروش (REP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {permissions.map((perm) => (
                  <tr
                    key={perm.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {perm.module}
                    </td>
                    <td className="p-3.5 font-semibold text-sky-700 dark:text-sky-400">
                      {perm.action}
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">
                      {perm.description}
                    </td>

                    {/* Admin Checkbox */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={perm.ADMIN}
                        onChange={() => togglePermission(perm.id, "ADMIN")}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </td>

                    {/* Manager Checkbox */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={perm.SALES_MANAGER}
                        onChange={() => togglePermission(perm.id, "SALES_MANAGER")}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </td>

                    {/* Rep Checkbox */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={perm.SALES_REP}
                        onChange={() => togglePermission(perm.id, "SALES_REP")}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end">
            <Button
              variant="primary"
              size="md"
              onClick={savePermissionsMatrix}
              className="shadow-md shadow-sky-600/25"
            >
              <Save className="w-4 h-4 ml-1.5" />
              <span>ذخیره تغییرات ماتریس دسترسی‌ها</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Modal: Create User */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="تعریف کاربر و کارشناس فروش جدید"
        subtitle="مشخصات هویتی و سطح دسترسی را تعیین فرمایید"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="نام و نام خانوادگی"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="ایمیل سازمانی"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="شماره تلفن همراه"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="رمز عبور اولیه"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Select
            label="نقش کاربری و سطح دسترسی"
            options={[
              { value: "SALES_REP", label: "کارشناس فروش (دسترسی به لیدها و پایپ‌لاین خود)" },
              { value: "SALES_MANAGER", label: "مدیر فروش (دسترسی به کل تیم، انبار و گزارش‌ها)" },
              { value: "ADMIN", label: "مدیر ارشد سیستم (دسترسی تام و مدیریت کاربران)" },
            ]}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت کاربر
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit User */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش اطلاعات کاربر"
        subtitle="تغییر مشخصات فردی، سطح دسترسی یا تغییر رمز عبور"
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          <Input
            label="نام و نام خانوادگی"
            required
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />
          <Input
            label="ایمیل سازمانی"
            type="email"
            required
            value={editData.email}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
          />
          <Input
            label="شماره تلفن همراه"
            required
            value={editData.phone}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
          />
          <Input
            label="رمز عبور جدید (اختیاری)"
            type="password"
            placeholder="در صورت عدم تغییر، خالی بگذارید"
            value={editData.password}
            onChange={(e) => setEditData({ ...editData, password: e.target.value })}
          />
          <Select
            label="نقش کاربری و سطح دسترسی"
            options={[
              { value: "SALES_REP", label: "کارشناس فروش" },
              { value: "SALES_MANAGER", label: "مدیر فروش" },
              { value: "ADMIN", label: "مدیر ارشد سیستم" },
            ]}
            value={editData.role}
            onChange={(e) => setEditData({ ...editData, role: e.target.value })}
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

      {/* Modal: Delete Confirmation */}
      {userToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="تایید حذف کاربر"
          subtitle={`آیا از حذف حساب کاربری "${userToDelete.name}" اطمینان دارید؟`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                هشدار: با حذف این کاربر، دسترسی وی به سامانه مسدود خواهد شد. این عملیات غیرقابل بازگشت است.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                انصراف
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteUser}>
                حذف قطعی کاربر
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
