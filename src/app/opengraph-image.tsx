import { ImageResponse } from "next/og";

export const alt = "PU CafeConnect, Poornima University campus dining";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Text only (no crest) until the university supplies an approved logo file.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 100,
          background: "linear-gradient(135deg,#fde7ef,#fff3d6 50%,#dbe7ff)",
          color: "#14213d",
        }}
      >
        <div style={{ fontSize: 28, color: "#1f4fd1", fontWeight: 700, letterSpacing: 4 }}>POORNIMA UNIVERSITY</div>
        <div style={{ fontSize: 88, fontWeight: 800, marginTop: 16 }}>PU CafeConnect</div>
        <div style={{ fontSize: 38, marginTop: 20, color: "#4b5563" }}>Order from your campus cafes. Pay cash on pickup.</div>
      </div>
    ),
    size,
  );
}
