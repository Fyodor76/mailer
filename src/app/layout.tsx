import type { Metadata, Viewport } from "next";
import { Literata, Manrope } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin", "cyrillic"],
  variable: "--font-literata",
  display: "swap",
});

const siteName = "Mail Orchestrator";
const description =
  "Личный оркестратор email-рассылок: Unisender Go, базы адресов, батчи и отчёты.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_BASE_URL || "http://localhost:3000",
  ),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description,
  applicationName: siteName,
  authors: [{ name: "Mail Orchestrator" }],
  creator: "Mail Orchestrator",
  keywords: [
    "email",
    "рассылки",
    "Unisender",
    "оркестратор",
    "mail",
    "транзакционные письма",
  ],
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName,
    title: siteName,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#1f6b5a" },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${literata.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
