import type { BlockNode, DocumentNode, InlineNode, ListNode } from "./ast";

export interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, string>;
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: ProseMirrorMark[];
  content?: ProseMirrorNode[];
}

export function astToProseMirror(document: DocumentNode): ProseMirrorNode {
  return {
    type: "doc",
    content:
      document.children.length > 0
        ? document.children.map(blockToProseMirror)
        : [{ type: "paragraph" }],
  };
}

export function proseMirrorToAst(doc: ProseMirrorNode): DocumentNode {
  const content = doc.content ?? [];
  const children: BlockNode[] = [];
  for (const node of content) {
    const block = proseMirrorToBlock(node);
    if (block) {
      children.push(block);
    }
  }
  return { type: "document", children };
}

function blockToProseMirror(node: BlockNode): ProseMirrorNode {
  switch (node.type) {
    case "paragraph":
      return {
        type: "paragraph",
        content: inlineToProseMirror(node.children),
      };
    case "heading":
      return {
        type: "heading",
        attrs: { level: node.level },
        content: inlineToProseMirror(node.children),
      };
    case "codeBlock":
      return {
        type: "codeBlock",
        attrs: { language: node.language ?? null },
        content: node.value ? [{ type: "text", text: node.value }] : [],
      };
    case "list":
      return {
        type: node.ordered ? "orderedList" : "bulletList",
        attrs: node.ordered ? { start: node.start ?? 1 } : undefined,
        content: node.children.map((item) => ({
          type: "listItem",
          content: item.children.map((child) =>
            child.type === "list" ? blockToProseMirror(child) : blockToProseMirror(child),
          ),
        })),
      };
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

function inlineToProseMirror(nodes: InlineNode[]): ProseMirrorNode[] | undefined {
  const content: ProseMirrorNode[] = [];
  for (const node of nodes) {
    content.push(...inlineNodeToProseMirror(node, []));
  }
  return content.length > 0 ? content : undefined;
}

function inlineNodeToProseMirror(
  node: InlineNode,
  marks: ProseMirrorMark[],
): ProseMirrorNode[] {
  switch (node.type) {
    case "text":
      return [
        {
          type: "text",
          text: node.value,
          ...(marks.length > 0 ? { marks: [...marks] } : {}),
        },
      ];
    case "hardBreak":
      return [{ type: "hardBreak", ...(marks.length > 0 ? { marks: [...marks] } : {}) }];
    case "mention":
      return [
        {
          type: "mention",
          attrs: { id: node.userId, label: node.userName },
        },
      ];
    case "inlineCode":
      return [
        {
          type: "text",
          text: node.value,
          marks: [...marks, { type: "code" }],
        },
      ];
    case "bold":
      return node.children.flatMap((child) =>
        inlineNodeToProseMirror(child, [...marks, { type: "bold" }]),
      );
    case "italic":
      return node.children.flatMap((child) =>
        inlineNodeToProseMirror(child, [...marks, { type: "italic" }]),
      );
    case "link":
      return node.children.flatMap((child) =>
        inlineNodeToProseMirror(child, [
          ...marks,
          { type: "link", attrs: { href: node.href } },
        ]),
      );
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

function proseMirrorToBlock(node: ProseMirrorNode): BlockNode | undefined {
  switch (node.type) {
    case "paragraph":
      return { type: "paragraph", children: proseMirrorToInline(node.content ?? []) };
    case "heading": {
      const rawLevel = Number(node.attrs?.level ?? 1);
      const level = Math.min(Math.max(rawLevel, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6;
      return {
        type: "heading",
        level,
        children: proseMirrorToInline(node.content ?? []),
      };
    }
    case "codeBlock": {
      const text = (node.content ?? []).map((child) => child.text ?? "").join("");
      const language = node.attrs?.language;
      return {
        type: "codeBlock",
        language: typeof language === "string" && language.length > 0 ? language : undefined,
        value: text,
      };
    }
    case "bulletList":
    case "orderedList":
      return {
        type: "list",
        ordered: node.type === "orderedList",
        start:
          node.type === "orderedList" ? Number(node.attrs?.start ?? 1) : undefined,
        children: (node.content ?? []).map((item) => ({
          type: "listItem" as const,
          children: (item.content ?? [])
            .map((child) => proseMirrorToBlock(child))
            .filter((child): child is ParagraphNodeOrList => child !== undefined),
        })),
      };
    default:
      return undefined;
  }
}

type ParagraphNodeOrList = Extract<BlockNode, { type: "paragraph" | "list" }>;

function proseMirrorToInline(nodes: ProseMirrorNode[]): InlineNode[] {
  const result: InlineNode[] = [];
  for (const node of nodes) {
    if (node.type === "mention") {
      result.push({
        type: "mention",
        userId: String(node.attrs?.id ?? ""),
        userName: String(node.attrs?.label ?? ""),
      });
      continue;
    }
    if (node.type === "hardBreak") {
      result.push({ type: "hardBreak" });
      continue;
    }
    if (node.type === "text") {
      result.push(wrapMarks(node.text ?? "", node.marks ?? []));
    }
  }
  return flattenInline(result);
}

function wrapMarks(text: string, marks: ProseMirrorMark[]): InlineNode {
  let node: InlineNode = { type: "text", value: text };
  const ordered = [...marks].sort((left, right) => markRank(left.type) - markRank(right.type));
  for (const mark of ordered) {
    if (mark.type === "code") {
      node = { type: "inlineCode", value: text };
      continue;
    }
    if (mark.type === "bold") {
      node = { type: "bold", children: [node] };
      continue;
    }
    if (mark.type === "italic") {
      node = { type: "italic", children: [node] };
      continue;
    }
    if (mark.type === "link") {
      node = {
        type: "link",
        href: mark.attrs?.href ?? "",
        title: undefined,
        children: [node],
      };
    }
  }
  return node;
}

function markRank(type: string): number {
  if (type === "code") {
    return 0;
  }
  if (type === "link") {
    return 1;
  }
  if (type === "italic") {
    return 2;
  }
  if (type === "bold") {
    return 3;
  }
  return 4;
}

function flattenInline(nodes: InlineNode[]): InlineNode[] {
  return nodes.filter((node) => !(node.type === "text" && node.value === ""));
}

export function mergeAdjacentLists(document: DocumentNode): DocumentNode {
  const children: BlockNode[] = [];
  for (const child of document.children) {
    const previous = children[children.length - 1];
    if (
      child.type === "list" &&
      previous &&
      previous.type === "list" &&
      previous.ordered === child.ordered
    ) {
      (previous as ListNode).children.push(...child.children);
      continue;
    }
    children.push(child);
  }
  return { type: "document", children };
}
