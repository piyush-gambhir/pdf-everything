const configuredSiteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.replace(
  /\/+$/,
  ""
)

export const DOCS_URL = configuredSiteOrigin
  ? `${configuredSiteOrigin}/pdf-everything/docs/`
  : process.env.NODE_ENV === "development"
    ? "http://localhost:3002/pdf-everything/docs/"
    : "/pdf-everything/docs/"
