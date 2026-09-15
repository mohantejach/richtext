import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { mergeAttributes } from "@tiptap/core";
import type { EmojiItem, MentionQueryHandler } from "../types";
import {
  CodeBlockNodeView,
  HeadingNodeView,
  ListItemNodeView,
  ListNodeView,
  MentionNodeView,
} from "./node-views/node-views";
import { createMentionSuggestion, EmojiSuggestion } from "./suggestions";
import type { EmojiItemRecord } from "../emoji/data";

export interface CreateExtensionsOptions {
  placeholder?: string;
  onMentionQuery?: MentionQueryHandler;
  emojiCatalog?: EmojiItem[];
}

export function createEditorExtensions(
  options: CreateExtensionsOptions = {},
): AnyExtension[] {
  const mentionQuery =
    options.onMentionQuery ??
    (async () => [] as Array<{ id: string; label: string }>);

  const CustomBold = Bold.extend({
    renderHTML({ HTMLAttributes }) {
      return ["strong", mergeAttributes(HTMLAttributes, { "data-rich-text-node": "bold" }), 0];
    },
  });
  const CustomItalic = Italic.extend({
    renderHTML({ HTMLAttributes }) {
      return ["em", mergeAttributes(HTMLAttributes, { "data-rich-text-node": "italic" }), 0];
    },
  });
  const CustomCode = Code.extend({
    renderHTML({ HTMLAttributes }) {
      return ["code", mergeAttributes(HTMLAttributes, { "data-rich-text-node": "inlineCode" }), 0];
    },
  });
  const CustomLink = Link.extend({
    inclusive: false,
    renderHTML({ HTMLAttributes }) {
      return ["a", mergeAttributes(HTMLAttributes, { "data-rich-text-node": "link" }), 0];
    },
  }).configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noreferrer noopener", target: "_blank" },
  });
  const CustomParagraph = Paragraph.extend({
    renderHTML({ HTMLAttributes }) {
      return ["p", mergeAttributes(HTMLAttributes, { "data-rich-text-node": "paragraph" }), 0];
    },
  });
  const CustomHeading = Heading.extend({
    addNodeView() {
      return ReactNodeViewRenderer(HeadingNodeView);
    },
  });
  const CustomCodeBlock = CodeBlock.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockNodeView);
    },
  });
  const CustomBulletList = BulletList.extend({
    addNodeView() {
      return ReactNodeViewRenderer(ListNodeView);
    },
  });
  const CustomOrderedList = OrderedList.extend({
    addNodeView() {
      return ReactNodeViewRenderer(ListNodeView);
    },
  });
  const CustomListItem = ListItem.extend({
    addNodeView() {
      return ReactNodeViewRenderer(ListItemNodeView);
    },
  });
  const CustomMention = Mention.extend({
    addNodeView() {
      return ReactNodeViewRenderer(MentionNodeView);
    },
  }).configure({
    HTMLAttributes: { class: "rt-mention" },
    renderLabel: ({ node }) => `@${node.attrs.label ?? ""}`,
    suggestion: createMentionSuggestion(mentionQuery),
  });

  const catalog: EmojiItemRecord[] | undefined = options.emojiCatalog?.map((item) => ({
    name: item.name,
    char: item.char,
    aliases: item.aliases ?? [],
  }));

  return [
    StarterKit.configure({
      bold: false,
      italic: false,
      code: false,
      codeBlock: false,
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      paragraph: false,
    }),
    CustomBold,
    CustomItalic,
    CustomCode,
    CustomLink,
    CustomParagraph,
    CustomHeading,
    CustomCodeBlock,
    CustomBulletList,
    CustomOrderedList,
    CustomListItem,
    CustomMention,
    Placeholder.configure({ placeholder: options.placeholder ?? "Write a message" }),
    EmojiSuggestion.configure({ catalog }),
  ];
}
