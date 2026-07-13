import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Self-hosted on the netcup VPS behind nginx — build a standalone server
  // (`.next/standalone`) for the Docker image.
  output: "standalone",
};

export default withNextIntl(nextConfig);
