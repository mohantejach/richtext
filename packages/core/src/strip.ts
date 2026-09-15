import type { BlockNode, DocumentNode, InlineNode } from "./ast";
import { parseMarkdown } from "./parser";

/**
 * Converts Markdown + `<@userId|userName>` tokens into plain text for Twilio
 * outbound SMS and other plaintext channels.
 *
 * Mentions become `@userName`. Emphasis markers are stripped. Links become
 * `label (href)`. Code fences keep only the inner source.
 */
export function stripMarkdownAndMentions(text: string): string {
  const document = parseMarkdown(text);
  return stripDocument(document).replace(/[ \t]+\n/g, "\n").trim();
}

export function stripDocument(document: DocumentNode): string {
  return document.children.map(stripBlock).join("\n\n");
}

function stripBlock(node: BlockNode): string {
  switch (node.type) {
    case "paragraph":
      return stripInline(node.children);
    case "heading":
      return stripInline(node.children);
    case "codeBlock":
      return node.value;
    case "list":
      return node.children
        .map((item, index) => {
          const marker = node.ordered ? `${(node.start ?? 1) + index}. ` : "- ";
          return item.children
            .map((child) => {
              if (child.type === "paragraph") {
                return `${marker}${stripInline(child.children)}`;
              }
              return stripBlock(child)
                .split("\n")
                .map((line) => `  ${line}`)
                .join("\n");
            })
            .join("\n");
        })
        .join("\n");
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

function stripInline(nodes: InlineNode[]): string {
  return nodes.map(stripInlineNode).join("");
}

function stripInlineNode(node: InlineNode): string {
  switch (node.type) {
    case "text":
      return node.value;
    case "hardBreak":
      return "\n";
    case "mention":
      return `@${node.userName}`;
    case "inlineCode":
      return node.value;
    case "bold":
    case "italic":
      return stripInline(node.children);
    case "link": {
      const label = stripInline(node.children);
      if (!label) {
        return node.href;
      }
      if (label === node.href) {
        return node.href;
      }
      return `${label} (${node.href})`;
    }
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}
