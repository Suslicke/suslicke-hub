import type { MetadataRoute } from "next";

/**
 * PWA/web-app manifest. Name carries the brand queries ("Andrei Pustovoi",
 * "suslicke"); the icon is the existing `src/app/icon.svg` (served at
 * /icon.svg). Colors are the light-theme hex approximations from
 * `globals.css` (the site is light-first) — keep in sync with the layout's
 * `viewport.themeColor`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Andrei Pustovoi (suslicke)",
    short_name: "suslicke",
    description:
      "Andrei Pustovoi (suslicke) — Full Stack & AI developer in Almaty.",
    start_url: "/",
    display: "minimal-ui",
    background_color: "#f4ede0",
    theme_color: "#f4ede0",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
