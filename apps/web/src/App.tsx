import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  RichTextEditor,
  RichTextRenderer,
  stripMarkdownAndMentions,
  type CustomComponents,
} from "@company/rich-text-web";
import "@company/rich-text-web/styles.css";
import { PEOPLE, SAMPLES } from "./samples";

function TealMention({ userName }: { userId: string; userName: string }): ReactNode {
  return <span className="pill">@{userName}</span>;
}

function BrandBold({ children }: { children?: ReactNode }): ReactNode {
  return <strong className="brand-bold">{children}</strong>;
}

function BrandCodeBlock({
  language,
  value,
}: {
  language?: string;
  value: string;
}): ReactNode {
  return (
    <pre className="brand-code" data-language={language}>
      <code>{value}</code>
    </pre>
  );
}

const customComponents: CustomComponents = {
  Mention: TealMention,
  Bold: BrandBold,
  CodeBlock: BrandCodeBlock,
};

export default function App(): ReactNode {
  const [sampleId, setSampleId] = useState(SAMPLES[0]?.id ?? "canonical");
  const [markdown, setMarkdown] = useState(SAMPLES[0]?.text ?? "");
  const [useCustom, setUseCustom] = useState(true);

  const components = useCustom ? customComponents : {};
  const sms = useMemo(() => stripMarkdownAndMentions(markdown), [markdown]);
  const handleMentionQuery = useCallback(async (query: string) => {
    const normalized = query.trim().toLowerCase();
    return PEOPLE.filter((person) =>
      person.label.toLowerCase().includes(normalized),
    );
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">richtext</p>
          <h1>Rich text playground</h1>
          <p className="lede">
            Edit Markdown + mention tokens, preview the renderer, and see the Twilio SMS
            strip. Type <kbd>@</kbd> for people and <kbd>:</kbd> for emoji.
          </p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(event) => setUseCustom(event.target.checked)}
          />
          Custom components
        </label>
      </header>

      <div className="toolbar">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className={sample.id === sampleId ? "chip is-active" : "chip"}
            onClick={() => {
              setSampleId(sample.id);
              setMarkdown(sample.text);
            }}
          >
            {sample.label}
          </button>
        ))}
      </div>

      <main className="grid">
        <section className="panel">
          <h2>Editor</h2>
          <RichTextEditor
            value={markdown}
            onChange={setMarkdown}
            components={components}
            placeholder="Write a Slack-like message"
            onMentionQuery={handleMentionQuery}
          />
          <p className="hint">People: Jane Doe, Ada Lovelace, Sam Lee, Grace Hopper</p>
        </section>

        <section className="panel">
          <h2>Renderer</h2>
          <div className="preview">
            <RichTextRenderer text={markdown} components={components} />
          </div>
        </section>
      </main>

      <section className="panel">
        <h2>SMS / Twilio</h2>
        <p className="sms">{sms}</p>
      </section>

      <section className="panel">
        <h2>Stored Markdown</h2>
        <pre className="raw">{markdown}</pre>
      </section>
    </div>
  );
}
