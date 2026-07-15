import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n.ts");

const nextConfig: NextConfig = {
  // Demo polish: never show the floating dev-tools indicator on stage.
  devIndicators: false,
};

export default withNextIntl(nextConfig);
