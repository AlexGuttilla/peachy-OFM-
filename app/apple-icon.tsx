import { ImageResponse } from "next/og";

// Home-screen icon for "Add to Home Screen" on iOS.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#fdefe9",
        }}
      >
        <svg width="150" height="150" viewBox="0 0 100 100">
          <path
            d="M50 35C45 22 32 19.5 24.5 32.5 19 42 18 49 18 57c0 19.5 14.5 33 32 33s32-13.5 32-33c0-8-1-15-6.5-24.5C68 19.5 55 22 50 35Z"
            fill="#f79438"
            stroke="#c2551d"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M50 33c-2-8-5.5-13-11-16"
            fill="none"
            stroke="#2f6b34"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M52 24c4-13 18-19 32-16 1.5 13-9 24-32 16Z"
            fill="#4c9a4e"
            stroke="#2f6b34"
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
