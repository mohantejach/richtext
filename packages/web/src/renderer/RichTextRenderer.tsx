import type { ReactNode } from "react";
import type {
  BlockNode,
  DocumentNode,
  InlineNode,
  ListItemNode,
} from "@company/rich-text-core";
import { parseMarkdown } from "@company/rich-text-core";
import { ComponentsProvider } from "../context";
import {
  DefaultBold,
  DefaultCodeBlock,
  DefaultHeading,
  DefaultInlineCode,
  DefaultItalic,
  DefaultLink,
  DefaultList,
  DefaultListItem,
  DefaultMention,
  DefaultParagraph,
} from "../defaults";
import type { CustomComponents } from "../types";

export interface RichTextRendererProps {
  text: string;
  components?: CustomComponents;
  className?: string;
}

export function RichTextRenderer({
  text,
  components = {},
  className,
}: RichTextRendererProps): ReactNode {
  const document = parseMarkdown(text);
  return (
    <ComponentsProvider components={components}>
      <div className={className} data-rich-text-renderer="true">
        <RenderDocument document={document} components={components} />
      </div>
    </ComponentsProvider>
  );
}

function RenderDocument({
  document,
  components,
}: {
  document: DocumentNode;
  components: CustomComponents;
}): ReactNode {
  return document.children.map((node, index) => (
    <RenderBlock key={`${node.type}-${index}`} node={node} components={components} />
  ));
}

function RenderBlock({
  node,
  components,
}: {
  node: BlockNode;
  components: CustomComponents;
}): ReactNode {
  switch (node.type) {
    case "paragraph": {
      const Paragraph = components.Paragraph ?? DefaultParagraph;
      return (
        <Paragraph>
          <RenderInline nodes={node.children} components={components} />
        </Paragraph>
      );
    }
    case "heading": {
      const Heading = components.Heading ?? DefaultHeading;
      return (
        <Heading level={node.level}>
          <RenderInline nodes={node.children} components={components} />
        </Heading>
      );
    }
    case "codeBlock": {
      const CodeBlock = components.CodeBlock ?? DefaultCodeBlock;
      return <CodeBlock language={node.language} value={node.value} />;
    }
    case "list": {
      const List = components.List ?? DefaultList;
      return (
        <List ordered={node.ordered} start={node.start}>
          {node.children.map((item, index) => (
            <RenderListItem key={index} item={item} components={components} />
          ))}
        </List>
      );
    }
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

function RenderListItem({
  item,
  components,
}: {
  item: ListItemNode;
  components: CustomComponents;
}): ReactNode {
  const ListItem = components.ListItem ?? DefaultListItem;
  return (
    <ListItem>
      {item.children.map((child, index) => (
        <RenderBlock key={index} node={child} components={components} />
      ))}
    </ListItem>
  );
}

export function RenderInline({
  nodes,
  components,
}: {
  nodes: InlineNode[];
  components: CustomComponents;
}): ReactNode {
  return nodes.map((node, index) => (
    <RenderInlineNode key={`${node.type}-${index}`} node={node} components={components} />
  ));
}

function RenderInlineNode({
  node,
  components,
}: {
  node: InlineNode;
  components: CustomComponents;
}): ReactNode {
  switch (node.type) {
    case "text":
      return node.value;
    case "hardBreak":
      return <br />;
    case "mention": {
      const Mention = components.Mention ?? DefaultMention;
      return <Mention userId={node.userId} userName={node.userName} />;
    }
    case "bold": {
      const Bold = components.Bold ?? DefaultBold;
      return (
        <Bold>
          <RenderInline nodes={node.children} components={components} />
        </Bold>
      );
    }
    case "italic": {
      const Italic = components.Italic ?? DefaultItalic;
      return (
        <Italic>
          <RenderInline nodes={node.children} components={components} />
        </Italic>
      );
    }
    case "inlineCode": {
      const InlineCode = components.InlineCode ?? DefaultInlineCode;
      return <InlineCode>{node.value}</InlineCode>;
    }
    case "link": {
      const Link = components.Link ?? DefaultLink;
      return (
        <Link href={node.href} title={node.title}>
          <RenderInline nodes={node.children} components={components} />
        </Link>
      );
    }
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}
