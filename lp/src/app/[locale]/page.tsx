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

const SERVICES = ["Zoom", "Google Meet", "Microsoft Teams", "Webex"];

export default function Page(): ReactNode {
  const t = useTranslations();

  return (
    <main className="min-h-dvh">
      {/* Hero */}
      <section className="hero-bg relative overflow-hidden px-6 pt-16 pb-24">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:items-center lg:gap-10">
          {/* Hero copy */}
          <div className="fade-up text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-apple-border bg-apple-card/70 px-4 py-1.5 text-sm font-medium text-apple-blue backdrop-blur">
              <Calendar size={16} strokeWidth={1.75} />
              {t("Hero.badge")}
            </div>
            <div className="mb-6 flex items-center justify-center gap-4 lg:justify-start">
              <Image
                src="/icon.png"
                alt="Galopen"
                width={72}
                height={72}
                className="rounded-[18px] drop-shadow-xl"
                priority
              />
              <h1 className="text-5xl font-bold tracking-tight text-apple-gray-1 sm:text-6xl">
                Galopen
              </h1>
            </div>
            <p className="mb-4 text-2xl font-semibold tracking-tight text-apple-gray-1 sm:text-3xl">
              {t("Hero.tagline")}
            </p>
            <p className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-apple-gray-2 lg:mx-0">
              {t("Hero.description")}
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href={RELEASE_URL}
                className="inline-flex items-center gap-2 rounded-xl bg-apple-blue px-6 py-3 text-base font-semibold text-white shadow-lg shadow-apple-blue/25 transition-all hover:-translate-y-0.5 hover:bg-apple-blue-dark hover:shadow-xl hover:shadow-apple-blue/30"
              >
                <Download size={18} strokeWidth={2} />
                {t("Hero.download")}
              </a>
              <a
                href={GITHUB_URL}
                className="inline-flex items-center gap-2 rounded-xl border border-apple-border bg-apple-card px-6 py-3 text-base font-semibold text-apple-gray-1 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Github size={18} strokeWidth={2} />
                {t("Hero.viewOnGithub")}
              </a>
            </div>
            <p className="mt-5 text-center text-xs text-apple-gray-3 lg:text-left">
              {t("Hero.freeNote")}
            </p>
          </div>

          {/* Menu bar mockup */}
          <div className="fade-up" style={{ animationDelay: "120ms" }}>
            <MenuBarMockup
              until={t("Hero.mockup.until")}
              nowLabel={t("Hero.mockup.nowLabel")}
              now={t("Hero.mockup.now")}
              nowTime={t("Hero.mockup.nowTime")}
              later={t("Hero.mockup.later")}
              laterTime={t("Hero.mockup.laterTime")}
              service={t("Hero.mockup.service")}
            />
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-widest text-apple-blue uppercase">
            {t("Why.eyebrow")}
          </p>
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-apple-gray-1 sm:text-4xl">
            {t("Why.title")}
          </h2>
          <p className="text-lg leading-relaxed text-apple-gray-2">{t("Why.description")}</p>
        </div>
      </section>

      {/* Supported services */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-3 text-sm font-semibold tracking-widest text-apple-gray-3 uppercase">
            {t("Services.title")}
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm text-apple-gray-2">
            {t("Services.description")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {SERVICES.map((name) => (
              <span
                key={name}
                className="rounded-full border border-apple-border bg-apple-card px-4 py-2 text-sm font-medium text-apple-gray-1"
              >
                {name}
              </span>
            ))}
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
                className="rounded-2xl border border-apple-border bg-apple-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
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
          <p className="mt-4 text-xs text-apple-gray-3">{t("CTA.requirement")}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-apple-border px-6 py-8">
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

type MockupProps = {
  until: string;
  nowLabel: string;
  now: string;
  nowTime: string;
  later: string;
  laterTime: string;
  service: string;
};

function MenuBarMockup({
  until,
  nowLabel,
  now,
  nowTime,
  later,
  laterTime,
  service,
}: MockupProps): ReactNode {
  return (
    <div className="mx-auto w-full max-w-md">
      {/* Fake macOS menu bar strip */}
      <div className="mockup-shell flex items-center justify-end gap-3 rounded-t-2xl px-4 py-1.5 text-xs">
        <span className="text-apple-gray-3">{until}</span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-apple-blue/10 px-2 py-0.5 font-semibold text-apple-blue">
          <span className="size-1.5 rounded-full bg-apple-blue dot-pulse" />
          12m
        </span>
      </div>

      {/* Dropdown body */}
      <div
        className="mockup-shell -mt-px overflow-hidden rounded-b-2xl"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
      >
        {/* "Up next" highlighted */}
        <div className="border-b border-apple-border px-4 py-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-apple-blue uppercase">
              {nowLabel}
            </span>
            <span className="text-xs text-apple-gray-3">{nowTime}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="size-2 shrink-0 rounded-full bg-apple-blue" />
            <span className="flex-1 truncate text-sm font-semibold text-apple-gray-1">{now}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-apple-blue px-2 py-0.5 text-[11px] font-semibold text-white">
              <Video size={11} strokeWidth={2.25} />
              {service}
            </span>
          </div>
        </div>

        {/* Later */}
        <div className="px-4 py-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-apple-gray-3 uppercase">
              Later
            </span>
            <span className="text-xs text-apple-gray-3">{laterTime}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="size-2 shrink-0 rounded-full bg-[#34c759]" />
            <span className="flex-1 truncate text-sm text-apple-gray-2">{later}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
