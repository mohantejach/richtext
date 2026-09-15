export const PEOPLE = [
  { id: "u123", label: "Jane Doe" },
  { id: "u1", label: "Ada Lovelace" },
  { id: "u9", label: "Sam Lee" },
  { id: "u42", label: "Grace Hopper" },
];

export const SAMPLES: Array<{ id: string; label: string; text: string }> = [
  {
    id: "canonical",
    label: "Canonical",
    text: "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!",
  },
  {
    id: "status",
    label: "Heading + list",
    text: [
      "# Status",
      "- ship **v1**",
      "- ask <@u9|Sam Lee>",
      "",
      "See [Help](https://example.com/help).",
      "",
      "```ts",
      "const ok = true;",
      "```",
    ].join("\n"),
  },
  {
    id: "thread",
    label: "Thread",
    text: "Hey <@u1|Ada Lovelace>, the *deploy* is ready.\nPing <@u42|Grace Hopper> if CI is red :rocket:",
  },
];
