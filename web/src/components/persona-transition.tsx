"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Smooth fade between persona views. Server-rendered persona sections are
 * passed as children; the wrapper is keyed by persona so switching personas
 * (client-side navigation via chips/pills) cross-fades instead of hard-cutting.
 * Only transform/opacity are animated; reduced motion disables it entirely.
 */
export function PersonaTransition({
  persona,
  children,
}: {
  persona: string;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={persona}
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
