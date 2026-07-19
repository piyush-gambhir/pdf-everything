/** @type {import('next').NextConfig} */
const config = {
  // Static export -> Cloudflare Worker assets.
  //
  // NOTE: this is why the old `rewrites()` proxy for /api/* is gone. Rewrites
  // are a server feature and silently do nothing under `output: 'export'`, so
  // the client now calls the API by absolute origin instead (see lib/api.ts).
  output: 'export',

  // Served at projects.piyushgambhir.com/pdf-everything/console.
  // The prefix lives here, NOT in the route tree, so app/merge -> …/console/merge.
  basePath: '/pdf-everything/console',

  reactStrictMode: true,

  // Static hosts serve directories, not extensionless paths.
  trailingSlash: true,

  // No image optimisation server in a static export.
  images: { unoptimized: true },
};

export default config;
