package com.company.richtext.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.company.richtext.ast.BlockNode
import com.company.richtext.ast.InlineNode
import com.company.richtext.ast.ListItemChild
import com.company.richtext.ast.ListItemNode
import com.company.richtext.ast.MentionPayload
import com.company.richtext.ast.NodeType
import com.company.richtext.parser.MarkdownParser

@Composable
fun MessageRenderer(
    text: String,
    components: RichTextComponents = RichTextComponents.Default,
    modifier: Modifier = Modifier,
) {
    val document = MarkdownParser.parse(text)
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        document.children.forEach { block ->
            BlockView(block, components)
        }
    }
}

@Composable
private fun BlockView(node: BlockNode, components: RichTextComponents) {
    when (node) {
        is BlockNode.Paragraph -> {
            val body = @Composable { InlineFlow(node.children, components) }
            val slot = components[NodeType.PARAGRAPH]
            if (slot != null) {
                slot(NodeData(type = NodeType.PARAGRAPH, content = body))
            } else {
                body()
            }
        }
        is BlockNode.Heading -> {
            val body = @Composable {
                InlineFlow(node.children, components, headingStyle(node.level))
            }
            val slot = components[NodeType.HEADING]
            if (slot != null) {
                slot(
                    NodeData(
                        type = NodeType.HEADING,
                        headingLevel = node.level,
                        content = body,
                    ),
                )
            } else {
                body()
            }
        }
        is BlockNode.CodeBlock -> {
            val slot = components[NodeType.CODE_BLOCK]
            if (slot != null) {
                slot(
                    NodeData(
                        type = NodeType.CODE_BLOCK,
                        language = node.language,
                        text = node.value,
                    ),
                )
            } else {
                Text(
                    text = node.value,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF0F172A))
                        .padding(12.dp),
                    color = Color(0xFFE2E8F0),
                    fontFamily = FontFamily.Monospace,
                    fontSize = 13.sp,
                )
            }
        }
        is BlockNode.ListBlock -> {
            val body = @Composable { ListBody(node.ordered, node.start, node.items, components) }
            val slot = components[NodeType.LIST]
            if (slot != null) {
                slot(
                    NodeData(
                        type = NodeType.LIST,
                        ordered = node.ordered,
                        start = node.start,
                        content = body,
                    ),
                )
            } else {
                body()
            }
        }
    }
}

@Composable
private fun ListBody(
    ordered: Boolean,
    start: Int?,
    items: List<ListItemNode>,
    components: RichTextComponents,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        items.forEachIndexed { index, item ->
            val marker = if (ordered) "${(start ?: 1) + index}." else "•"
            val body = @Composable {
                Row(verticalAlignment = Alignment.Top) {
                    Text(marker, modifier = Modifier.padding(end = 8.dp))
                    Column {
                        item.children.forEach { child ->
                            when (child) {
                                is ListItemChild.Paragraph -> InlineFlow(child.children, components)
                                is ListItemChild.NestedList -> ListBody(
                                    child.ordered,
                                    child.start,
                                    child.items,
                                    components,
                                )
                            }
                        }
                    }
                }
            }
            val slot = components[NodeType.LIST_ITEM]
            if (slot != null) {
                slot(NodeData(type = NodeType.LIST_ITEM, content = body))
            } else {
                body()
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun InlineFlow(
    nodes: List<InlineNode>,
    components: RichTextComponents,
    style: TextStyle = MaterialTheme.typography.bodyLarge,
) {
    if (!needsCustomInlineLayout(nodes, components)) {
        FallbackAnnotatedText(nodes, style)
        return
    }
    FlowRow(horizontalArrangement = Arrangement.Start) {
        nodes.forEach { node ->
            InlineNodeView(node, components, style)
        }
    }
}

private fun needsCustomInlineLayout(
    nodes: List<InlineNode>,
    components: RichTextComponents,
): Boolean {
    return nodes.any { node ->
        when (node) {
            is InlineNode.Mention -> components[NodeType.MENTION] != null
            is InlineNode.Bold -> components[NodeType.BOLD] != null ||
                needsCustomInlineLayout(node.children, components)
            is InlineNode.Italic -> components[NodeType.ITALIC] != null ||
                needsCustomInlineLayout(node.children, components)
            is InlineNode.Link -> components[NodeType.LINK] != null ||
                needsCustomInlineLayout(node.children, components)
            is InlineNode.InlineCode -> components[NodeType.INLINE_CODE] != null
            else -> false
        }
    }
}

@Composable
private fun InlineNodeView(
    node: InlineNode,
    components: RichTextComponents,
    style: TextStyle,
) {
    when (node) {
        is InlineNode.Text -> Text(node.value, style = style)
        InlineNode.HardBreak -> Text("\n", style = style)
        is InlineNode.Mention -> {
            val slot = components[NodeType.MENTION]
            if (slot != null) {
                slot(
                    NodeData(
                        type = NodeType.MENTION,
                        mention = node.payload,
                        text = node.payload.userName,
                    ),
                )
            } else {
                DefaultMention(node.payload)
            }
        }
        is InlineNode.Bold -> {
            val body = @Composable { InlineFlow(node.children, components, style.copy(fontWeight = FontWeight.Bold)) }
            val slot = components[NodeType.BOLD]
            if (slot != null) {
                slot(NodeData(type = NodeType.BOLD, content = body))
            } else {
                body()
            }
        }
        is InlineNode.Italic -> {
            val body = @Composable { InlineFlow(node.children, components, style.copy(fontStyle = FontStyle.Italic)) }
            val slot = components[NodeType.ITALIC]
            if (slot != null) {
                slot(NodeData(type = NodeType.ITALIC, content = body))
            } else {
                body()
            }
        }
        is InlineNode.InlineCode -> {
            val slot = components[NodeType.INLINE_CODE]
            if (slot != null) {
                slot(NodeData(type = NodeType.INLINE_CODE, text = node.value))
            } else {
                Text(
                    node.value,
                    style = style.copy(fontFamily = FontFamily.Monospace),
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0xFFF3F4F6))
                        .padding(horizontal = 4.dp),
                )
            }
        }
        is InlineNode.Link -> {
            val body = @Composable {
                InlineFlow(
                    node.children,
                    components,
                    style.copy(
                        color = Color(0xFF2563EB),
                        textDecoration = TextDecoration.Underline,
                    ),
                )
            }
            val slot = components[NodeType.LINK]
            if (slot != null) {
                slot(NodeData(type = NodeType.LINK, href = node.href, content = body))
            } else {
                body()
            }
        }
    }
}

@Composable
private fun DefaultMention(payload: MentionPayload) {
    Text(
        text = "@${payload.userName}",
        color = Color(0xFF1D4ED8),
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color(0xFFE8F1FF))
            .padding(horizontal = 6.dp, vertical = 1.dp),
    )
}

@Composable
private fun FallbackAnnotatedText(nodes: List<InlineNode>, style: TextStyle) {
    val uriHandler = LocalUriHandler.current
    val annotated = buildAnnotatedString {
        appendInline(nodes)
    }
    ClickableText(
        text = annotated,
        style = style,
        onClick = { offset ->
            annotated.getStringAnnotations("url", offset, offset).firstOrNull()?.let { annotation ->
                uriHandler.openUri(annotation.item)
            }
        },
    )
}

private fun androidx.compose.ui.text.AnnotatedString.Builder.appendInline(nodes: List<InlineNode>) {
    nodes.forEach { node ->
        when (node) {
            is InlineNode.Text -> append(node.value)
            InlineNode.HardBreak -> append("\n")
            is InlineNode.Mention -> withStyle(
                SpanStyle(
                    color = Color(0xFF1D4ED8),
                    fontWeight = FontWeight.SemiBold,
                    background = Color(0xFFE8F1FF),
                ),
            ) { append("@${node.payload.userName}") }
            is InlineNode.Bold -> withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                appendInline(node.children)
            }
            is InlineNode.Italic -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                appendInline(node.children)
            }
            is InlineNode.InlineCode -> withStyle(
                SpanStyle(fontFamily = FontFamily.Monospace, background = Color(0xFFF3F4F6)),
            ) { append(node.value) }
            is InlineNode.Link -> {
                pushStringAnnotation("url", node.href)
                withStyle(
                    SpanStyle(color = Color(0xFF2563EB), textDecoration = TextDecoration.Underline),
                ) { appendInline(node.children) }
                pop()
            }
        }
    }
}

private fun headingStyle(level: Int): TextStyle {
    val size = when (level) {
        1 -> 28.sp
        2 -> 24.sp
        3 -> 22.sp
        4 -> 20.sp
        else -> 18.sp
    }
    return TextStyle(fontSize = size, fontWeight = FontWeight.Bold)
}
