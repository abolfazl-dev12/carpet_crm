"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Search,
  Bell,
  Clock,
  Plus,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatJalaliDate, toPersianDigits } from "@/lib/persian";

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenQuickSearch: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount?: number;
  userName?: string;
}

export function TopBar({
  onOpenMobileMenu,
  onOpenQuickSearch,
  onOpenNotifications,
  unreadNotificationsCount = 2,
  userName = "کاربر سیستم",
}: TopBarProps) {
  const [currentJalaliTime, setCurrentJalaliTime] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentJalaliTime(formatJalaliDate(now, true));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-carpet-cream-border dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Mobile Hamburger & Quick Search Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="باز کردن منو"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Global Search Button */}
        <button
          onClick={onOpenQuickSearch}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-xs sm:text-sm transition-all border border-slate-200/60 dark:border-slate-700 w-44 sm:w-64"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="truncate">جستجوی مشتری، فرش، لید...</span>
          <kbd className="hidden sm:inline-block mr-auto text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls & Live Jalali Clock */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Live Jalali Date & Time */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-carpet-cream dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-carpet-cream-border dark:border-slate-700">
          <Clock className="w-3.5 h-3.5 text-carpet-crimson dark:text-amber-400" />
          <span className="font-semibold">{currentJalaliTime}</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="تغییر حالت شب/روز"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications Button */}
        <button
          onClick={onOpenNotifications}
          className="relative w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="اعلان‌ها"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm animate-pulse">
              {toPersianDigits(unreadNotificationsCount)}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
