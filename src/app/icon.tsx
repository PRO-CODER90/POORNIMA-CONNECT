import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Simple "PU" monogram until the university supplies an approved crest. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#14213d", borderRadius: 96, color: "#fff", fontSize: 230, fontWeight: 800 }}>
        PU
      </div>
    ),
    size,
  );
}
