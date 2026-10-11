import type { MetadataRoute } from "next";

// Makes the site installable ("Add to Home Screen" / "Install app").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BMSCE Alumni Network",
    short_name: "BMSCE Alumni",
    description: "BMSCE Alumni Network: your class, your chapter, messages, events and The Wall, for graduates and students of B.M.S. College of Engineering (BMSCE).",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f5f8",
    theme_color: "#f3f5f8",
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
