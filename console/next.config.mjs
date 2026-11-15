/** @type {import('next').NextConfig} */
const config = {
  experimental: { agentUpgrade: 'security' },
  output: 'export',

  basePath: '/pdf-everything/console',

  reactStrictMode: true,

  trailingSlash: true,

  images: { unoptimized: true },
};

export default config;
