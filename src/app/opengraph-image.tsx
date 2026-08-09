import { ImageResponse } from "next/og";

export const alt = "Mail Orchestrator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(145deg, #F3F1EC 0%, #E8F2EE 45%, #EFE8DC 100%)",
          color: "#1C1B19",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#1F6B5A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 28,
            }}
          >
            ✉
          </div>
          <div style={{ fontSize: 36, letterSpacing: -1 }}>Mail Orchestrator</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxWidth: 900,
            }}
          >
            Оркестратор email-рассылок
          </div>
          <div style={{ fontSize: 28, color: "#6B6760", maxWidth: 760 }}>
            Unisender Go · базы адресов · батчи · статусы доставки
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
