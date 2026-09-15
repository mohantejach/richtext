import { render } from "@testing-library/react";
import { RichTextEditor } from "../src/editor/RichTextEditor";

describe("RichTextEditor", () => {
  test("does not remount when onMentionQuery identity changes", () => {
    const { rerender } = render(
      <RichTextEditor
        value="Hi"
        onChange={() => undefined}
        onMentionQuery={async () => []}
      />,
    );
    const firstSurface = document.querySelector("[data-rich-text-editor='true']");
    expect(firstSurface).not.toBeNull();

    rerender(
      <RichTextEditor
        value="Hi"
        onChange={() => undefined}
        onMentionQuery={async () => []}
      />,
    );

    expect(document.querySelector("[data-rich-text-editor='true']")).toBe(
      firstSurface,
    );
  });
});
