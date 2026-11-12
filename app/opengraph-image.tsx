import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Clearance Lens — pursue defense-tech roles from inside your own agent.";

/**
 * Generated OG image (Next.js's special `opengraph-image` route convention).
 * On-brand but intentionally plain: wordmark + one line, no photography, no
 * mockup (Do-Don't #6 applies here too — this is the one surface where it'd
 * be tempting to fake a product screenshot). Colors are the dark-mode
 * neutral/accent tokens from research/R2-design-system.md §2.1, hardcoded
 * because this renders through Satori, outside the Tailwind/CSS pipeline.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#090a0c",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontFamily: "monospace",
            fontSize: 64,
            fontWeight: 600,
            color: "#e9ebee",
            letterSpacing: "-1px",
          }}
        >
          <span style={{ color: "#418fe1" }}>⌁</span>
          <span>Clearance Lens</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "28px",
            fontFamily: "sans-serif",
            fontSize: 30,
            fontWeight: 400,
            color: "#9ea5af",
            maxWidth: 880,
            lineHeight: 1.4,
          }}
        >
          Pursue defense-tech roles from inside your own agent.
        </div>
      </div>
    ),
    { ...size },
  );
}
