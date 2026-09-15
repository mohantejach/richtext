import type { BlockNode, DocumentNode, InlineNode, ListItemNode } from "./ast";

export function serializeMarkdown(document: DocumentNode): string {
  return document.children.map(serializeBlock).join("\n\n");
}

function serializeBlock(node: BlockNode): string {
  switch (node.type) {
    case "paragraph":
      return serializeInline(node.children);
    case "heading":
      return `${"#".repeat(node.level)} ${serializeInline(node.children)}`;
    case "codeBlock": {
      const language = node.language ?? "";
      return `\`\`\`${language}\n${node.value}\n\`\`\``;
    }
    case "list":
      return serializeList(node, 0);
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

function serializeList(
  node: Extract<BlockNode, { type: "list" }>,
  indent: number,
): string {
  const pad = " ".repeat(indent);
  return node.children
    .map((item, index) => serializeListItem(item, node, index, indent, pad))
    .join("\n");
}

function serializeListItem(
  item: ListItemNode,
  list: Extract<BlockNode, { type: "list" }>,
  index: number,
  indent: number,
  pad: string,
): string {
  const marker = list.ordered ? `${(list.start ?? 1) + index}.` : "-";
  const parts: string[] = [];
  for (const child of item.children) {
    if (child.type === "paragraph") {
      const text = serializeInline(child.children);
      if (parts.length === 0) {
        parts.push(`${pad}${marker} ${text}`);
      } else {
        parts.push(`${pad}  ${text}`);
      }
    } else {
      parts.push(serializeList(child, indent + 2));
    }
  }
  return parts.join("\n");
}

function serializeInline(nodes: InlineNode[]): string {
  return nodes.map(serializeInlineNode).join("");
}

function serializeInlineNode(node: InlineNode): string {
  switch (node.type) {
    case "text":
      return escapeText(node.value);
    case "hardBreak":
      return "\n";
    case "mention":
      return `<@${node.userId}|${node.userName}>`;
    case "inlineCode":
      return wrapCode(node.value);
    case "bold":
      return `**${serializeInline(node.children)}**`;
    case "italic":
      return `*${serializeInline(node.children)}*`;
    case "link":
      return `[${serializeInline(node.children)}](${node.href})`;
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

function wrapCode(value: string): string {
  let ticks = 1;
  while (value.includes("`".repeat(ticks))) {
    ticks += 1;
  }
  const fence = "`".repeat(ticks);
  const padded =
    value.startsWith("`") || value.endsWith("`") || value.startsWith(" ")
      ? ` ${value} `
      : value;
  return `${fence}${padded}${fence}`;
}

function escapeText(value: string): string {
  return value.replace(/([\\`*_\[\]<>])/g, "\\$1");
}
