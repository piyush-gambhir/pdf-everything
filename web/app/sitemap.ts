import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const origin = 'https://projects.piyushgambhir.com';
const base = `${origin}/pdf-everything`;
const docs = [
  '',
  '/quickstart',
  '/api-reference',
  '/tools',
  '/architecture',
  '/configuration',
  '/workers',
  '/deployment',
  '/troubleshooting',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${base}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...docs.map((path) => ({
      url: `${base}/docs${path}/`,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 0.9 : 0.7,
    })),
  ];
}
