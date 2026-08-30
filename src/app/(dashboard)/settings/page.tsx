"use client";

import React, { useState } from "react";
import { Settings, Save, Bell, Shield, Database, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function SettingsPage() {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-600" />
          <span>تنظیمات عمومی سامانه CRM فرش یاشار</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          مشخصات صادرکننده فاکتور رسمی، قوانین امتیازدهی خودکار لیدها و پیکربندی کارخانجات فرش یاشار
        </p>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
          تنظیمات سیستم با موفقیت ذخیره و اعمال شد.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Invoice Settings */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-3">
            <Shield className="w-4 h-4 text-sky-600" />
            <span>مشخصات حقوقی صادرکننده فاکتور (فرش یاشار)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="نام شرکت یا مجموعه تولیدی" defaultValue="کارخانجات و بازرگانی فرش یاشار (Yashar Carpet)" />
            <Input label="شماره ثبت تجاری" defaultValue="۸۸۴۵۲" />
            <Input label="تلفن ثابت کارخانه / فروشگاه" defaultValue="02188997744" />
            <Input label="نشانی کارخانه و انبار مرکزی" defaultValue="کاشان، شهرک صنعتی راوند، بلوار حکمت، مجتمع کارخانجات فرش یاشار" />
          </div>
        </Card>

        {/* Lead Scoring Settings */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-3">
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span>قوانین امتیازدهی خودکار لیدها (Lead Scoring)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="حداقل امتیاز برای لید داغ (Hot)" type="number" defaultValue="55" />
            <Input label="امتیاز درخواست ارسال و پرو در محل" type="number" defaultValue="20" />
            <Input label="امتیاز انتخاب طرح و استعلام قیمت" type="number" defaultValue="15" />
            <Input label="کاهش امتیاز در صورت عدم پاسخ به پیگیری" type="number" defaultValue="10" />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" className="shadow-md shadow-sky-600/25">
            <Save className="w-4 h-4 ml-1.5" />
            <span>ذخیره تغییرات</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
