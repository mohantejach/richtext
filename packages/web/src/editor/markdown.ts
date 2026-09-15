import {
  astToProseMirror,
  parseMarkdown,
  proseMirrorToAst,
  serializeMarkdown,
  type ProseMirrorNode,
} from "@company/rich-text-core";

export function markdownToTiptapJson(text: string): ProseMirrorNode {
  return astToProseMirror(parseMarkdown(text));
}

export function tiptapJsonToMarkdown(json: ProseMirrorNode): string {
  return serializeMarkdown(proseMirrorToAst(json));
}
