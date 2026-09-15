package com.company.richtext.parser

import com.company.richtext.ast.BlockNode
import com.company.richtext.ast.DocumentNode
import com.company.richtext.ast.InlineNode
import com.company.richtext.ast.ListItemChild
import com.company.richtext.ast.ListItemNode
import com.company.richtext.ast.MentionPayload

object MarkdownParser {
    fun parse(source: String, slackLineBreaks: Boolean = true): DocumentNode {
        val normalized = source.replace("\r\n", "\n").replace("\r", "\n")
        val lines = normalized.split("\n")
        val blocks = mutableListOf<BlockNode>()
        var index = 0
        while (index < lines.size) {
            val line = lines[index]
            if (line.trim().isEmpty()) {
                index += 1
                continue
            }
            val fence = matchFence(line)
            if (fence != null) {
                val result = readCodeBlock(lines, index, fence)
                blocks += result.block
                index = result.nextIndex
                continue
            }
            val heading = HEADING.matchEntire(line)
            if (heading != null) {
                val level = heading.groupValues[1].length.coerceIn(1, 6)
                blocks += BlockNode.Heading(level, parseInline(heading.groupValues[2]))
                index += 1
                continue
            }
            if (matchListItem(line) != null) {
                val result = readList(lines, index, slackLineBreaks)
                blocks += result.list
                index = result.nextIndex
                continue
            }
            val result = readParagraph(lines, index, slackLineBreaks)
            blocks += result.block
            index = result.nextIndex
        }
        return DocumentNode(blocks)
    }

    fun parseInline(source: String): List<InlineNode> = parseInlineRange(source, 0, source.length).nodes
}

private val MENTION = Regex("""^<@([^|>]+)\|([^>]+)>""")
private val HEADING = Regex("""^(#{1,6})[ \t]+(.*)$""")
private val UNORDERED = Regex("""^(\s*)([-*+])[ \t]+(.*)$""")
private val ORDERED = Regex("""^(\s*)(\d+)\.[ \t]+(.*)$""")
private val FENCE = Regex("""^(`{3,}|~{3,})(.*)$""")
private val ESCAPABLE = setOf('\\', '`', '*', '_', '[', ']', '<', '>')

private data class Fence(val marker: String, val language: String?)
private data class ListItemMatch(val indent: String, val ordered: Boolean, val content: String)
private data class BlockRead(val block: BlockNode, val nextIndex: Int)
private data class ListRead(val list: BlockNode.ListBlock, val nextIndex: Int)
private data class ItemRead(val item: ListItemNode, val nextIndex: Int)
private data class InlineRead(val nodes: List<InlineNode>, val consumed: Int)

private fun matchFence(line: String): Fence? {
    val match = FENCE.matchEntire(line) ?: return null
    val language = match.groupValues[2].trim()
    return Fence(match.groupValues[1], language.ifEmpty { null })
}

private fun matchListItem(line: String): ListItemMatch? {
    ORDERED.matchEntire(line)?.let {
        return ListItemMatch(it.groupValues[1], true, it.groupValues[3])
    }
    UNORDERED.matchEntire(line)?.let {
        return ListItemMatch(it.groupValues[1], false, it.groupValues[3])
    }
    return null
}

private fun indentWidth(prefix: String): Int {
    var width = 0
    for (character in prefix) {
        width += if (character == '\t') 4 else 1
    }
    return width
}

private fun readCodeBlock(lines: List<String>, start: Int, opening: Fence): BlockRead {
    val body = mutableListOf<String>()
    var index = start + 1
    while (index < lines.size) {
        val line = lines[index]
        val closing = matchFence(line)
        if (closing != null && closing.marker == opening.marker && closing.language == null) {
            index += 1
            break
        }
        body += line
        index += 1
    }
    return BlockRead(BlockNode.CodeBlock(opening.language, body.joinToString("\n")), index)
}

private fun peekNonEmpty(lines: List<String>, from: Int): Pair<Int, String>? {
    var index = from
    while (index < lines.size) {
        if (lines[index].trim().isNotEmpty()) {
            return index to lines[index]
        }
        index += 1
    }
    return null
}

private fun readParagraph(lines: List<String>, start: Int, slackLineBreaks: Boolean): BlockRead {
    val collected = mutableListOf<String>()
    var index = start
    while (index < lines.size) {
        val line = lines[index]
        if (line.trim().isEmpty()) break
        if (matchFence(line) != null || HEADING.matches(line) || matchListItem(line) != null) break
        collected += line
        index += 1
    }
    val joined = if (slackLineBreaks) collected.joinToString("\n") else collected.joinToString(" ")
    return BlockRead(BlockNode.Paragraph(MarkdownParser.parseInline(joined)), index)
}

private fun readList(lines: List<String>, start: Int, slackLineBreaks: Boolean): ListRead {
    val first = matchListItem(lines[start])!!
    val ordered = first.ordered
    val baseIndent = indentWidth(first.indent)
    val startNumber = ORDERED.matchEntire(lines[start])?.groupValues?.get(2)?.toInt()
    val items = mutableListOf<ListItemNode>()
    var index = start
    while (index < lines.size) {
        val line = lines[index]
        if (line.trim().isEmpty()) {
            val lookahead = peekNonEmpty(lines, index + 1) ?: break
            val nextItem = matchListItem(lookahead.second)
            if (nextItem == null || indentWidth(nextItem.indent) < baseIndent) break
            index += 1
            continue
        }
        val itemMatch = matchListItem(line) ?: break
        val indent = indentWidth(itemMatch.indent)
        if (indent != baseIndent || itemMatch.ordered != ordered) break
        val result = readListItem(lines, index, indent, slackLineBreaks)
        items += result.item
        index = result.nextIndex
    }
    return ListRead(BlockNode.ListBlock(ordered, if (ordered) startNumber else null, items), index)
}

private fun readListItem(
    lines: List<String>,
    start: Int,
    itemIndent: Int,
    slackLineBreaks: Boolean,
): ItemRead {
    val first = matchListItem(lines[start])
    val paragraphLines = mutableListOf(first?.content ?: "")
    var index = start + 1
    val children = mutableListOf<ListItemChild>()

    fun flushParagraph() {
        val text = paragraphLines.joinToString(if (slackLineBreaks) "\n" else " ").trimEnd()
        paragraphLines.clear()
        if (text.isNotEmpty()) {
            children += ListItemChild.Paragraph(MarkdownParser.parseInline(text))
        }
    }

    while (index < lines.size) {
        val line = lines[index]
        if (line.trim().isEmpty()) {
            val next = peekNonEmpty(lines, index + 1) ?: break
            val nextItem = matchListItem(next.second)
            if (nextItem != null && indentWidth(nextItem.indent) <= itemIndent) break
            if (nextItem != null && indentWidth(nextItem.indent) > itemIndent) {
                flushParagraph()
                val nested = readList(lines, next.first, slackLineBreaks)
                children += ListItemChild.NestedList(nested.list.ordered, nested.list.start, nested.list.items)
                index = nested.nextIndex
                continue
            }
            index += 1
            continue
        }
        val itemMatch = matchListItem(line)
        if (itemMatch != null) {
            val indent = indentWidth(itemMatch.indent)
            if (indent == itemIndent) break
            if (indent > itemIndent) {
                flushParagraph()
                val nested = readList(lines, index, slackLineBreaks)
                children += ListItemChild.NestedList(nested.list.ordered, nested.list.start, nested.list.items)
                index = nested.nextIndex
                continue
            }
            break
        }
        val continuation = Regex("""^(\s+)""").find(line)?.groupValues?.get(1).orEmpty()
        if (indentWidth(continuation) > itemIndent) {
            paragraphLines += line.trim()
            index += 1
            continue
        }
        break
    }
    flushParagraph()
    if (children.isEmpty()) {
        children += ListItemChild.Paragraph(emptyList())
    }
    return ItemRead(ListItemNode(children), index)
}

private fun parseInlineRange(source: String, start: Int, end: Int): InlineRead {
    val nodes = mutableListOf<InlineNode>()
    var index = start

    fun pushText(value: String) {
        if (value.isEmpty()) return
        val last = nodes.lastOrNull()
        if (last is InlineNode.Text) {
            nodes[nodes.lastIndex] = InlineNode.Text(last.value + value)
        } else {
            nodes += InlineNode.Text(value)
        }
    }

    while (index < end) {
        val remaining = source.substring(index, end)
        if (remaining.startsWith("\n")) {
            nodes += InlineNode.HardBreak
            index += 1
            continue
        }
        if (remaining.startsWith("\\") && remaining.length > 1) {
            val next = remaining[1]
            if (next in ESCAPABLE) {
                pushText(next.toString())
                index += 2
                continue
            }
        }
        val mention = MENTION.find(remaining)
        if (mention != null) {
            nodes += InlineNode.Mention(MentionPayload(mention.groupValues[1], mention.groupValues[2]))
            index += mention.value.length
            continue
        }
        if (remaining.startsWith("`")) {
            val code = readInlineCode(source, index, end)
            if (code != null) {
                nodes += InlineNode.InlineCode(code.first)
                index = code.second
                continue
            }
        }
        if (remaining.startsWith("[")) {
            val link = readLink(source, index, end)
            if (link != null) {
                nodes += link.first
                index = link.second
                continue
            }
        }
        if (remaining.startsWith("***") || remaining.startsWith("___")) {
            val delimiter = remaining.substring(0, 3)
            val closer = findCloser(source, index + 3, end, delimiter)
            if (closer != -1) {
                val inner = parseInlineRange(source, index + 3, closer).nodes
                nodes += InlineNode.Bold(listOf(InlineNode.Italic(inner)))
                index = closer + 3
                continue
            }
        }
        if (remaining.startsWith("**") || remaining.startsWith("__")) {
            val delimiter = remaining.substring(0, 2)
            val closer = findCloser(source, index + 2, end, delimiter)
            if (closer != -1) {
                nodes += InlineNode.Bold(parseInlineRange(source, index + 2, closer).nodes)
                index = closer + 2
                continue
            }
        }
        if (remaining.startsWith("*") || remaining.startsWith("_")) {
            val delimiter = remaining[0].toString()
            if (!isFlankingOpener(source, index, delimiter)) {
                pushText(delimiter)
                index += 1
                continue
            }
            val closer = findItalicCloser(source, index + 1, end, delimiter)
            if (closer != -1) {
                nodes += InlineNode.Italic(parseInlineRange(source, index + 1, closer).nodes)
                index = closer + 1
                continue
            }
        }
        pushText(remaining[0].toString())
        index += 1
    }
    return InlineRead(nodes, index - start)
}

private fun readInlineCode(source: String, start: Int, end: Int): Pair<String, Int>? {
    var tickCount = 0
    var cursor = start
    while (cursor < end && source[cursor] == '`') {
        tickCount += 1
        cursor += 1
    }
    if (tickCount == 0) return null
    val opener = "`".repeat(tickCount)
    val closeAt = source.indexOf(opener, cursor)
    if (closeAt == -1 || closeAt >= end) return null
    var value = source.substring(cursor, closeAt)
    if (value.startsWith(" ") && value.endsWith(" ") && value.trim().isNotEmpty()) {
        value = value.substring(1, value.length - 1)
    }
    return value to closeAt + tickCount
}

private fun readLink(source: String, start: Int, end: Int): Pair<InlineNode.Link, Int>? {
    if (source[start] != '[') return null
    val labelEnd = findBalanced(source, start + 1, end, '[', ']') ?: return null
    if (labelEnd + 1 >= end || source[labelEnd + 1] != '(') return null
    val destEnd = findBalanced(source, labelEnd + 2, end, '(', ')') ?: return null
    val label = source.substring(start + 1, labelEnd)
    val destination = source.substring(labelEnd + 2, destEnd).trim()
    val href = destination.split(Regex("""\s+""")).firstOrNull().orEmpty()
    if (href.isEmpty()) return null
    return InlineNode.Link(href, MarkdownParser.parseInline(label)) to destEnd + 1
}

private fun findBalanced(source: String, start: Int, end: Int, open: Char, close: Char): Int? {
    var depth = 1
    var index = start
    while (index < end) {
        when {
            source[index] == '\\' -> index += 2
            source.startsWith("<@", index) -> {
                val mentionEnd = source.indexOf('>', index)
                if (mentionEnd != -1 && mentionEnd < end) index = mentionEnd + 1 else index += 1
            }
            source[index] == '`' -> {
                val code = readInlineCode(source, index, end)
                index = code?.second ?: (index + 1)
            }
            source[index] == open -> {
                depth += 1
                index += 1
            }
            source[index] == close -> {
                depth -= 1
                if (depth == 0) return index
                index += 1
            }
            else -> index += 1
        }
    }
    return null
}

private fun findCloser(source: String, start: Int, end: Int, delimiter: String): Int {
    var index = start
    while (index <= end - delimiter.length) {
        when {
            source[index] == '\\' -> index += 2
            source.startsWith("<@", index) -> {
                val mentionEnd = source.indexOf('>', index)
                index = if (mentionEnd != -1 && mentionEnd < end) mentionEnd + 1 else index + 1
            }
            source[index] == '`' -> {
                val code = readInlineCode(source, index, end)
                index = code?.second ?: (index + 1)
            }
            source.startsWith(delimiter, index) -> return index
            else -> index += 1
        }
    }
    return -1
}

private fun findItalicCloser(source: String, start: Int, end: Int, delimiter: String): Int {
    var index = start
    while (index < end) {
        when {
            source[index] == '\\' -> index += 2
            source.startsWith("<@", index) -> {
                val mentionEnd = source.indexOf('>', index)
                index = if (mentionEnd != -1 && mentionEnd < end) mentionEnd + 1 else index + 1
            }
            source[index] == '`' -> {
                val code = readInlineCode(source, index, end)
                index = code?.second ?: (index + 1)
            }
            source.startsWith(delimiter + delimiter, index) -> index += 2
            source[index].toString() == delimiter -> return index
            else -> index += 1
        }
    }
    return -1
}

private fun isFlankingOpener(source: String, index: Int, delimiter: String): Boolean {
    val prev = if (index == 0) ' ' else source[index - 1]
    val next = source.getOrNull(index + 1) ?: return false
    if (next.toString() == delimiter || next.isWhitespace()) return false
    if (delimiter == "_" && prev.isLetterOrDigit()) return false
    return true
}
