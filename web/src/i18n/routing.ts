import { defineRouting } from "next-intl/routing";

import { siteConfig } from "@/lib/config";

export const routing = defineRouting({
  locales: siteConfig.locales,
  defaultLocale: siteConfig.defaultLocale,
  localePrefix: "always",
});
