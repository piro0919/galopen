import { ImageResponse } from "next/og";

export const alt = "Galopen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ImageResponse> {
  const { locale } = await params;
  const isJa = locale === "ja";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        gap: 24,
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: next/image not available in ImageResponse */}
      <img
        alt="Galopen"
        src="https://galopen.kkweb.io/icon.png"
        width={160}
        height={160}
        style={{ borderRadius: 32 }}
      />
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-1px",
        }}
      >
        Galopen
      </div>
      <div
        style={{
          fontSize: 28,
          color: "rgba(255,255,255,0.85)",
          maxWidth: 700,
          textAlign: "center",
        }}
      >
        {isJa
          ? "もう会議に遅れない。macOSメニューバーカレンダーアプリ。"
          : "Never miss a meeting again. macOS menu bar calendar app."}
      </div>
    </div>,
    { ...size },
  );
}
