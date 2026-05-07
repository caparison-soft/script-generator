/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CAPARISON_BASE_URL: process.env.CAPARISON_BASE_URL,
    NEXT_PUBLIC_CAPARISON_API_KEY: process.env.CAPARISON_API_KEY,
  },
};

export default nextConfig;
