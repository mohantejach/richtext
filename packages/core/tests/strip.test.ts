import { stripMarkdownAndMentions } from "../src/strip";

describe("stripMarkdownAndMentions", () => {
  test("converts the canonical sample to SMS plaintext", () => {
    const source =
      "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!";
    expect(stripMarkdownAndMentions(source)).toBe(
      "Hello team, check this code const x = 1; and ask @Jane Doe!",
    );
  });

  test("strips headings, lists, links, and fences", () => {
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
    expect(stripMarkdownAndMentions(source)).toBe(
      [
        "Status",
        "- ship v1\n- ask @Sam Lee",
        "See Help (https://example.com/help).",
        "const ok = true;",
      ].join("\n\n"),
    );
  });

  test("preserves escaped literal asterisks", () => {
    expect(stripMarkdownAndMentions("Show \\*stars\\*")).toBe("Show *stars*");
  });
});
