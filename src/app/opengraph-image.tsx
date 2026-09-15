import { ImageResponse } from "next/og";

// Default social-share image (WhatsApp / LinkedIn / X link previews).
export const alt = "BMSCE Alumni Network — Once BMS. Always BMS.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f0e6",
          color: "#1a1412",
          fontFamily: "serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#c9a24b",
          }}
        >
          Est. 1946 · Bengaluru
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 600,
            color: "#5b1220",
            marginTop: 24,
            lineHeight: 1.05,
          }}
        >
          BMSCE Alumni Network
        </div>
        <div style={{ fontSize: 40, color: "#1a1412", marginTop: 24 }}>
          Once BMS. Always BMS.
        </div>
      </div>
    ),
    { ...size }
  );
}
