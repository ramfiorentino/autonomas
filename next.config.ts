import type { NextConfig } from "next";
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [], // static assets only, no dynamic data caching
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default pwaConfig(nextConfig);
