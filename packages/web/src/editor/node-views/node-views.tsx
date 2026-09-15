import type { ReactNode } from "react";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useRichTextComponents } from "../../context";
import {
  DefaultCodeBlock,
  DefaultHeading,
  DefaultList,
  DefaultListItem,
  DefaultMention,
  DefaultParagraph,
} from "../../defaults";

export function MentionNodeView({ node }: NodeViewProps): ReactNode {
  const { Mention = DefaultMention } = useRichTextComponents();
  return (
    <NodeViewWrapper as="span" data-rich-text-node="mention">
      <Mention userId={String(node.attrs.id ?? "")} userName={String(node.attrs.label ?? "")} />
    </NodeViewWrapper>
  );
}

export function CodeBlockNodeView({ node }: NodeViewProps): ReactNode {
  const { CodeBlock = DefaultCodeBlock } = useRichTextComponents();
  const language = node.attrs.language ? String(node.attrs.language) : undefined;
  const value = node.textContent;
  return (
    <NodeViewWrapper data-rich-text-node="codeBlock">
      <CodeBlock language={language} value={value}>
        <NodeViewContent as="code" />
      </CodeBlock>
    </NodeViewWrapper>
  );
}

export function HeadingNodeView({ node }: NodeViewProps): ReactNode {
  const { Heading = DefaultHeading } = useRichTextComponents();
  const rawLevel = Number(node.attrs.level ?? 1);
  const level = Math.min(Math.max(rawLevel, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6;
  return (
    <NodeViewWrapper as="div" data-rich-text-node="heading">
      <Heading level={level}>
        <NodeViewContent as="span" />
      </Heading>
    </NodeViewWrapper>
  );
}

export function ParagraphNodeView(): ReactNode {
  const { Paragraph = DefaultParagraph } = useRichTextComponents();
  return (
    <NodeViewWrapper as="div" data-rich-text-node="paragraph">
      <Paragraph>
        <NodeViewContent as="span" />
      </Paragraph>
    </NodeViewWrapper>
  );
}

export function ListNodeView({ node }: NodeViewProps): ReactNode {
  const { List = DefaultList } = useRichTextComponents();
  const ordered = node.type.name === "orderedList";
  const start = ordered ? Number(node.attrs.start ?? 1) : undefined;
  return (
    <NodeViewWrapper as="div" data-rich-text-node="list">
      <List ordered={ordered} start={start}>
        <NodeViewContent as="div" />
      </List>
    </NodeViewWrapper>
  );
}

export function ListItemNodeView(): ReactNode {
  const { ListItem = DefaultListItem } = useRichTextComponents();
  return (
    <NodeViewWrapper as="div" data-rich-text-node="listItem">
      <ListItem>
        <NodeViewContent as="div" />
      </ListItem>
    </NodeViewWrapper>
  );
}
