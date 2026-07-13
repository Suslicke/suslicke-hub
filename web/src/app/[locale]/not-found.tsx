import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-6 px-4 py-24 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <Link
        href="/"
        className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent"
      >
        {t("back")}
      </Link>
    </main>
  );
}
