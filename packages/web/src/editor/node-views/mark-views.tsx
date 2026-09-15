import type { ReactNode } from "react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { useRichTextComponents } from "../../context";
import {
  DefaultBold,
  DefaultInlineCode,
  DefaultItalic,
  DefaultLink,
} from "../../defaults";

/**
 * Mark wrappers used when a team supplies custom inline components.
 * Tiptap 2.11 renders marks as HTML; the renderer applies these components
 * from the AST. The editor uses the same components for mention/heading/
 * codeBlock/list NodeViews, and these wrappers for any host that mounts them.
 */
export function BoldMarkView({ children }: { children?: ReactNode }): ReactNode {
  const { Bold = DefaultBold } = useRichTextComponents();
  return <Bold>{children}</Bold>;
}

export function ItalicMarkView({ children }: { children?: ReactNode }): ReactNode {
  const { Italic = DefaultItalic } = useRichTextComponents();
  return <Italic>{children}</Italic>;
}

export function InlineCodeMarkView({ children }: { children?: ReactNode }): ReactNode {
  const { InlineCode = DefaultInlineCode } = useRichTextComponents();
  return <InlineCode>{children}</InlineCode>;
}

export function LinkMarkView({
  href,
  title,
  children,
}: {
  href: string;
  title?: string;
  children?: ReactNode;
}): ReactNode {
  const { Link = DefaultLink } = useRichTextComponents();
  return (
    <Link href={href} title={title}>
      {children}
    </Link>
  );
}

export function MarkContentHole(): ReactNode {
  return <NodeViewContent as="span" />;
}

export function MarkHost({ children }: { children?: ReactNode }): ReactNode {
  return <NodeViewWrapper as="span">{children}</NodeViewWrapper>;
}
