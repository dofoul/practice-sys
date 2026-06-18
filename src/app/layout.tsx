import type { Metadata } from "next";
import { AntdProvider } from "@/components/providers/AntdProvider";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Система учёта практик",
  description: "Веб-приложение для организации, учёта и контроля прохождения практик студентами",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <NextAuthProvider>
          <AntdProvider>{children}</AntdProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
