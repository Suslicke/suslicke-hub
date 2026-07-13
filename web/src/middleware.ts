import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`, `/vcard.vcf`)
  // `/qr`, `/hub/*` and the hub `/api/*` endpoints are proxied by nginx to
  // suslicke-hub in production and never reach Next.js.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
