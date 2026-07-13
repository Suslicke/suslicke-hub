import type { ReactNode } from "react";

/**
 * Section heading with an accent marker bar. Uses `var(--accent)`, which
 * persona routes remap via [data-persona] — headings automatically pick up
 * the active persona's color without extra props. Server component.
 */
export function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden
        className="h-8 w-1.5 shrink-0 rounded-full sm:h-10"
        style={{ backgroundColor: "var(--accent)" }}
      />
      <h2
        id={id}
        className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        {children}
      </h2>
    </div>
  );
}
