import type { CSSProperties, ReactNode } from "react";
import { defaultMentionStyle, type MentionProps } from "./types";

export function DefaultMention({ userName }: MentionProps): ReactNode {
  return (
    <span style={defaultMentionStyle} data-rich-text-node="mention">
      @{userName}
    </span>
  );
}

export function DefaultBold({ children }: { children?: ReactNode }): ReactNode {
  return <strong data-rich-text-node="bold">{children}</strong>;
}

export function DefaultItalic({ children }: { children?: ReactNode }): ReactNode {
  return <em data-rich-text-node="italic">{children}</em>;
}

export function DefaultInlineCode({ children }: { children?: ReactNode }): ReactNode {
  return (
    <code data-rich-text-node="inlineCode" style={inlineCodeStyle}>
      {children}
    </code>
  );
}

export function DefaultLink({
  href,
  title,
  children,
}: {
  href: string;
  title?: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <a
      data-rich-text-node="link"
      href={href}
      title={title}
      target="_blank"
      rel="noreferrer noopener"
    >
      {children}
    </a>
  );
}

export function DefaultHeading({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}): ReactNode {
  const Tag = `h${level}` as const;
  return <Tag data-rich-text-node="heading">{children}</Tag>;
}

export function DefaultCodeBlock({
  language,
  value,
}: {
  language?: string;
  value: string;
}): ReactNode {
  return (
    <pre data-rich-text-node="codeBlock" data-language={language} style={codeBlockStyle}>
      <code>{value}</code>
    </pre>
  );
}

export function DefaultList({
  ordered,
  start,
  children,
}: {
  ordered: boolean;
  start?: number;
  children?: ReactNode;
}): ReactNode {
  if (ordered) {
    return (
      <ol data-rich-text-node="list" start={start}>
        {children}
      </ol>
    );
  }
  return <ul data-rich-text-node="list">{children}</ul>;
}

export function DefaultListItem({ children }: { children?: ReactNode }): ReactNode {
  return <li data-rich-text-node="listItem">{children}</li>;
}

export function DefaultParagraph({ children }: { children?: ReactNode }): ReactNode {
  return <p data-rich-text-node="paragraph">{children}</p>;
}

const inlineCodeStyle: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  background: "#f3f4f6",
  padding: "1px 4px",
  borderRadius: 4,
  fontSize: "0.9em",
};

const codeBlockStyle: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  background: "#0f172a",
  color: "#e2e8f0",
  padding: 12,
  borderRadius: 8,
  overflow: "auto",
};
