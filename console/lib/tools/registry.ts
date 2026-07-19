import type { AnyToolDefinition, ToolDefinition } from './types';
import { mergeTool } from './merge';
import { splitTool } from './split';
import { rotateTool } from './rotate';
import { removePagesTool } from './remove-pages';
import { extractPagesTool } from './extract-pages';
import { reorderTool } from './reorder';
import { cropTool } from './crop';
import { watermarkTool } from './watermark';
import { pageNumbersTool } from './page-numbers';
import { metadataTool } from './metadata';
import { imagesToPdfTool } from './images-to-pdf';
import { extractTextTool } from './extract-text';
import { resizePagesTool } from './resize-pages';
import { pageSizeConvertTool } from './page-size-convert';
import { formsFillTool } from './forms-fill';
import { formsFlattenTool } from './forms-flatten';
import { formsExtractTool } from './forms-extract';

export const TOOLS: ToolDefinition<unknown>[] = [
  mergeTool,
  splitTool,
  rotateTool,
  removePagesTool,
  extractPagesTool,
  reorderTool,
  cropTool,
  watermarkTool,
  pageNumbersTool,
  metadataTool,
  imagesToPdfTool,
  extractTextTool,
  resizePagesTool,
  pageSizeConvertTool,
  formsFillTool,
  formsFlattenTool,
  formsExtractTool,
] as unknown as ToolDefinition<unknown>[];

export function getTool(id: string): AnyToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function toolsByCategory(): Map<string, AnyToolDefinition[]> {
  const map = new Map<string, AnyToolDefinition[]>();
  for (const t of TOOLS) {
    const list = map.get(t.category) ?? [];
    list.push(t);
    map.set(t.category, list);
  }
  return map;
}
