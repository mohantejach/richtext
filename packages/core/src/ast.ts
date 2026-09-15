export const NODE_TYPES = [
  "document",
  "paragraph",
  "heading",
  "codeBlock",
  "list",
  "listItem",
  "text",
  "bold",
  "italic",
  "inlineCode",
  "link",
  "mention",
  "hardBreak",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export interface MentionPayload {
  userId: string;
  userName: string;
}

export interface TextNode {
  type: "text";
  value: string;
}

export interface MentionNode extends MentionPayload {
  type: "mention";
}

export interface HardBreakNode {
  type: "hardBreak";
}

export interface BoldNode {
  type: "bold";
  children: InlineNode[];
}

export interface ItalicNode {
  type: "italic";
  children: InlineNode[];
}

export interface InlineCodeNode {
  type: "inlineCode";
  value: string;
}

export interface LinkNode {
  type: "link";
  href: string;
  title: string | undefined;
  children: InlineNode[];
}

export type InlineNode =
  | TextNode
  | MentionNode
  | HardBreakNode
  | BoldNode
  | ItalicNode
  | InlineCodeNode
  | LinkNode;

export interface ParagraphNode {
  type: "paragraph";
  children: InlineNode[];
}

export interface HeadingNode {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineNode[];
}

export interface CodeBlockNode {
  type: "codeBlock";
  language: string | undefined;
  value: string;
}

export interface ListItemNode {
  type: "listItem";
  children: Array<ParagraphNode | ListNode>;
}

export interface ListNode {
  type: "list";
  ordered: boolean;
  start: number | undefined;
  children: ListItemNode[];
}

export type BlockNode = ParagraphNode | HeadingNode | CodeBlockNode | ListNode;

export interface DocumentNode {
  type: "document";
  children: BlockNode[];
}

export type RichTextNode = DocumentNode | BlockNode | ListItemNode | InlineNode;

export function isInlineNode(node: RichTextNode): node is InlineNode {
  return (
    node.type === "text" ||
    node.type === "mention" ||
    node.type === "hardBreak" ||
    node.type === "bold" ||
    node.type === "italic" ||
    node.type === "inlineCode" ||
    node.type === "link"
  );
}

export function createDocument(children: BlockNode[] = []): DocumentNode {
  return { type: "document", children };
}
