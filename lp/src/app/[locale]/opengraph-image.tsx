import { ImageResponse } from "next/og";

export const alt = "Galopen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BOARD = "#0b0b0c";
const BOARD_2 = "#141416";
const AMBER = "#ffb300";
const PAPER = "#f2f2f0";
const DIM = "rgba(242,242,240,0.45)";
const HAIRLINE = "rgba(242,242,240,0.14)";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ImageResponse> {
  const { locale } = await params;
  const isJa = locale === "ja";

  const rows = isJa
    ? [
        { next: true, status: "12分後", time: "10:30", title: "デザインレビュー" },
        { next: false, status: "—", time: "14:00", title: "1on1 (太郎)" },
        { next: false, status: "—", time: "16:00", title: "スプリント計画" },
        { next: false, status: "—", time: "17:30", title: "全社定例" },
      ]
    : [
        { next: true, status: "IN 12M", time: "10:30", title: "Design review" },
        { next: false, status: "—", time: "14:00", title: "1:1 with Taro" },
        { next: false, status: "—", time: "16:00", title: "Sprint planning" },
        { next: false, status: "—", time: "17:30", title: "All-hands" },
      ];

  return new ImageResponse(
    <div
      style={{
        background: BOARD,
        display: "flex",
        height: "100%",
        padding: "56px 60px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 560,
        }}
      >
        <div style={{ color: PAPER, fontSize: 20, letterSpacing: 10 }}>
          GALOPEN
        </div>
        <div
          style={{
            color: PAPER,
            display: "flex",
            flexDirection: "column",
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 1.2,
            marginTop: 28,
          }}
        >
          {(isJa
            ? ["もう会議に", "遅れない。"]
            : ["Never be late", "to a meeting."]
          ).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div style={{ color: DIM, fontSize: 22, marginTop: 30 }}>
          {isJa
            ? "macOS メニューバー アプリ"
            : "A macOS menu bar app"}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
        <div
          style={{
            background: BOARD_2,
            border: `2px solid ${HAIRLINE}`,
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {rows.map((row) => (
            <div
              key={row.time}
              style={{
                alignItems: "center",
                background: row.next ? "rgba(255,179,0,0.16)" : "transparent",
                borderBottom: `2px solid ${HAIRLINE}`,
                display: "flex",
                gap: 20,
                padding: "22px 24px",
              }}
            >
              <div
                style={{
                  color: row.next ? AMBER : DIM,
                  fontSize: 30,
                  width: 110,
                }}
              >
                {row.time}
              </div>
              <div
                style={{
                  color: row.next ? PAPER : DIM,
                  display: "flex",
                  flex: 1,
                  fontSize: 22,
                }}
              >
                {row.title}
              </div>
              <div
                style={{
                  color: row.next ? AMBER : DIM,
                  fontSize: 18,
                  textAlign: "right",
                }}
              >
                {row.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
