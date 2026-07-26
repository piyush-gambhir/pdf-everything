// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"architecture.mdx": () => import("../content/docs/architecture.mdx?collection=docs"), "deployment.mdx": () => import("../content/docs/deployment.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "quickstart.mdx": () => import("../content/docs/quickstart.mdx?collection=docs"), "tools.mdx": () => import("../content/docs/tools.mdx?collection=docs"), "workers.mdx": () => import("../content/docs/workers.mdx?collection=docs"), }),
};
export default browserCollections;