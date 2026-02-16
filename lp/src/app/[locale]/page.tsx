import {
  Calendar,
  Clock,
  Coffee,
  Download,
  Feather,
  Filter,
  Github,
  ShieldCheck,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const GITHUB_URL = "https://github.com/piro0919/galopen";
const RELEASE_URL = "https://github.com/piro0919/galopen/releases/latest";
const COFFEE_URL = "https://buymeacoffee.com/piro0919";

const FEATURES = [
  { key: "menuBar" as const, icon: Calendar },
  { key: "autoOpen" as const, icon: Video },
  { key: "countdown" as const, icon: Clock },
  { key: "calendars" as const, icon: Filter },
  { key: "privacy" as const, icon: ShieldCheck },
  { key: "lightweight" as const, icon: Feather },
];

export default function Page(): ReactNode {
  const t = useTranslations();

  return (
    <main className="min-h-dvh">
      {/* Hero */}
      <section className="px-6 pt-16 pb-20 text-center">
        <div className="mx-auto max-w-2xl">
          <Image
            src="/icon.png"
            alt="Galopen"
            width={128}
            height={128}
            className="mx-auto mb-6 rounded-[24px] drop-shadow-xl"
            priority
          />
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-apple-blue/10 px-4 py-1.5 text-sm font-medium text-apple-blue">
            <Calendar size={16} strokeWidth={1.75} />
            macOS Menu Bar App
          </div>
          <h1 className="mb-2 text-5xl font-bold tracking-tight text-apple-gray-1 sm:text-6xl">
            Galopen
          </h1>
          <p className="mb-4 text-xl font-medium text-apple-gray-2 sm:text-2xl">
            {t("Hero.tagline")}
          </p>
          <p className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-apple-gray-3">
            {t("Hero.description")}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={RELEASE_URL}
              className="inline-flex items-center gap-2 rounded-xl bg-apple-blue px-6 py-3 text-base font-semibold text-white shadow-lg shadow-apple-blue/25 transition-all hover:-translate-y-0.5 hover:bg-apple-blue-dark hover:shadow-xl hover:shadow-apple-blue/30"
            >
              <Download size={18} strokeWidth={2} />
              {t("Hero.download")}
            </a>
            <a
              href={GITHUB_URL}
              className="inline-flex items-center gap-2 rounded-xl border border-apple-gray-4 bg-apple-card px-6 py-3 text-base font-semibold text-apple-gray-1 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <Github size={18} strokeWidth={2} />
              {t("Hero.viewOnGithub")}
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-sm font-semibold tracking-widest text-apple-gray-3 uppercase">
            {t("Features.title")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="rounded-2xl border border-apple-gray-4/60 bg-apple-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-xl bg-apple-blue/10 p-2.5">
                  <Icon size={20} strokeWidth={1.75} className="text-apple-blue" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-apple-gray-1">
                  {t(`Features.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-apple-gray-2">
                  {t(`Features.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-apple-gray-1">
            {t("CTA.title")}
          </h2>
          <p className="mb-8 text-base text-apple-gray-2">{t("CTA.description")}</p>
          <a
            href={RELEASE_URL}
            className="inline-flex items-center gap-2 rounded-xl bg-apple-blue px-6 py-3 text-base font-semibold text-white shadow-lg shadow-apple-blue/25 transition-all hover:-translate-y-0.5 hover:bg-apple-blue-dark hover:shadow-xl hover:shadow-apple-blue/30"
          >
            <Download size={18} strokeWidth={2} />
            {t("CTA.download")}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-apple-gray-4/60 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="text-sm text-apple-gray-3">
            {t("Footer.madeBy")}{" "}
            <a
              href={GITHUB_URL}
              className="font-medium text-apple-gray-2 transition-colors hover:text-apple-blue"
            >
              piro0919
            </a>
          </span>
          <div className="flex items-center gap-5">
            <a
              href={GITHUB_URL}
              className="inline-flex items-center gap-1.5 text-sm text-apple-gray-3 transition-colors hover:text-apple-blue"
            >
              <Github size={14} strokeWidth={1.75} />
              {t("Footer.openSource")}
            </a>
            <a
              href={COFFEE_URL}
              className="inline-flex items-center gap-1.5 text-sm text-apple-gray-3 transition-colors hover:text-apple-blue"
            >
              <Coffee size={14} strokeWidth={1.75} />
              {t("Footer.buyMeACoffee")}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
