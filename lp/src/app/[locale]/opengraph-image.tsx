import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";

export const alt = "Galopen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* ビルド時に焼く。動的なままだと public/ が関数側に含まれず、
   本番で icon.png を読めずに 500 になる */
export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

/* 出るのは kk-web の一覧で176px、X のカードで500px 前後。
   その大きさで残るのはアイコンと名前と1行だけ。色はアイコンから取る */
const BOARD = "#171043";
const PAPER = "#f4f2fb";
const SKY = "#47baf4";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ImageResponse> {
  const { locale } = await params;
  const isJa = locale === "ja";
  /* 見出しの書体はサイトと同じ M PLUS 1。使う文字だけに絞ったものを
     同梱している。文言を変えたら assets/README.md の手順で作り直す */
  const [icon, font] = await Promise.all([
    readFile(join(process.cwd(), "public/icon.png")),
    readFile(join(process.cwd(), "assets/MPLUS1-500-subset.ttf")),
  ]);
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: BOARD,
        backgroundImage:
          "radial-gradient(60% 60% at 10% 0%, rgba(71,186,244,0.30) 0%, rgba(23,16,67,0) 60%), radial-gradient(60% 70% at 95% 10%, rgba(155,81,235,0.35) 0%, rgba(23,16,67,0) 60%)",
        display: "flex",
        gap: 56,
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: PAPER,
            fontSize: 104,
            letterSpacing: -3,
          }}
        >
          Galopen
        </div>
        <div style={{ color: SKY, display: "flex", fontSize: 38, marginTop: 18 }}>
          {isJa ? "もう会議に遅れない。" : "Never be late to a meeting."}
        </div>
      </div>
      {/* biome-ignore lint/performance/noImgElement: next/image is not available in ImageResponse */}
      <img alt="" height={230} src={iconSrc} width={230} />
    </div>,
    {
      ...size,
      fonts: [
        { data: font, name: "M PLUS 1", style: "normal", weight: 500 },
      ],
    },
  );
}
