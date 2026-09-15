import { parseMarkdown } from "../src/parser";
import { serializeMarkdown } from "../src/serializer";
import { astToProseMirror, proseMirrorToAst } from "../src/prosemirror";

describe("parseMarkdown", () => {
  test("parses the canonical Slack-like sample", () => {
    const source =
      "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!";
    const document = parseMarkdown(source);
    expect(document.children).toHaveLength(1);
    const paragraph = document.children[0];
    expect(paragraph?.type).toBe("paragraph");
    if (paragraph?.type !== "paragraph") {
      throw new Error("expected paragraph");
    }
    expect(paragraph.children).toEqual([
      { type: "text", value: "Hello " },
      { type: "bold", children: [{ type: "text", value: "team" }] },
      { type: "text", value: ", check this code " },
      { type: "inlineCode", value: "const x = 1;" },
      { type: "text", value: " and ask " },
      { type: "mention", userId: "u123", userName: "Jane Doe" },
      { type: "text", value: "!" },
    ]);
  });

  test("does not parse markdown inside inline code", () => {
    const document = parseMarkdown("use `**not bold**` and `<@u1|Ada>`");
    const paragraph = document.children[0];
    if (paragraph?.type !== "paragraph") {
      throw new Error("expected paragraph");
    }
    expect(paragraph.children).toEqual([
      { type: "text", value: "use " },
      { type: "inlineCode", value: "**not bold**" },
      { type: "text", value: " and " },
      { type: "inlineCode", value: "<@u1|Ada>" },
    ]);
  });

  test("parses headings, lists, links, and fenced code", () => {
    const source = [
      "# Status",
      "- ship **v1**",
      "- ask <@u9|Sam Lee>",
      "",
      "See [Help](https://example.com/help).",
      "",
      "```ts",
      "const ok = true;",
      "```",
    ].join("\n");
    const document = parseMarkdown(source);
    expect(document.children.map((node) => node.type)).toEqual([
      "heading",
      "list",
      "paragraph",
      "codeBlock",
    ]);
    const heading = document.children[0];
    if (heading?.type !== "heading") {
      throw new Error("expected heading");
    }
    expect(heading.level).toBe(1);

    const list = document.children[1];
    if (list?.type !== "list") {
      throw new Error("expected list");
    }
    expect(list.ordered).toBe(false);
    expect(list.children).toHaveLength(2);

    const paragraph = document.children[2];
    if (paragraph?.type !== "paragraph") {
      throw new Error("expected paragraph");
    }
    expect(paragraph.children[1]).toMatchObject({
      type: "link",
      href: "https://example.com/help",
    });

    const code = document.children[3];
    if (code?.type !== "codeBlock") {
      throw new Error("expected codeBlock");
    }
    expect(code.language).toBe("ts");
    expect(code.value).toBe("const ok = true;");
  });

  test("parses nested bold italic and escaped markers", () => {
    const document = parseMarkdown(
      "This is **bold with *italic* inside** and \\*stars\\*.",
    );
    const paragraph = document.children[0];
    if (paragraph?.type !== "paragraph") {
      throw new Error("expected paragraph");
    }
    expect(paragraph.children).toEqual([
      { type: "text", value: "This is " },
      {
        type: "bold",
        children: [
          { type: "text", value: "bold with " },
          { type: "italic", children: [{ type: "text", value: "italic" }] },
          { type: "text", value: " inside" },
        ],
      },
      { type: "text", value: " and *stars*." },
    ]);
  });

  test("treats a single newline as a hard break", () => {
    const document = parseMarkdown("Line one\nLine two");
    const paragraph = document.children[0];
    if (paragraph?.type !== "paragraph") {
      throw new Error("expected paragraph");
    }
    expect(paragraph.children).toEqual([
      { type: "text", value: "Line one" },
      { type: "hardBreak" },
      { type: "text", value: "Line two" },
    ]);
  });

  test("parses ordered lists and nested unordered lists", () => {
    const source = ["1. alpha", "2. beta", "   - nested"].join("\n");
    const document = parseMarkdown(source);
    const list = document.children[0];
    if (list?.type !== "list") {
      throw new Error("expected list");
    }
    expect(list.ordered).toBe(true);
    expect(list.start).toBe(1);
    expect(list.children).toHaveLength(2);
    const nested = list.children[1]?.children[1];
    expect(nested?.type).toBe("list");
  });

  test("leaves unmatched markers as literal text", () => {
    const document = parseMarkdown("Hello **team");
    const paragraph = document.children[0];
    if (paragraph?.type !== "paragraph") {
      throw new Error("expected paragraph");
    }
    expect(paragraph.children).toEqual([{ type: "text", value: "Hello **team" }]);
  });
});

describe("serializeMarkdown", () => {
  test("round-trips the canonical sample", () => {
    const source =
      "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!";
    const serialized = serializeMarkdown(parseMarkdown(source));
    expect(serialized).toBe(source);
  });

  test("round-trips through ProseMirror JSON", () => {
    const source = "# Title\n\nAsk <@u1|Ada> for the [spec](https://ex.com).";
    const ast = parseMarkdown(source);
    const restored = proseMirrorToAst(astToProseMirror(ast));
    expect(serializeMarkdown(restored)).toBe(serializeMarkdown(ast));
  });
});
