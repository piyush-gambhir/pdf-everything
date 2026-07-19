import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  // Static export -> Cloudflare Worker assets (staged under the basePath by
  // ../scripts/prepare-cloudflare-assets.mjs).
  output: 'export',
  basePath: '/pdf-everything',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default withMDX(config);
