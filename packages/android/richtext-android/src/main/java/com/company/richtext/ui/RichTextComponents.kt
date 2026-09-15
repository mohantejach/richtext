package com.company.richtext.ui

import androidx.compose.runtime.Composable
import com.company.richtext.ast.MentionPayload
import com.company.richtext.ast.NodeType

data class NodeData(
    val type: NodeType,
    val mention: MentionPayload? = null,
    val text: String? = null,
    val href: String? = null,
    val headingLevel: Int? = null,
    val language: String? = null,
    val ordered: Boolean? = null,
    val start: Int? = null,
    val content: @Composable () -> Unit = {},
)

typealias NodeSlot = @Composable (NodeData) -> Unit

/**
 * Slot dictionary mapping node types to Compose functions. Missing keys fall
 * back to standard [androidx.compose.material3.Text] / [AnnotatedString] styling.
 */
data class RichTextComponents(
    val slots: Map<NodeType, NodeSlot> = emptyMap(),
) {
    operator fun get(type: NodeType): NodeSlot? = slots[type]

    companion object {
        val Default = RichTextComponents()

        fun build(
            mention: NodeSlot? = null,
            bold: NodeSlot? = null,
            italic: NodeSlot? = null,
            inlineCode: NodeSlot? = null,
            codeBlock: NodeSlot? = null,
            heading: NodeSlot? = null,
            link: NodeSlot? = null,
            list: NodeSlot? = null,
            listItem: NodeSlot? = null,
            paragraph: NodeSlot? = null,
        ): RichTextComponents {
            val slots = buildMap {
                mention?.let { put(NodeType.MENTION, it) }
                bold?.let { put(NodeType.BOLD, it) }
                italic?.let { put(NodeType.ITALIC, it) }
                inlineCode?.let { put(NodeType.INLINE_CODE, it) }
                codeBlock?.let { put(NodeType.CODE_BLOCK, it) }
                heading?.let { put(NodeType.HEADING, it) }
                link?.let { put(NodeType.LINK, it) }
                list?.let { put(NodeType.LIST, it) }
                listItem?.let { put(NodeType.LIST_ITEM, it) }
                paragraph?.let { put(NodeType.PARAGRAPH, it) }
            }
            return RichTextComponents(slots)
        }
    }
}

data class MentionItem(
    val id: String,
    val label: String,
)

data class EmojiItem(
    val name: String,
    val char: String,
    val aliases: List<String> = emptyList(),
)
