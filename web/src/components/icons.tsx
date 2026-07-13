import type { ComponentProps } from "react";

import type { Persona } from "@/lib/config";

/**
 * Inline SVG icon set — hand-drawn simple paths, zero icon dependencies
 * (scaffold rule). Stroke icons (24x24, currentColor) for persona chips,
 * filled brand glyphs (24x24, currentColor) for the footer socials.
 */

type IconProps = ComponentProps<"svg">;

function StrokeIcon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

function FillIcon({ children, ...props }: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" {...props}>
      {children}
    </svg>
  );
}

/* ----------------------------- persona icons ---------------------------- */

export function BriefcaseIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </StrokeIcon>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m8 8-4.5 4L8 16" />
      <path d="m16 8 4.5 4L16 16" />
      <path d="M13.2 5.5 10.8 18.5" />
    </StrokeIcon>
  );
}

export function BadgeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <circle cx="12" cy="10" r="2.4" />
      <path d="M7.5 17c.8-2 2.5-3 4.5-3s3.7 1 4.5 3" />
    </StrokeIcon>
  );
}

export function WaveIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M7 11.5 5.2 9.7a1.7 1.7 0 0 1 2.4-2.4l3 3" />
      <path d="M10.6 10.3 7.4 7.1a1.7 1.7 0 0 1 2.4-2.4l3.8 3.8" />
      <path d="M13.6 8.5l-1.6-1.6a1.7 1.7 0 0 1 2.4-2.4l3.9 3.9c2.3 2.3 2.5 5.9.3 8.1-2.4 2.4-6 2.5-8.3.2l-4-4" />
      <path d="M17.5 19.5c1.3-.2 2.5-1 3.2-2.2" />
    </StrokeIcon>
  );
}

export const PERSONA_ICONS: Record<
  Persona,
  (props: IconProps) => React.JSX.Element
> = {
  biz: BriefcaseIcon,
  dev: CodeIcon,
  hr: BadgeIcon,
  hi: WaveIcon,
};

/* ------------------------------ brand icons ----------------------------- */

export function TelegramIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M21.7 4.1c.3-1.1-.8-1.6-1.7-1.2L2.9 9.7c-1.1.4-1 2 .1 2.3l4.3 1.3 1.6 5.1c.3 1 1.6 1.2 2.3.5l2.3-2.3 4.4 3.2c.8.6 2 .2 2.2-.8l3.6-14.9ZM9 12.9l8.7-5.5c.4-.3.8.3.5.6l-6.6 6.3-.3 3.3-1.5-4.1a.75.75 0 0 1-.8-.6Z" />
    </FillIcon>
  );
}

export function GitHubIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 4-2.4 4.8-4.6 5.1.4.3.7 1 .7 1.9v2.8c0 .3.2.6.7.5 4-1.4 6.8-5.2 6.8-9.7C22 6.6 17.5 2 12 2Z" />
    </FillIcon>
  );
}

export function LinkedInIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4V9.5Z" />
    </FillIcon>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </StrokeIcon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7.5 7.6 5.6a1.5 1.5 0 0 0 1.8 0l7.6-5.6" />
    </StrokeIcon>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2" {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </StrokeIcon>
  );
}
