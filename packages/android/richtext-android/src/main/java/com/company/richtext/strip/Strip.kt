package com.company.richtext.strip

import com.company.richtext.ast.BlockNode
import com.company.richtext.ast.DocumentNode
import com.company.richtext.ast.InlineNode
import com.company.richtext.ast.ListItemChild
import com.company.richtext.parser.MarkdownParser

/**
 * Converts Markdown + `<@userId|userName>` tokens into plaintext for Twilio outbound SMS.
 */
fun stripMarkdownAndMentions(text: String): String {
    val document = MarkdownParser.parse(text)
    return stripDocument(document)
        .replace(Regex("""[ \t]+\n"""), "\n")
        .trim()
}

fun stripDocument(document: DocumentNode): String =
    document.children.joinToString("\n\n") { stripBlock(it) }

private fun stripBlock(node: BlockNode): String = when (node) {
    is BlockNode.Paragraph -> stripInline(node.children)
    is BlockNode.Heading -> stripInline(node.children)
    is BlockNode.CodeBlock -> node.value
    is BlockNode.ListBlock -> node.items.mapIndexed { index, item ->
        val marker = if (node.ordered) "${(node.start ?: 1) + index}. " else "- "
        item.children.joinToString("\n") { child ->
            when (child) {
                is ListItemChild.Paragraph -> marker + stripInline(child.children)
                is ListItemChild.NestedList -> stripBlock(
                    BlockNode.ListBlock(child.ordered, child.start, child.items),
                ).lineSequence().joinToString("\n") { "  $it" }
            }
        }
    }.joinToString("\n")
}

private fun stripInline(nodes: List<InlineNode>): String =
    nodes.joinToString("") { stripInlineNode(it) }

private fun stripInlineNode(node: InlineNode): String = when (node) {
    is InlineNode.Text -> node.value
    InlineNode.HardBreak -> "\n"
    is InlineNode.Mention -> "@${node.payload.userName}"
    is InlineNode.InlineCode -> node.value
    is InlineNode.Bold -> stripInline(node.children)
    is InlineNode.Italic -> stripInline(node.children)
    is InlineNode.Link -> {
        val label = stripInline(node.children)
        when {
            label.isEmpty() -> node.href
            label == node.href -> node.href
            else -> "$label (${node.href})"
        }
    }
}
