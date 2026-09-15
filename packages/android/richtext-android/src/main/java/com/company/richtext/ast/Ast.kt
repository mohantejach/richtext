package com.company.richtext.ast

enum class NodeType {
    DOCUMENT,
    PARAGRAPH,
    HEADING,
    CODE_BLOCK,
    LIST,
    LIST_ITEM,
    TEXT,
    BOLD,
    ITALIC,
    INLINE_CODE,
    LINK,
    MENTION,
    HARD_BREAK,
}

data class MentionPayload(
    val userId: String,
    val userName: String,
)

sealed interface InlineNode {
    data class Text(val value: String) : InlineNode
    data class Mention(val payload: MentionPayload) : InlineNode
    data object HardBreak : InlineNode
    data class Bold(val children: List<InlineNode>) : InlineNode
    data class Italic(val children: List<InlineNode>) : InlineNode
    data class InlineCode(val value: String) : InlineNode
    data class Link(val href: String, val children: List<InlineNode>) : InlineNode
}

sealed interface BlockNode {
    data class Paragraph(val children: List<InlineNode>) : BlockNode
    data class Heading(val level: Int, val children: List<InlineNode>) : BlockNode
    data class CodeBlock(val language: String?, val value: String) : BlockNode
    data class ListBlock(
        val ordered: Boolean,
        val start: Int?,
        val items: List<ListItemNode>,
    ) : BlockNode
}

data class ListItemNode(
    val children: List<ListItemChild>,
)

sealed interface ListItemChild {
    data class Paragraph(val children: List<InlineNode>) : ListItemChild
    data class NestedList(
        val ordered: Boolean,
        val start: Int?,
        val items: List<ListItemNode>,
    ) : ListItemChild
}

data class DocumentNode(
    val children: List<BlockNode> = emptyList(),
)
