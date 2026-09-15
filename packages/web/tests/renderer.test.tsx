import { render, screen } from "@testing-library/react";
import { RichTextRenderer } from "../src/renderer/RichTextRenderer";
import { markdownToTiptapJson, tiptapJsonToMarkdown } from "../src/editor/markdown";
import { stripMarkdownAndMentions } from "../src";

describe("RichTextRenderer", () => {
  test("renders markdown and mention tokens with default elements", () => {
    render(
      <RichTextRenderer text="Hello **team**, check `const x = 1;` and ask <@u123|Jane Doe>!" />,
    );
    expect(screen.getByText("team").tagName).toBe("STRONG");
    expect(screen.getByText("const x = 1;").tagName).toBe("CODE");
    expect(screen.getByText("@Jane Doe")).toBeInTheDocument();
  });

  test("uses custom mention and bold components when provided", () => {
    render(
      <RichTextRenderer
        text="Hello **team** and <@u123|Jane Doe>"
        components={{
          Mention: ({ userName }) => <button type="button">{userName}</button>,
          Bold: ({ children }) => <mark>{children}</mark>,
        }}
      />,
    );
    expect(screen.getByText("team").tagName).toBe("MARK");
    expect(screen.getByRole("button", { name: "Jane Doe" })).toBeInTheDocument();
  });

  test("falls back to defaults when only mention is overridden", () => {
    render(
      <RichTextRenderer
        text="**bold** and `code`"
        components={{
          Mention: ({ userName }) => <span>{userName}</span>,
        }}
      />,
    );
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("code").tagName).toBe("CODE");
  });
});

describe("editor markdown bridge", () => {
  test("loads and exports the same markdown string", () => {
    const source =
      "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!";
    const json = markdownToTiptapJson(source);
    expect(tiptapJsonToMarkdown(json)).toBe(source);
  });
});

describe("web stripMarkdownAndMentions re-export", () => {
  test("strips tokens for SMS", () => {
    expect(stripMarkdownAndMentions("Hi <@u1|Ada> **now**")).toBe("Hi @Ada now");
  });
});
