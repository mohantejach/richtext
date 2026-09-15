import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { ProseMirrorNode } from "@company/rich-text-core";
import { ComponentsProvider } from "../context";
import type {
  CustomComponents,
  EmojiItem,
  MentionQueryHandler,
} from "../types";
import { createEditorExtensions } from "./extensions";
import { markdownToTiptapJson, tiptapJsonToMarkdown } from "./markdown";

export interface RichTextEditorProps {
  value?: string;
  defaultValue?: string;
  onChange?: (markdown: string) => void;
  components?: CustomComponents;
  placeholder?: string;
  onMentionQuery?: MentionQueryHandler;
  emojiCatalog?: EmojiItem[];
  editable?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function RichTextEditor({
  value,
  defaultValue = "",
  onChange,
  components = {},
  placeholder,
  onMentionQuery,
  emojiCatalog,
  editable = true,
  className,
  autoFocus = false,
}: RichTextEditorProps): ReactNode {
  const lastEmitted = useRef<string>(value ?? defaultValue);
  const onChangeRef = useRef(onChange);
  const onMentionQueryRef = useRef(onMentionQuery);
  onChangeRef.current = onChange;
  onMentionQueryRef.current = onMentionQuery;

  const extensions = useMemo(
    () =>
      createEditorExtensions({
        placeholder,
        onMentionQuery: async (query) => {
          if (!onMentionQueryRef.current) {
            return [];
          }
          return onMentionQueryRef.current(query);
        },
        emojiCatalog,
      }),
    [placeholder, emojiCatalog],
  );

  const editor = useEditor(
    {
      extensions,
      content: markdownToTiptapJson(value ?? defaultValue),
      editable,
      autofocus: autoFocus ? "end" : false,
      editorProps: {
        attributes: {
          class: "rt-editor-content",
          "data-rich-text-editor": "true",
        },
      },
      onUpdate: ({ editor: instance }) => {
        const markdown = tiptapJsonToMarkdown(instance.getJSON() as ProseMirrorNode);
        lastEmitted.current = markdown;
        onChangeRef.current?.(markdown);
      },
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || value === undefined) {
      return;
    }
    if (value === lastEmitted.current) {
      return;
    }
    lastEmitted.current = value;
    editor.commands.setContent(markdownToTiptapJson(value), false);
  }, [editor, value]);

  return (
    <ComponentsProvider components={components}>
      <div className={className ? `rt-editor ${className}` : "rt-editor"}>
        <EditorContent editor={editor} />
      </div>
    </ComponentsProvider>
  );
}
