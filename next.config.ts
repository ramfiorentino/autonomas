import type { NextConfig } from "next";
import withPWA from "next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [], // static assets only, no dynamic data caching
});

const nextConfig: NextConfig = {
  turbopack: {}, // acknowledge Turbopack; next-pwa webpack config only runs in production builds
};

export default pwaConfig(withNextIntl(nextConfig));
