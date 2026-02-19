import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIA Productivity Tools",
    short_name: "NIA Tools",
    description:
      "NIA Region 3 productivity tools. Automate manual processes into minute-level results. LIPA Summary, Consolidate Billing Unit, Merge Files, IFR Scanner.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#004e3b",
    theme_color: "#004e3b",
    categories: ["productivity", "utilities"],
    lang: "en-PH",
    dir: "ltr",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48 32x32 16x16",
        type: "image/x-icon",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "200x80",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "LIPA Summary",
        short_name: "LIPA",
        description: "Generate summaries from LIPA files",
        url: "/?tool=lipa-summary",
        icons: [{ src: "/logo.png", sizes: "200x80", type: "image/png" }],
      },
      {
        name: "Merge Files",
        short_name: "Merge",
        description: "Merge PDF and Excel files",
        url: "/?tool=merge-files",
        icons: [{ src: "/logo.png", sizes: "200x80", type: "image/png" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
