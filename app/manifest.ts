import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lontu",
    short_name: "Lontu",
    description: "Catat income, expense, saving, dan transfer, lengkap dengan budget bulanan.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8efe0",
    theme_color: "#f8efe0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tambah Expense",
        short_name: "Expense",
        url: "/add/expense",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
