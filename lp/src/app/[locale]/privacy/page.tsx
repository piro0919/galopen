import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Section = { title: string; body: string };

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });

  return {
    title: t("title"),
    description: t("intro"),
    alternates: { canonical: locale === "en" ? "/privacy" : `/${locale}/privacy` },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Privacy");
  const sections = t.raw("sections") as Section[];

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-bold text-3xl tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-apple-gray-3 text-sm">{t("updated")}</p>
        <p className="mt-8 text-apple-gray-2 leading-relaxed">{t("intro")}</p>

        {sections.map((section) => (
          <section className="mt-10" key={section.title}>
            <h2 className="font-bold text-xl">{section.title}</h2>
            <p className="mt-3 text-apple-gray-2 leading-relaxed">{section.body}</p>
          </section>
        ))}

        <p className="border-apple-border mt-16 border-t pt-6 text-apple-gray-3 text-sm">
          <Link className="underline" href="/">
            ← {t("back")}
          </Link>
        </p>
      </div>
    </main>
  );
}
