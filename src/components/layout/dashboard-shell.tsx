"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { NotificationDrawer } from "@/components/layout/notification-drawer";
import { QuickSearch } from "@/components/layout/quick-search";
import type { UserRole } from "@/types";

interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
}

interface DashboardShellProps {
  children: React.ReactNode;
  currentUser: DashboardUser;
}

export function DashboardShell({ children, currentUser }: DashboardShellProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [unreadCount] = useState(2);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-[#FDFBF7] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC]">
      <Sidebar
        userRole={currentUser.role}
        userName={currentUser.name}
        userAvatar={currentUser.avatar}
        onLogout={handleLogout}
      />

      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        userRole={currentUser.role}
        userName={currentUser.name}
        onLogout={handleLogout}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <QuickSearch
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadCount}
          userName={currentUser.name}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
