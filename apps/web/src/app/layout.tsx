import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SystemLogPanel } from "@/components/layout/SystemLogPanel";
import { TauriContextMenuBlocker } from "@/components/layout/TauriContextMenuBlocker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Khlus Trading Hub",
  description: "Traderlar için iletişim platformu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className={inter.className}>
        <TauriContextMenuBlocker />
        {children}
        <SystemLogPanel />
      </body>
    </html>
  );
}
