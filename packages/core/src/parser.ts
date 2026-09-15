import type {
  BlockNode,
  BoldNode,
  CodeBlockNode,
  DocumentNode,
  HeadingNode,
  InlineNode,
  ItalicNode,
  ListItemNode,
  ListNode,
  ParagraphNode,
} from "./ast";
import { createDocument } from "./ast";

const MENTION_PATTERN = /^<@([^|>]+)\|([^>]+)>/;
const HEADING_PATTERN = /^(#{1,6})[ \t]+(.*)$/;
const UNORDERED_LIST_PATTERN = /^(\s*)([-*+])[ \t]+(.*)$/;
const ORDERED_LIST_PATTERN = /^(\s*)(\d+)\.[ \t]+(.*)$/;
const FENCE_PATTERN = /^(`{3,}|~{3,})(.*)$/;

const ESCAPABLE = new Set(["\\", "`", "*", "_", "[", "]", "<", ">"]);

export interface ParseOptions {
  /**
   * When true (default), a single newline inside a paragraph becomes a hard
   * break (Slack-style). When false, single newlines collapse to a space.
   */
  slackLineBreaks?: boolean;
}

export function parseMarkdown(
  source: string,
  options: ParseOptions = {},
): DocumentNode {
  const slackLineBreaks = options.slackLineBreaks ?? true;
  const normalized = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const blocks: BlockNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const fence = matchFence(line);
    if (fence) {
      const { block, nextIndex } = readCodeBlock(lines, index, fence);
      blocks.push(block);
      index = nextIndex;
      continue;
    }

    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      const level = Math.min(heading[1]?.length ?? 1, 6) as HeadingNode["level"];
      const content = heading[2] ?? "";
      blocks.push({
        type: "heading",
        level,
        children: parseInline(content),
      });
      index += 1;
      continue;
    }

    const unordered = line.match(UNORDERED_LIST_PATTERN);
    const ordered = line.match(ORDERED_LIST_PATTERN);
    if (unordered || ordered) {
      const { list, nextIndex } = readList(lines, index, slackLineBreaks);
      blocks.push(list);
      index = nextIndex;
      continue;
    }

    const { paragraph, nextIndex } = readParagraph(lines, index, slackLineBreaks);
    blocks.push(paragraph);
    index = nextIndex;
  }

  return createDocument(blocks);
}

function matchFence(
  line: string,
): { marker: string; language: string | undefined } | undefined {
  const match = line.match(FENCE_PATTERN);
  if (!match) {
    return undefined;
  }
  const language = (match[2] ?? "").trim();
  return {
    marker: match[1] ?? "```",
    language: language.length > 0 ? language : undefined,
  };
}

function readCodeBlock(
  lines: string[],
  start: number,
  opening: { marker: string; language: string | undefined },
): { block: CodeBlockNode; nextIndex: number } {
  const body: string[] = [];
  let index = start + 1;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const closing = line.match(FENCE_PATTERN);
    if (closing && closing[1] === opening.marker && !(closing[2] ?? "").trim()) {
      index += 1;
      break;
    }
    body.push(line);
    index += 1;
  }
  return {
    block: {
      type: "codeBlock",
      language: opening.language || undefined,
      value: body.join("\n"),
    },
    nextIndex: index,
  };
}

function indentWidth(prefix: string): number {
  let width = 0;
  for (const character of prefix) {
    width += character === "\t" ? 4 : 1;
  }
  return width;
}

function readList(
  lines: string[],
  start: number,
  slackLineBreaks: boolean,
): { list: ListNode; nextIndex: number } {
  const first = lines[start] ?? "";
  const firstOrdered = first.match(ORDERED_LIST_PATTERN);
  const ordered = Boolean(firstOrdered);
  const baseIndent = indentWidth(
    (firstOrdered?.[1] ?? first.match(UNORDERED_LIST_PATTERN)?.[1] ?? ""),
  );
  const startNumber = firstOrdered ? Number.parseInt(firstOrdered[2] ?? "1", 10) : undefined;

  const items: ListItemNode[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      const lookahead = peekNonEmpty(lines, index + 1);
      if (!lookahead) {
        break;
      }
      const nextItem = matchListItem(lookahead.line);
      if (!nextItem || indentWidth(nextItem.indent) < baseIndent) {
        break;
      }
      index += 1;
      continue;
    }

    const itemMatch = matchListItem(line);
    if (!itemMatch) {
      break;
    }
    const indent = indentWidth(itemMatch.indent);
    if (indent < baseIndent) {
      break;
    }
    if (indent > baseIndent) {
      break;
    }
    if (itemMatch.ordered !== ordered) {
      break;
    }

    const { item, nextIndex } = readListItem(lines, index, indent, slackLineBreaks);
    items.push(item);
    index = nextIndex;
  }

  return {
    list: {
      type: "list",
      ordered,
      start: ordered ? startNumber : undefined,
      children: items,
    },
    nextIndex: index,
  };
}

function matchListItem(
  line: string,
): { indent: string; ordered: boolean; content: string } | undefined {
  const ordered = line.match(ORDERED_LIST_PATTERN);
  if (ordered) {
    return { indent: ordered[1] ?? "", ordered: true, content: ordered[3] ?? "" };
  }
  const unordered = line.match(UNORDERED_LIST_PATTERN);
  if (unordered) {
    return { indent: unordered[1] ?? "", ordered: false, content: unordered[3] ?? "" };
  }
  return undefined;
}

function readListItem(
  lines: string[],
  start: number,
  itemIndent: number,
  slackLineBreaks: boolean,
): { item: ListItemNode; nextIndex: number } {
  const first = matchListItem(lines[start] ?? "");
  const paragraphLines: string[] = [first?.content ?? ""];
  let index = start + 1;
  const children: Array<ParagraphNode | ListNode> = [];

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      const next = peekNonEmpty(lines, index + 1);
      if (!next) {
        break;
      }
      const nextItem = matchListItem(next.line);
      if (nextItem && indentWidth(nextItem.indent) <= itemIndent) {
        break;
      }
      if (nextItem && indentWidth(nextItem.indent) > itemIndent) {
        flushParagraph();
        const nested = readList(lines, next.index, slackLineBreaks);
        children.push(nested.list);
        index = nested.nextIndex;
        continue;
      }
      index += 1;
      continue;
    }

    const itemMatch = matchListItem(line);
    if (itemMatch && indentWidth(itemMatch.indent) === itemIndent) {
      break;
    }
    if (itemMatch && indentWidth(itemMatch.indent) > itemIndent) {
      flushParagraph();
      const nested = readList(lines, index, slackLineBreaks);
      children.push(nested.list);
      index = nested.nextIndex;
      continue;
    }
    if (itemMatch && indentWidth(itemMatch.indent) < itemIndent) {
      break;
    }

    const continuationIndent = line.match(/^(\s+)/)?.[1] ?? "";
    if (indentWidth(continuationIndent) > itemIndent) {
      paragraphLines.push(line.trim());
      index += 1;
      continue;
    }
    break;
  }

  flushParagraph();

  function flushParagraph(): void {
    const text = paragraphLines.join(slackLineBreaks ? "\n" : " ").trimEnd();
    paragraphLines.length = 0;
    if (text.length > 0) {
      children.push({
        type: "paragraph",
        children: parseInline(text),
      });
    }
  }

  if (children.length === 0) {
    children.push({ type: "paragraph", children: [] });
  }

  return {
    item: { type: "listItem", children },
    nextIndex: index,
  };
}

function peekNonEmpty(
  lines: string[],
  from: number,
): { index: number; line: string } | undefined {
  for (let index = from; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim() !== "") {
      return { index, line };
    }
  }
  return undefined;
}

function readParagraph(
  lines: string[],
  start: number,
  slackLineBreaks: boolean,
): { paragraph: ParagraphNode; nextIndex: number } {
  const collected: string[] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      break;
    }
    if (matchFence(line) || HEADING_PATTERN.test(line) || matchListItem(line)) {
      break;
    }
    collected.push(line);
    index += 1;
  }
  const joined = slackLineBreaks ? collected.join("\n") : collected.join(" ");
  return {
    paragraph: {
      type: "paragraph",
      children: parseInline(joined),
    },
    nextIndex: index,
  };
}

export function parseInline(source: string): InlineNode[] {
  return parseInlineRange(source, 0, source.length).nodes;
}

function parseInlineRange(
  source: string,
  start: number,
  end: number,
): { nodes: InlineNode[]; consumed: number } {
  const nodes: InlineNode[] = [];
  let index = start;

  const pushText = (value: string): void => {
    if (!value) {
      return;
    }
    const last = nodes[nodes.length - 1];
    if (last && last.type === "text") {
      last.value += value;
      return;
    }
    nodes.push({ type: "text", value });
  };

  while (index < end) {
    const remaining = source.slice(index, end);

    if (remaining.startsWith("\n")) {
      nodes.push({ type: "hardBreak" });
      index += 1;
      continue;
    }

    if (remaining.startsWith("\\") && remaining.length > 1) {
      const next = remaining[1] ?? "";
      if (ESCAPABLE.has(next)) {
        pushText(next);
        index += 2;
        continue;
      }
    }

    const mention = remaining.match(MENTION_PATTERN);
    if (mention) {
      nodes.push({
        type: "mention",
        userId: mention[1] ?? "",
        userName: mention[2] ?? "",
      });
      index += mention[0].length;
      continue;
    }

    if (remaining.startsWith("`")) {
      const code = readInlineCode(source, index, end);
      if (code) {
        nodes.push({ type: "inlineCode", value: code.value });
        index = code.end;
        continue;
      }
    }

    if (remaining.startsWith("[")) {
      const link = readLink(source, index, end);
      if (link) {
        nodes.push(link.node);
        index = link.end;
        continue;
      }
    }

    if (remaining.startsWith("***") || remaining.startsWith("___")) {
      const delimiter = remaining.slice(0, 3);
      const closer = findCloser(source, index + 3, end, delimiter);
      if (closer !== -1) {
        const inner = parseInlineRange(source, index + 3, closer).nodes;
        const italic: ItalicNode = { type: "italic", children: inner };
        const bold: BoldNode = { type: "bold", children: [italic] };
        nodes.push(bold);
        index = closer + 3;
        continue;
      }
    }

    if (remaining.startsWith("**") || remaining.startsWith("__")) {
      const delimiter = remaining.slice(0, 2);
      const closer = findCloser(source, index + 2, end, delimiter);
      if (closer !== -1) {
        nodes.push({
          type: "bold",
          children: parseInlineRange(source, index + 2, closer).nodes,
        });
        index = closer + 2;
        continue;
      }
    }

    if (remaining.startsWith("*") || remaining.startsWith("_")) {
      const delimiter = remaining[0] ?? "*";
      if (!isFlankingOpener(source, index, delimiter)) {
        pushText(delimiter);
        index += 1;
        continue;
      }
      const closer = findItalicCloser(source, index + 1, end, delimiter);
      if (closer !== -1) {
        nodes.push({
          type: "italic",
          children: parseInlineRange(source, index + 1, closer).nodes,
        });
        index = closer + 1;
        continue;
      }
    }

    pushText(remaining[0] ?? "");
    index += 1;
  }

  return { nodes, consumed: index - start };
}

function readInlineCode(
  source: string,
  start: number,
  end: number,
): { value: string; end: number } | undefined {
  let tickCount = 0;
  let cursor = start;
  while (cursor < end && source[cursor] === "`") {
    tickCount += 1;
    cursor += 1;
  }
  if (tickCount === 0) {
    return undefined;
  }
  const opener = "`".repeat(tickCount);
  const closeAt = source.indexOf(opener, cursor);
  if (closeAt === -1 || closeAt >= end) {
    return undefined;
  }
  let value = source.slice(cursor, closeAt);
  if (value.startsWith(" ") && value.endsWith(" ") && value.trim() !== "") {
    value = value.slice(1, -1);
  }
  return { value, end: closeAt + tickCount };
}

function readLink(
  source: string,
  start: number,
  end: number,
): { node: Extract<InlineNode, { type: "link" }>; end: number } | undefined {
  if (source[start] !== "[") {
    return undefined;
  }
  const labelEnd = findBalanced(source, start + 1, end, "[", "]");
  if (labelEnd === -1) {
    return undefined;
  }
  if (source[labelEnd + 1] !== "(") {
    return undefined;
  }
  const destEnd = findBalanced(source, labelEnd + 2, end, "(", ")");
  if (destEnd === -1) {
    return undefined;
  }
  const label = source.slice(start + 1, labelEnd);
  const destination = source.slice(labelEnd + 2, destEnd).trim();
  const href = destination.replace(/^<|>$/g, "").split(/\s+/)[0] ?? "";
  if (!href) {
    return undefined;
  }
  return {
    node: {
      type: "link",
      href,
      title: undefined,
      children: parseInline(label),
    },
    end: destEnd + 1,
  };
}

function findBalanced(
  source: string,
  start: number,
  end: number,
  open: string,
  close: string,
): number {
  let depth = 1;
  let index = start;
  while (index < end) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source.startsWith("<@", index)) {
      const mentionEnd = source.indexOf(">", index);
      if (mentionEnd !== -1 && mentionEnd < end) {
        index = mentionEnd + 1;
        continue;
      }
    }
    if (source[index] === "`") {
      const code = readInlineCode(source, index, end);
      if (code) {
        index = code.end;
        continue;
      }
    }
    if (source[index] === open) {
      depth += 1;
    } else if (source[index] === close) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
    index += 1;
  }
  return -1;
}

function findCloser(
  source: string,
  start: number,
  end: number,
  delimiter: string,
): number {
  let index = start;
  while (index <= end - delimiter.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source.startsWith("<@", index)) {
      const mentionEnd = source.indexOf(">", index);
      if (mentionEnd !== -1 && mentionEnd < end) {
        index = mentionEnd + 1;
        continue;
      }
    }
    if (source[index] === "`") {
      const code = readInlineCode(source, index, end);
      if (code) {
        index = code.end;
        continue;
      }
    }
    if (source.startsWith(delimiter, index)) {
      return index;
    }
    index += 1;
  }
  return -1;
}

function findItalicCloser(
  source: string,
  start: number,
  end: number,
  delimiter: string,
): number {
  let index = start;
  while (index < end) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source.startsWith("<@", index)) {
      const mentionEnd = source.indexOf(">", index);
      if (mentionEnd !== -1 && mentionEnd < end) {
        index = mentionEnd + 1;
        continue;
      }
    }
    if (source[index] === "`") {
      const code = readInlineCode(source, index, end);
      if (code) {
        index = code.end;
        continue;
      }
    }
    if (source.startsWith(delimiter + delimiter, index)) {
      index += 2;
      continue;
    }
    if (source[index] === delimiter) {
      return index;
    }
    index += 1;
  }
  return -1;
}

function isFlankingOpener(source: string, index: number, delimiter: string): boolean {
  const prev = index === 0 ? " " : source[index - 1] ?? " ";
  const next = source[index + 1] ?? "";
  if (!next || next === delimiter || /\s/.test(next)) {
    return false;
  }
  if (delimiter === "_" && /[A-Za-z0-9]/.test(prev)) {
    return false;
  }
  return true;
}
