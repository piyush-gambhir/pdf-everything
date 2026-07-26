const configuredSiteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.replace(
  /\/+$/,
  ""
)

/**
 * The docs are built by the separate `web` app. In production both static
 * apps share one origin and path routing; in development they use separate
 * Next.js servers.
 */
export const DOCS_URL = configuredSiteOrigin
  ? `${configuredSiteOrigin}/pdf-everything/docs/`
  : process.env.NODE_ENV === "development"
    ? "http://localhost:3002/pdf-everything/docs/"
    : "/pdf-everything/docs/"
