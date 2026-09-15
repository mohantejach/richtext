import { useState, type ReactNode } from "react";
import {
  RichTextEditor,
  RichTextRenderer,
  stripMarkdownAndMentions,
  type CustomComponents,
} from "@company/rich-text-web";
import "@company/rich-text-web/styles.css";

const components: CustomComponents = {
  Mention: ({ userName }): ReactNode => (
    <span
      style={{
        background: "#0f766e",
        color: "#fff",
        borderRadius: 999,
        padding: "0 8px",
        fontWeight: 700,
      }}
    >
      @{userName}
    </span>
  ),
  Bold: ({ children }): ReactNode => (
    <strong style={{ color: "#7c3aed" }}>{children}</strong>
  ),
};

export function ChatExample(): ReactNode {
  const [markdown, setMarkdown] = useState(
    "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!",
  );

  return (
    <div>
      <RichTextEditor
        value={markdown}
        onChange={setMarkdown}
        components={components}
        onMentionQuery={async (query) =>
          [
            { id: "u123", label: "Jane Doe" },
            { id: "u1", label: "Ada Lovelace" },
          ].filter((person) => person.label.toLowerCase().includes(query.toLowerCase()))
        }
      />
      <RichTextRenderer text={markdown} components={components} />
      <p>SMS: {stripMarkdownAndMentions(markdown)}</p>
    </div>
  );
}
