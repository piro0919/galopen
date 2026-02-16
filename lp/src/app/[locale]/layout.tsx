import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    description: t("description"),
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
  };
}

type RootLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps): Promise<ReactNode> {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "ja")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning={true}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
