import {
  Calendar,
  Clock,
  Coffee,
  Download,
  Feather,
  Filter,
  Github,
  Shield,
  ShieldCheck,
  Video,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

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

type PageProps = { params: Promise<{ locale: string }> };

export default async function Page({ params }: PageProps): Promise<ReactNode> {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations();

  const rows = [
    {
      next: true,
      service: t("Hero.mockup.service"),
      status: t("Hero.board.soon"),
      time: "10:30",
      title: t("Hero.mockup.now"),
    },
    {
      next: false,
      service: "Zoom",
      status: t("Hero.board.idle"),
      time: "14:00",
      title: t("Hero.mockup.later"),
    },
    {
      next: false,
      service: t("Hero.board.row3Service"),
      status: t("Hero.board.idle"),
      time: t("Hero.board.row3Time"),
      title: t("Hero.board.row3"),
    },
    {
      next: false,
      service: t("Hero.board.row4Service"),
      status: t("Hero.board.idle"),
      time: t("Hero.board.row4Time"),
      title: t("Hero.board.row4"),
    },
  ];

  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-mono text-sm tracking-[0.3em] text-paper-1 uppercase">
          Galopen
        </span>
        <span className="font-mono text-xs text-paper-3">
          {t("Hero.badge")}
        </span>
      </header>

      <section className="mx-auto grid max-w-6xl gap-14 px-6 pt-10 pb-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12 lg:pt-16 lg:pb-24">
        <div className="min-w-0">
          <h1 className="text-5xl leading-[1.08] font-bold tracking-tight text-paper-1 sm:text-6xl">
            {t("Hero.tagline")}
          </h1>
          <p className="mt-7 max-w-md leading-relaxed text-paper-2">
            {t("Hero.description")}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex items-center justify-center gap-2 bg-amber px-6 py-3.5 text-base font-semibold text-board transition-colors hover:bg-paper-1"
              href={RELEASE_URL}
            >
              <Download size={18} strokeWidth={2} />
              {t("Hero.download")}
            </a>
            <a
              className="inline-flex items-center justify-center gap-2 border border-hairline px-6 py-3.5 text-base font-semibold text-paper-1 transition-colors hover:border-amber hover:text-amber"
              href={GITHUB_URL}
            >
              <Github size={18} strokeWidth={2} />
              {t("Hero.viewOnGithub")}
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-paper-3">
            {t("Hero.freeNote")}
          </p>
        </div>

        <div className="min-w-0">
          <DepartureBoard
            columns={{
              event: t("Hero.board.event"),
              service: t("Hero.board.service"),
              status: t("Hero.board.status"),
              time: t("Hero.board.time"),
            }}
            rows={rows}
            title={t("Hero.board.title")}
            upNext={t("Hero.board.upNext")}
          />
        </div>
      </section>

      {/* Why */}
      <section className="border-y border-hairline bg-board-2 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs tracking-wider text-amber">
            {t("Why.eyebrow")}
          </p>
          <h2 className="mt-5 max-w-3xl text-3xl leading-snug font-bold tracking-tight text-paper-1 sm:text-4xl">
            {t("Why.title")}
          </h2>
          <p className="mt-6 max-w-2xl leading-relaxed text-paper-2">
            {t("Why.description")}
          </p>
        </div>
      </section>

      {/* Supported services */}
      <section className="px-6 py-14">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-mono text-xs tracking-wider text-amber">
              {t("Services.title")}
            </h2>
            <p className="mt-2 max-w-md text-sm text-paper-2">
              {t("Services.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {SERVICES.map((name) => (
              <span
                className="border border-hairline px-4 py-2 font-mono text-xs text-paper-1"
                key={name}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 font-mono text-xs tracking-wider text-amber">
            {t("Features.title")}
          </h2>
          <dl className="border-t border-hairline">
            {FEATURES.map(({ key, icon: Icon }, i) => (
              <div
                className="grid gap-2 border-b border-hairline py-6 sm:grid-cols-[3rem_16rem_1fr] sm:items-baseline sm:gap-6"
                key={key}
              >
                <span className="tabular font-mono text-xs text-paper-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <dt className="flex items-center gap-2.5 text-base font-semibold text-paper-1">
                  <Icon className="text-amber" size={17} strokeWidth={1.75} />
                  {t(`Features.${key}.title`)}
                </dt>
                <dd className="text-sm leading-relaxed text-paper-2">
                  {t(`Features.${key}.description`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-amber px-6 py-20 text-board">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl leading-tight font-bold tracking-tight">
            {t("CTA.title")}
          </h2>
          <p className="mt-4 max-w-lg text-board/75">{t("CTA.description")}</p>
          <a
            className="mt-9 inline-flex items-center gap-2 bg-board px-6 py-3.5 text-base font-semibold text-amber transition-colors hover:bg-board-2"
            href={RELEASE_URL}
          >
            <Download size={18} strokeWidth={2} />
            {t("CTA.download")}
          </a>
          <p className="mt-4 font-mono text-xs text-board/70">
            {t("CTA.requirement")}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="text-sm text-paper-3">
            {t("Footer.madeBy")}{" "}
            <a
              className="text-paper-2 transition-colors hover:text-amber"
              href={GITHUB_URL}
            >
              piro0919
            </a>
          </span>
          <div className="flex items-center gap-5">
            <a
              className="inline-flex items-center gap-1.5 text-sm text-paper-3 transition-colors hover:text-amber"
              href={GITHUB_URL}
            >
              <Github size={14} strokeWidth={1.75} />
              {t("Footer.openSource")}
            </a>
            <a
              className="inline-flex items-center gap-1.5 text-sm text-paper-3 transition-colors hover:text-amber"
              href={COFFEE_URL}
            >
              <Coffee size={14} strokeWidth={1.75} />
              {t("Footer.buyMeACoffee")}
            </a>
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-paper-3 transition-colors hover:text-amber"
              href="/privacy"
            >
              <Shield size={14} strokeWidth={1.75} />
              {t("Footer.privacy")}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

type Row = {
  next: boolean;
  service: string;
  status: string;
  time: string;
  title: string;
};

function DepartureBoard({
  columns,
  rows,
  title,
  upNext,
}: {
  columns: { event: string; service: string; status: string; time: string };
  rows: Row[];
  title: string;
  upNext: string;
}): ReactNode {
  return (
    <div className="border border-hairline bg-board-2">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <span className="font-mono text-xs tracking-[0.25em] text-paper-2 uppercase">
          {title}
        </span>
        <span className="size-2 rounded-full bg-amber blink" />
      </div>
      <div className="grid grid-cols-[4.5rem_1fr_5rem] gap-3 border-b border-hairline px-5 py-2.5 font-mono text-[10px] tracking-wider text-paper-3 uppercase sm:grid-cols-[4.5rem_1fr_7rem_5rem]">
        <span>{columns.time}</span>
        <span>{columns.event}</span>
        <span className="hidden sm:block">{columns.service}</span>
        <span className="text-right">{columns.status}</span>
      </div>
      {rows.map((row) => (
        <div
          className={`grid grid-cols-[4.5rem_1fr_5rem] items-center gap-3 border-b border-hairline px-5 py-4 last:border-b-0 sm:grid-cols-[4.5rem_1fr_7rem_5rem] ${
            row.next ? "bg-amber-dim" : ""
          }`}
          key={row.time}
        >
          <span
            className={`tabular font-mono text-lg ${
              row.next ? "text-amber" : "text-paper-2"
            }`}
          >
            {row.time}
          </span>
          <span
            className={`truncate text-sm ${
              row.next ? "font-semibold text-paper-1" : "text-paper-2"
            }`}
          >
            {row.next ? (
              <span className="mr-2 font-mono text-[10px] tracking-wider text-amber">
                {upNext}
              </span>
            ) : null}
            {row.title}
          </span>
          <span className="hidden font-mono text-xs text-paper-3 sm:block">
            {row.service}
          </span>
          <span
            className={`tabular text-right font-mono text-xs ${
              row.next ? "text-amber blink" : "text-paper-3"
            }`}
          >
            {row.status}
          </span>
        </div>
      ))}
    </div>
  );
}
