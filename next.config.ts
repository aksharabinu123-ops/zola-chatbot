import bundleAnalyzer from "@next/bundle-analyzer"
import type { NextConfig } from "next"

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

const isGitHubPages = process.env.GITHUB_PAGES === "true"

const nextConfig: NextConfig = withBundleAnalyzer({
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? "/zola-chatbot" : undefined,
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
})

export default nextConfig
