package com.company.richtext.serialize

import com.company.richtext.ast.BlockNode
import com.company.richtext.ast.DocumentNode
import com.company.richtext.ast.InlineNode
import com.company.richtext.ast.ListItemChild
import com.company.richtext.ast.ListItemNode

object MarkdownSerializer {
    fun serialize(document: DocumentNode): String =
        document.children.joinToString("\n\n") { serializeBlock(it) }

    fun serializeInline(nodes: List<InlineNode>): String =
        nodes.joinToString("") { serializeInlineNode(it) }

    private fun serializeBlock(node: BlockNode): String = when (node) {
        is BlockNode.Paragraph -> serializeInline(node.children)
        is BlockNode.Heading -> "${"#".repeat(node.level)} ${serializeInline(node.children)}"
        is BlockNode.CodeBlock -> "```${node.language.orEmpty()}\n${node.value}\n```"
        is BlockNode.ListBlock -> serializeList(node, 0)
    }

    private fun serializeList(node: BlockNode.ListBlock, indent: Int): String {
        val pad = " ".repeat(indent)
        return node.items.mapIndexed { index, item ->
            serializeListItem(item, node, index, indent, pad)
        }.joinToString("\n")
    }

    private fun serializeListItem(
        item: ListItemNode,
        list: BlockNode.ListBlock,
        index: Int,
        indent: Int,
        pad: String,
    ): String {
        val marker = if (list.ordered) "${(list.start ?: 1) + index}." else "-"
        val parts = mutableListOf<String>()
        for (child in item.children) {
            when (child) {
                is ListItemChild.Paragraph -> {
                    val text = serializeInline(child.children)
                    parts += if (parts.isEmpty()) "$pad$marker $text" else "$pad  $text"
                }
                is ListItemChild.NestedList -> parts += serializeList(
                    BlockNode.ListBlock(child.ordered, child.start, child.items),
                    indent + 2,
                )
            }
        }
        return parts.joinToString("\n")
    }

    private fun serializeInlineNode(node: InlineNode): String = when (node) {
        is InlineNode.Text -> escapeText(node.value)
        InlineNode.HardBreak -> "\n"
        is InlineNode.Mention -> "<@${node.payload.userId}|${node.payload.userName}>"
        is InlineNode.InlineCode -> wrapCode(node.value)
        is InlineNode.Bold -> "**${serializeInline(node.children)}**"
        is InlineNode.Italic -> "*${serializeInline(node.children)}*"
        is InlineNode.Link -> "[${serializeInline(node.children)}](${node.href})"
    }

    private fun wrapCode(value: String): String {
        var ticks = 1
        while (value.contains("`".repeat(ticks))) ticks += 1
        val fence = "`".repeat(ticks)
        val padded = if (value.startsWith("`") || value.endsWith("`") || value.startsWith(" ")) {
            " $value "
        } else {
            value
        }
        return "$fence$padded$fence"
    }

    private fun escapeText(value: String): String =
        value.replace(Regex("""([\\`*_\[\]<>])"""), """\\$1""")
}
