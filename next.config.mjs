/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
