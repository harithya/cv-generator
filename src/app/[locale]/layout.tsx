import type { Metadata, Viewport } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { Providers } from "@/components/shared/providers";
import { type Locale, routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const fontSans = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  id: "id_ID",
};

const OG_IMAGE_ALT =
  "Lanjut — free, local-first résumé builder that sails through applicant tracking systems";

const OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: OG_IMAGE_ALT,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: t("title"),
      template: `%s · ${SITE.name}`,
    },
    description: t("description"),
    applicationName: SITE.name,
    keywords: [
      "resume builder",
      "ATS resume",
      "applicant tracking system",
      "CV builder",
      "free resume builder",
      "open source",
      "local-first",
    ],
    authors: [{ name: "Rizki Citra", url: "https://rimzzlabs.com" }],
    creator: "Rizki Citra",
    openGraph: {
      type: "website",
      url: locale === routing.defaultLocale ? "/" : `/${locale}`,
      siteName: SITE.name,
      title: t("title"),
      description: t("description"),
      locale: OG_LOCALE[locale],
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [OG_IMAGE],
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: "#1f7a70",
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        fontSans.variable,
        fontMono.variable,
        "font-sans",
      )}
    >
      <body>
        <NextIntlClientProvider>
          <Providers>{props.children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
