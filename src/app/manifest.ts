import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PricePulse India",
    short_name: "PricePulse",
    description: "Compare prices across Indian stores and get price-drop alerts.",
    start_url: "/home",
    display: "standalone",
    background_color: "#14142b",
    theme_color: "#f97316",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
