import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Order";

export const metadata: Metadata = {
  title: appName,
  description: "Pick your name, choose your items, place your order.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/80">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white shadow-sm shadow-brand-600/40">
                <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
              {appName}
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="btn-ghost px-3 py-1.5">Order</Link>
              <Link href="/admin" className="btn-ghost px-3 py-1.5">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
