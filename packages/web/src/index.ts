export { RichTextRenderer } from "./renderer/RichTextRenderer";
export type { RichTextRendererProps } from "./renderer/RichTextRenderer";
export { RichTextEditor } from "./editor/RichTextEditor";
export type { RichTextEditorProps } from "./editor/RichTextEditor";
export { markdownToTiptapJson, tiptapJsonToMarkdown } from "./editor/markdown";
export { createEditorExtensions } from "./editor/extensions";
export { EMOJI_CATALOG, searchEmoji } from "./emoji/data";
export { ComponentsProvider, useRichTextComponents } from "./context";
export {
  DefaultMention,
  DefaultBold,
  DefaultItalic,
  DefaultInlineCode,
  DefaultLink,
  DefaultHeading,
  DefaultCodeBlock,
  DefaultList,
  DefaultListItem,
  DefaultParagraph,
} from "./defaults";
export type {
  CustomComponents,
  MentionProps,
  InlineMarkProps,
  HeadingProps,
  LinkProps,
  CodeBlockProps,
  ListProps,
  ParagraphProps,
  MentionItem,
  EmojiItem,
  MentionQueryHandler,
} from "./types";
export { stripMarkdownAndMentions, parseMarkdown, serializeMarkdown } from "@company/rich-text-core";
