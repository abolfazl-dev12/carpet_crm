import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "سامانه جامع مدیریت ارتباط با مشتریان و فروش فرش یاشار | Yashar Carpet CRM",
  description: "نرم‌افزار جامع مدیریت ارتباط با مشتریان، پیگیری هوشمند لیدها، پایپ‌لاین فروش، انبارداری و دفترچه اقساط کارخانجات و بازرگانی فرش یاشار",
  keywords: ["فرش یاشار", "سی آر ام فرش یاشار", "نرم افزار فروش فرش", "مدیریت مشتریان فرش", "پایپ لاین فروش", "دفتر اقساط فرش"],
  authors: [{ name: "Yashar Carpet Engineering Team" }],
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0284c7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      </head>
      <body className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1329] text-[#0f172a] dark:text-[#f8fafc] antialiased selection:bg-carpet-crimson selection:text-white">
        {children}
      </body>
    </html>
  );
}
