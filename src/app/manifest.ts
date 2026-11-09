import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chalk — social posts for small shops",
    short_name: "Chalk",
    description: "Snap today's special, approve your week in one swipe, and publish through Buffer.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#f4efe6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
