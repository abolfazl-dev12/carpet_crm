"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Phone, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "نام کاربری یا رمز عبور اشتباه است.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("خطا در برقراری ارتباط با سرور.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f8fafc] dark:bg-[#0b1329]">
      {/* Right Side: Yashar Carpet Visual Showcase */}
      <div className="lg:w-1/2 relative bg-carpet-navy text-white p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header with Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 p-1.5 border border-white/20 flex items-center justify-center shadow-xl overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="فرش یاشار" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide text-white">
              کارخانجات و بازرگانی فرش یاشار
            </h1>
            <p className="text-xs text-sky-300 font-medium">
              سامانه یکپارچه مدیریت ارتباط با مشتریان، فروش و انبار تخصصی
            </p>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 my-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>سامانه سازمانی فرش یاشار (Yashar Carpet)</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
            مدیریت هوشمند فروش، <br />
            پایپ‌لاین معاملات و انبارداری فرش یاشار
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-sky-300 font-bold text-sm">نیازسنجی تخصصی و انبار</p>
              <p className="text-xs text-slate-300 mt-1">
                ثبت شانه، تراکم، ابعاد، نقشه و تطابق هوشمند با موجودی کارخانجات یاشار.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-sky-300 font-bold text-sm">دفترچه اقساط و چک‌ها</p>
              <p className="text-xs text-slate-300 mt-1">
                مدیریت سررسید اقساط، یادآوری خودکار و صدور فاکتورهای رسمی فرش یاشار.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-6">
          <p>© تمامی حقوق محفوظ است • کارخانجات فرش یاشار</p>
          <div className="flex items-center gap-1.5 text-sky-300">
            <ShieldCheck className="w-4 h-4" />
            <span>امنیت سازمانی رمزنگاری‌شده</span>
          </div>
        </div>
      </div>

      {/* Left Side: Login Form (Clean, without quick demo accounts) */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center sm:text-right">
            <div className="lg:hidden mx-auto w-16 h-16 rounded-2xl bg-white p-1 border border-slate-200 mb-4 flex items-center justify-center shadow-md overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="فرش یاشار" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              ورود به پنل کاربری فرش یاشار
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              جهت ورود، نام کاربری (ایمیل یا شماره همراه) و رمز عبور خود را وارد نمایید.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="ایمیل سازمانی یا شماره همراه"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="مثال: admin@carpet-crm.ir یا 09121111111"
              icon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="رمز عبور"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              icon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-base font-bold shadow-lg shadow-sky-600/25 mt-2"
              isLoading={isLoading}
            >
              <span>ورود به سامانه</span>
              <ArrowLeft className="w-5 h-5 mr-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
