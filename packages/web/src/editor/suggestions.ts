import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import type { MentionItem, MentionQueryHandler } from "../types";
import { searchEmoji, type EmojiItemRecord } from "../emoji/data";
import { SuggestionList, type SuggestionListHandle } from "./suggestion-list";

function createSuggestionRender(): NonNullable<SuggestionOptions["render"]> {
  return () => {
    let component: ReactRenderer<SuggestionListHandle> | undefined;
    return {
      onStart(props) {
        component = new ReactRenderer(SuggestionList, {
          editor: props.editor,
          props: {
            items: props.items,
            command: props.command,
            clientRect: props.clientRect,
          },
        });
      },
      onUpdate(props) {
        component?.updateProps({
          items: props.items,
          command: props.command,
          clientRect: props.clientRect,
        });
      },
      onKeyDown(props) {
        if (props.event.key === "Escape") {
          component?.destroy();
          component = undefined;
          return true;
        }
        return component?.ref?.onKeyDown(props.event) ?? false;
      },
      onExit() {
        component?.destroy();
        component = undefined;
      },
    };
  };
}

export function createMentionSuggestion(
  onQuery: MentionQueryHandler,
): Omit<SuggestionOptions, "editor"> {
  return {
    char: "@",
    allowSpaces: true,
    items: async ({ query }) => {
      const results = await onQuery(query);
      return results.map((item) => ({ id: item.id, label: item.label }));
    },
    command: ({ editor, range, props }) => {
      const mention = props as MentionItem;
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "mention",
            attrs: { id: mention.id, label: mention.label },
          },
          { type: "text", text: " " },
        ])
        .run();
    },
    render: createSuggestionRender(),
  };
}

export const EmojiSuggestion = Extension.create<{ catalog?: EmojiItemRecord[] }>({
  name: "emojiSuggestion",
  addOptions() {
    return { catalog: undefined };
  },
  addProseMirrorPlugins() {
    const catalog = this.options.catalog;
    return [
      Suggestion({
        editor: this.editor,
        char: ":",
        allowSpaces: false,
        items: ({ query }) =>
          searchEmoji(query, catalog).map((item) => ({
            id: item.name,
            label: `${item.char}  :${item.name}:`,
            detail: item.char,
            char: item.char,
          })),
        command: ({ editor, range, props }) => {
          const emoji = props as { char: string };
          editor.chain().focus().insertContentAt(range, `${emoji.char} `).run();
        },
        render: createSuggestionRender(),
      }),
    ];
  },
});
