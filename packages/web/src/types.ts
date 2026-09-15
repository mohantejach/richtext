import type { ComponentType, CSSProperties, ReactNode } from "react";

export interface MentionProps {
  userId: string;
  userName: string;
  selected?: boolean;
}

export interface InlineMarkProps {
  children?: ReactNode;
}

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}

export interface LinkProps {
  href: string;
  title?: string;
  children?: ReactNode;
}

export interface CodeBlockProps {
  language?: string;
  value: string;
  children?: ReactNode;
}

export interface ListProps {
  ordered: boolean;
  start?: number;
  children?: ReactNode;
}

export interface ParagraphProps {
  children?: ReactNode;
}

export interface CustomComponents {
  Mention?: ComponentType<MentionProps>;
  Bold?: ComponentType<InlineMarkProps>;
  Italic?: ComponentType<InlineMarkProps>;
  InlineCode?: ComponentType<InlineMarkProps>;
  CodeBlock?: ComponentType<CodeBlockProps>;
  Heading?: ComponentType<HeadingProps>;
  Link?: ComponentType<LinkProps>;
  List?: ComponentType<ListProps>;
  ListItem?: ComponentType<InlineMarkProps>;
  Paragraph?: ComponentType<ParagraphProps>;
}

export interface MentionItem {
  id: string;
  label: string;
}

export interface EmojiItem {
  name: string;
  char: string;
  aliases?: string[];
}

export type MentionQueryHandler = (
  query: string,
) => MentionItem[] | Promise<MentionItem[]>;

export const defaultMentionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0 6px",
  borderRadius: 999,
  background: "#e8f1ff",
  color: "#1d4ed8",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
