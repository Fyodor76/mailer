import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1F6B5A",
          borderRadius: 40,
        }}
      >
        <svg
          width="100"
          height="100"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 20.5c0-1.4 1.1-2.5 2.5-2.5h35c1.4 0 2.5 1.1 2.5 2.5v23c0 1.4-1.1 2.5-2.5 2.5h-35c-1.4 0-2.5-1.1-2.5-2.5v-23z"
            stroke="#FFFCFF"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M14 20.5 32 34 50 20.5"
            stroke="#FFFCFF"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="47" cy="17" r="5" fill="#D9ECE6" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
