"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Users, Target, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatToman, toPersianDigits } from "@/lib/persian";

interface QuickSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSearch({ isOpen, onClose }: QuickSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    leads: any[];
    customers: any[];
    products: any[];
  }>({ leads: [], customers: [], products: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ leads: [], customers: [], products: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-carpet-cream-border dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 ml-3" />
          <input
            type="text"
            autoFocus
            placeholder="جستجوی نام مشتری، شماره موبایل، کد فرش، طرح..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm sm:text-base outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-slate-400 hover:text-slate-600 p-1"
            >
              پاک کردن
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 mr-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <p className="text-center py-6 text-xs text-slate-400">
              در حال جستجو در پایگاه داده...
            </p>
          ) : query.length >= 2 &&
            results.leads.length === 0 &&
            results.customers.length === 0 &&
            results.products.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              نتیجه‌ای برای «{query}» یافت نشد.
            </p>
          ) : (
            <>
              {/* Customers */}
              {results.customers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2 px-2">
                    <Users className="w-3.5 h-3.5" /> مشتریان
                  </h4>
                  <div className="space-y-1">
                    {results.customers.map((c) => (
                      <Link
                        key={c.id}
                        href={`/customers/${c.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {toPersianDigits(c.phone)} • {c.province}، {c.city}
                          </p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads */}
              {results.leads.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2 px-2">
                    <Target className="w-3.5 h-3.5" /> سرنخ‌های فروش (لیدها)
                  </h4>
                  <div className="space-y-1">
                    {results.leads.map((l) => (
                      <Link
                        key={l.id}
                        href={`/leads`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {l.firstName} {l.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {toPersianDigits(l.phone)} • امتیاز: {toPersianDigits(l.score)}
                          </p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2 px-2">
                    <Layers className="w-3.5 h-3.5" /> فرش‌ها و کاتالوگ
                  </h4>
                  <div className="space-y-1">
                    {results.products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/products`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            کد: {p.code} • {toPersianDigits(p.shane)} شانه • رنگ {p.primaryColor}
                          </p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
