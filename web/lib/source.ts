import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  // basePath is applied by Next, so this stays relative to the app root.
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
