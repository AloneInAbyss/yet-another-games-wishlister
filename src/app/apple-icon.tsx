import { ImageResponse } from "next/og";
import { BRAND_GRADIENT, HEART_PATH } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS: same heart as icon.svg, without rounded corners (iOS adds them). */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_GRADIENT,
      }}
    >
      <svg width="112" height="112" viewBox="0 0 24 24">
        <path d={HEART_PATH} fill="#fff" />
      </svg>
    </div>,
    size,
  );
}
