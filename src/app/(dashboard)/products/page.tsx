"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Search,
  Sparkles,
  Download,
  Check,
  Tag,
  Boxes,
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
  formatCarpetSize,
} from "@/lib/persian";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedShane, setSelectedShane] = useState("");

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Create Carpet State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    pattern: "ترنج و لچک",
    collection: "کاشان",
    shane: "1200",
    density: "3600",
    primaryColor: "سرمه‌ای",
    style: "کلاسیک",
    price3x4: "42000000",
    stock3x4: "5",
    price2x3: "21000000",
    stock2x3: "6",
  });

  // Edit Carpet State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    code: "",
    name: "",
    pattern: "",
    collection: "",
    shane: "1200",
    density: "3600",
    primaryColor: "",
    style: "کلاسیک",
  });

  // Delete Carpet State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedShane) params.append("shane", selectedShane);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedShane]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: createForm.code,
          name: createForm.name,
          pattern: createForm.pattern,
          collection: createForm.collection,
          shane: Number(createForm.shane),
          density: Number(createForm.density),
          primaryColor: createForm.primaryColor,
          style: createForm.style,
          variants: [
            {
              size: "3x4",
              areaSquareMeters: 12,
              cashPrice: Number(createForm.price3x4),
              stock: Number(createForm.stock3x4),
            },
            {
              size: "2x3",
              areaSquareMeters: 6,
              cashPrice: Number(createForm.price2x3),
              stock: Number(createForm.stock2x3),
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        setCreateForm({
          code: "",
          name: "",
          pattern: "ترنج و لچک",
          collection: "کاشان",
          shane: "1200",
          density: "3600",
          primaryColor: "سرمه‌ای",
          style: "کلاسیک",
          price3x4: "42000000",
          stock3x4: "5",
          price2x3: "21000000",
          stock2x3: "6",
        });
        loadProducts();
      } else {
        alert(data.error || "خطا در ثبت محصول");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        loadProducts();
      } else {
        alert(data.error || "خطا در ویرایش فرش");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`/api/products?id=${productToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
        loadProducts();
      } else {
        alert(data.error || "خطا در حذف فرش");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const openEdit = (p: any) => {
    setEditForm({
      id: p.id,
      code: p.code,
      name: p.name,
      pattern: p.pattern,
      collection: p.collection,
      shane: String(p.shane),
      density: String(p.density),
      primaryColor: p.primaryColor,
      style: p.style,
    });
    setIsEditModalOpen(true);
  };

  const openDelete = (p: any) => {
    setProductToDelete(p);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-carpet-crimson" />
            <span>کاتالوگ فرش‌ها و تنوع‌های ابعاد (Products & Variants)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            مشخصات فنی، تراکم، شانه، قیمت نقدی و اقساطی، و تصاویر باکیفیت طرح‌های اصیل ایرانی
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 ml-1.5" />
            <span>تعریف طرح و فرش جدید</span>
          </Button>

          <a href="/api/excel/export?type=products" download>
            <Button variant="outline" size="md">
              <Download className="w-4 h-4 ml-1.5" />
              <span>خروجی اکسل</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی نام طرح، نقشه، کلکسیون، کد محصول..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] pr-10 pl-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:border-carpet-crimson"
              />
            </div>
            <Button type="submit" variant="secondary" size="md">
              جستجو
            </Button>
          </form>

          <select
            value={selectedShane}
            onChange={(e) => setSelectedShane(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none w-full sm:w-auto"
          >
            <option value="">همه شانه‌ها</option>
            <option value="1500">۱۵۰۰ شانه</option>
            <option value="1200">۱۲۰۰ شانه</option>
            <option value="1000">۱۰۰۰ شانه</option>
            <option value="700">۷۰۰ شانه</option>
          </select>
        </div>
      </Card>

      {/* Carpet Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-20 text-slate-400 text-sm">
            در حال بارگذاری کاتالوگ فرش‌ها...
          </div>
        ) : products.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-400">
            <Layers className="w-12 h-12 mx-auto mb-2 opacity-40 text-carpet-crimson" />
            <p className="font-bold text-slate-700 dark:text-slate-300">فرشی یافت نشد.</p>
          </div>
        ) : (
          products.map((p) => {
            const images = p.images ? JSON.parse(p.images) : [];
            const coverImage =
              images[0] ||
              "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=80";

            return (
              <Card key={p.id} className="overflow-hidden flex flex-col" hoverEffect>
                {/* Image Cover */}
                <div className="relative h-48 sm:h-56 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <Badge variant="gold" size="sm">
                      کد {p.code}
                    </Badge>
                  </div>

                  {/* Top Left Edit & Delete Actions */}
                  <div className="absolute top-3 left-3 flex items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-carpet-crimson transition-colors backdrop-blur-md"
                      title="ویرایش مشخصات طرح"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDelete(p)}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose-600 transition-colors backdrop-blur-md"
                      title="حذف فرش"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-md">
                      {toPersianDigits(p.shane)} شانه • تراکم {toPersianDigits(p.density)}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-black/60 text-amber-300 backdrop-blur-md">
                      {p.style}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      کلکسیون: {p.collection} • رنگ زمینه: {p.primaryColor}
                    </p>
                  </div>

                  {/* Variants Summary */}
                  <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400">ابعاد و قیمت‌ها:</p>
                    <div className="space-y-1">
                      {p.variants?.slice(0, 3).map((v: any) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between text-xs py-0.5"
                        >
                          <span className="text-slate-600 dark:text-slate-300">
                            {formatCarpetSize(v.size)}:
                          </span>
                          <span className="font-bold text-carpet-crimson dark:text-amber-400">
                            {formatToman(v.cashPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full font-bold"
                    onClick={() => {
                      setSelectedProduct(p);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    مشاهده مشخصات کامل و انبار
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal: Create Carpet Product */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="تعریف طرح و فرش جدید در کاتالوگ"
        subtitle="مشخصات فنی، شانه، تراکم و قیمت پایه ابعاد استاندارد را وارد نمایید"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="کد شناسایی فرش (SKU Code)"
              required
              placeholder="مثال: CRP-10"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
            />
            <Input
              label="نام تجاری طرح"
              required
              placeholder="مثال: فرش گلستان افشان طلاکوب"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="کلکسیون / شهر"
              required
              value={createForm.collection}
              onChange={(e) => setCreateForm({ ...createForm, collection: e.target.value })}
            />
            <Select
              label="شانه"
              options={[
                { value: "1500", label: "۱۵۰۰ شانه" },
                { value: "1200", label: "۱۲۰۰ شانه" },
                { value: "1000", label: "۱۰۰۰ شانه" },
                { value: "700", label: "۷۰۰ شانه" },
              ]}
              value={createForm.shane}
              onChange={(e) => setCreateForm({ ...createForm, shane: e.target.value })}
            />
            <Input
              label="تراکم بافت"
              required
              value={createForm.density}
              onChange={(e) => setCreateForm({ ...createForm, density: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="رنگ زمینه اصلی"
              required
              placeholder="مثال: سرمه‌ای، کرم صدفی، فیلی"
              value={createForm.primaryColor}
              onChange={(e) => setCreateForm({ ...createForm, primaryColor: e.target.value })}
            />
            <Select
              label="سبک نقشه"
              options={[
                { value: "کلاسیک", label: "کلاسیک ایرانی" },
                { value: "نئوکلاسیک", label: "نئوکلاسیک و طلاکوب" },
                { value: "مدرن", label: "مدرن و وینتیج" },
                { value: "عشایری", label: "عشایری و خشتی" },
              ]}
              value={createForm.style}
              onChange={(e) => setCreateForm({ ...createForm, style: e.target.value })}
            />
          </div>

          {/* Default Variants Pricing */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border space-y-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              قیمت پایه و موجودی اولیه ابعاد:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="قیمت ۱۲ متری (۳×۴)"
                type="number"
                value={createForm.price3x4}
                onChange={(e) => setCreateForm({ ...createForm, price3x4: e.target.value })}
              />
              <Input
                label="موجودی انبار ۱۲ متری"
                type="number"
                value={createForm.stock3x4}
                onChange={(e) => setCreateForm({ ...createForm, stock3x4: e.target.value })}
              />
              <Input
                label="قیمت ۶ متری (۲×۳)"
                type="number"
                value={createForm.price2x3}
                onChange={(e) => setCreateForm({ ...createForm, price2x3: e.target.value })}
              />
              <Input
                label="موجودی انبار ۶ متری"
                type="number"
                value={createForm.stock2x3}
                onChange={(e) => setCreateForm({ ...createForm, stock2x3: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت در کاتالوگ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Carpet Product */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش مشخصات طرح فرش"
        subtitle="به‌روزرسانی نام، کلکسیون، شانه و رنگ زمینه"
      >
        <form onSubmit={handleEditProduct} className="space-y-4">
          <Input
            label="کد کالا"
            required
            value={editForm.code}
            onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
          />
          <Input
            label="نام تجاری فرش"
            required
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Input
            label="کلکسیون"
            required
            value={editForm.collection}
            onChange={(e) => setEditForm({ ...editForm, collection: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="شانه"
              options={[
                { value: "1500", label: "۱۵۰۰ شانه" },
                { value: "1200", label: "۱۲۰۰ شانه" },
                { value: "1000", label: "۱۰۰۰ شانه" },
                { value: "700", label: "۷۰۰ شانه" },
              ]}
              value={editForm.shane}
              onChange={(e) => setEditForm({ ...editForm, shane: e.target.value })}
            />
            <Input
              label="تراکم"
              value={editForm.density}
              onChange={(e) => setEditForm({ ...editForm, density: e.target.value })}
            />
          </div>
          <Input
            label="رنگ زمینه"
            value={editForm.primaryColor}
            onChange={(e) => setEditForm({ ...editForm, primaryColor: e.target.value })}
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
      {productToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="تایید حذف فرش"
          subtitle={`آیا از حذف طرح "${productToDelete.name}" اطمینان دارید؟`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                هشدار: با حذف این فرش، تمامی تنوع‌های ابعاد و قیمت‌های مربوطه حذف خواهند شد.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                انصراف
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteProduct}>
                حذف قطعی فرش
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Full Carpet Specs & Variant Inventory */}
      {selectedProduct && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedProduct.name}
          subtitle={`کد شناسایی: ${selectedProduct.code} • کلکسیون ${selectedProduct.collection}`}
          maxWidth="3xl"
        >
          <div className="space-y-6">
            {/* Tech Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-slate-400 block">شانه و تراکم</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {toPersianDigits(selectedProduct.shane)} شانه /{" "}
                  {toPersianDigits(selectedProduct.density)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-slate-400 block">جنس نخ خاب</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedProduct.yarnMaterial}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-slate-400 block">دستگاه بافت</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedProduct.weavingMachine}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-slate-400 block">رنگ زمینه اصلی</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedProduct.primaryColor}
                </span>
              </div>
            </div>

            {/* Variants Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                موجودی انبار و قیمت ابعاد مختلف:
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right text-xs">
                  <thead className="bg-carpet-cream dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">سایز</th>
                      <th className="p-2.5">کد انبار (SKU)</th>
                      <th className="p-2.5">قیمت نقدی</th>
                      <th className="p-2.5">قیمت اقساطی</th>
                      <th className="p-2.5">موجودی آزاد</th>
                      <th className="p-2.5">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedProduct.variants?.map((v: any) => (
                      <tr key={v.id}>
                        <td className="p-2.5 font-bold">{formatCarpetSize(v.size)}</td>
                        <td className="p-2.5 font-mono text-slate-500">{v.sku}</td>
                        <td className="p-2.5 font-bold text-emerald-600">
                          {formatToman(v.cashPrice)}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          {formatToman(v.installmentPrice)}
                        </td>
                        <td className="p-2.5 font-bold">
                          {toPersianDigits(v.stock - v.reservedStock)} تخته
                        </td>
                        <td className="p-2.5">
                          {v.stock - v.reservedStock > 2 ? (
                            <Badge variant="success" size="sm">
                              موجود در انبار
                            </Badge>
                          ) : v.stock - v.reservedStock > 0 ? (
                            <Badge variant="warning" size="sm">
                              موجودی محدود
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm">
                              ناموجود
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
                بستن
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
