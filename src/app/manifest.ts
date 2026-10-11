import type { MetadataRoute } from "next";

// Makes the site installable ("Add to Home Screen" / "Install app").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BMSCE Alumni Network",
    short_name: "BMS Alumni",
    description: "The alumni network of B.M.S. College of Engineering: your batch, your city chapter, messages and The Wall.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4eedd",
    theme_color: "#f4eedd",
    categories: ["social", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Messages", url: "/messages" },
      { name: "The Wall", url: "/noticeboard" },
      { name: "Events", url: "/events" },
    ],
  };
}
