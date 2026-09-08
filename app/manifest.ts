import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Peachy",
    short_name: "Peachy",
    description: "Schedules, hours and tokens for the Peachy roster",
    start_url: "/",
    display: "standalone",
    background_color: "#fdefe9",
    theme_color: "#fdefe9",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
