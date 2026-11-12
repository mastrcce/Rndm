import { ImageResponse } from "next/og";

export const alt = "Rohmilch-Finder – Rohmilchautomaten und Hofläden in Deutschland";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f8f4ea", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#1f4d33", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 26, height: 44, background: "#fdfbf6", borderRadius: 6 }} />
          </div>
          <div style={{ fontSize: 40, color: "#173424", fontWeight: 700 }}>Rohmilch-Finder</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, color: "#173424", fontWeight: 700, lineHeight: 1.05 }}>Finde frische Rohmilch in deiner Nähe.</div>
          <div style={{ fontSize: 32, color: "#5c6a61", marginTop: 24 }}>Milchautomaten, Hofläden und Bauernhöfe in ganz Deutschland</div>
        </div>
        <div style={{ display: "flex", height: 14, background: "#84a06e", borderRadius: 7, width: 280 }} />
      </div>
    ),
    size,
  );
}
