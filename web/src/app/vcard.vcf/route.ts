/**
 * `/vcard.vcf` — the "save contact" conversion target (QR → phone contacts).
 *
 * Strictly vCard VERSION:3.0 (4.0 breaks iOS) with CRLF line endings. Both
 * `N` and `FN` are present (iOS requires both). Social links are doubled as
 * `X-SOCIALPROFILE` (iOS) and `itemN.URL` + `itemN.X-ABLabel` (Android /
 * other clients). No PHOTO yet — phase 2 (base64 JPEG with 75-octet folding).
 *
 * The dot in the path keeps it outside the next-intl middleware matcher, so
 * it serves locale-less. In-app browsers (Telegram/Instagram) block .vcf
 * downloads — the sticky CTA shows a copy-the-number fallback there.
 */

const VCARD_LINES = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "N:Pustovoi;Andrei;;;",
  "FN:Andrei Pustovoi",
  "ORG:suslicketeam",
  "TITLE:Full-Stack & AI Developer",
  "TEL;TYPE=CELL:+77474772302",
  "EMAIL;TYPE=INTERNET:admin@suslicketeam.com",
  "ADR;TYPE=WORK:;;;Almaty;;;Kazakhstan",
  "URL:https://suslicke.com",
  "item1.URL:https://www.linkedin.com/in/suslicke",
  "item1.X-ABLabel:LinkedIn",
  "item2.URL:https://t.me/Suslicke",
  "item2.X-ABLabel:Telegram",
  "X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/suslicke",
  "X-SOCIALPROFILE;TYPE=telegram:https://t.me/Suslicke",
  "END:VCARD",
] as const;

// vCard 3.0 mandates CRLF, including after the final END:VCARD.
const VCARD_BODY = VCARD_LINES.join("\r\n") + "\r\n";

export function GET(): Response {
  return new Response(VCARD_BODY, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="andrei-pustovoi.vcf"',
      // The card changes only with a deploy; let clients cache briefly.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
