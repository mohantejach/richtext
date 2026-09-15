package com.company.richtext.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.company.richtext.ast.BlockNode
import com.company.richtext.ast.DocumentNode
import com.company.richtext.ast.InlineNode
import com.company.richtext.ast.MentionPayload
import com.company.richtext.emoji.EmojiCatalog
import com.company.richtext.parser.MarkdownParser
import com.company.richtext.serialize.MarkdownSerializer

@Composable
fun RichTextEditor(
    text: String,
    onTextChange: (String) -> Unit,
    components: RichTextComponents = RichTextComponents.Default,
    modifier: Modifier = Modifier,
    placeholder: String = "Write a message",
    onMentionQuery: suspend (String) -> List<MentionItem> = { emptyList() },
    emojiCatalog: List<EmojiItem> = EmojiCatalog.all,
) {
    var value by remember(components) {
        mutableStateOf(TextFieldValue(annotatedFromMarkdown(text)))
    }
    var mentionQuery by remember { mutableStateOf<String?>(null) }
    var emojiQuery by remember { mutableStateOf<String?>(null) }
    var mentionItems by remember { mutableStateOf<List<MentionItem>>(emptyList()) }

    LaunchedEffect(text) {
        if (text != markdownFromAnnotated(value.annotatedString)) {
            value = TextFieldValue(annotatedFromMarkdown(text), TextRange(text.length))
        }
    }

    LaunchedEffect(mentionQuery) {
        mentionItems = mentionQuery?.let { onMentionQuery(it) } ?: emptyList()
    }

    Column(modifier = modifier) {
        BasicTextField(
            value = value,
            onValueChange = { next ->
                value = next
                val markdown = markdownFromAnnotated(next.annotatedString)
                onTextChange(markdown)
                val before = next.text.substring(0, next.selection.end.coerceIn(0, next.text.length))
                mentionQuery = triggerQuery(before, '@')
                emojiQuery = triggerQuery(before, ':')
            },
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White, RoundedCornerShape(10.dp))
                .padding(10.dp),
            textStyle = MaterialTheme.typography.bodyLarge,
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            decorationBox = { inner ->
                if (value.text.isEmpty()) {
                    Text(placeholder, color = Color.Gray)
                }
                inner()
            },
        )
        mentionQuery?.let {
            SuggestionMenu(
                title = "People",
                items = mentionItems.map { item -> item.label },
            ) { index ->
                val item = mentionItems.getOrNull(index) ?: return@SuggestionMenu
                value = insertMention(value, item)
                onTextChange(markdownFromAnnotated(value.annotatedString))
                mentionQuery = null
            }
        }
        emojiQuery?.let { query ->
            val items = EmojiCatalog.search(query, emojiCatalog)
            SuggestionMenu(
                title = "Emoji",
                items = items.map { "${it.char}  :${it.name}:" },
            ) { index ->
                val item = items.getOrNull(index) ?: return@SuggestionMenu
                value = replaceTrigger(value, ':') { append("${item.char} ") }
                onTextChange(markdownFromAnnotated(value.annotatedString))
                emojiQuery = null
            }
        }
    }
}

@Composable
private fun SuggestionMenu(
    title: String,
    items: List<String>,
    onSelect: (Int) -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        shape = RoundedCornerShape(12.dp),
        tonalElevation = 4.dp,
    ) {
        Column {
            Text(
                title,
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            )
            items.forEachIndexed { index, label ->
                Text(
                    text = label,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(index) }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }
        }
    }
}

private fun triggerQuery(before: String, prefix: Char): String? {
    val index = before.lastIndexOf(prefix)
    if (index < 0) return null
    if (index > 0 && before[index - 1].isLetterOrDigit()) return null
    val token = before.substring(index + 1)
    if (token.any { it.isWhitespace() }) return null
    return token
}

private fun insertMention(
    value: TextFieldValue,
    item: MentionItem,
): TextFieldValue {
    return replaceTrigger(value, '@') {
        val payload = MentionPayload(item.id, item.label)
        pushStringAnnotation("mention", "${payload.userId}|${payload.userName}")
        withStyle(
            SpanStyle(
                color = Color(0xFF1D4ED8),
                fontWeight = FontWeight.SemiBold,
                background = Color(0xFFE8F1FF),
            ),
        ) { append("@${payload.userName}") }
        pop()
        append(" ")
    }
}

private fun replaceTrigger(
    value: TextFieldValue,
    prefix: Char,
    insert: AnnotatedString.Builder.() -> Unit,
): TextFieldValue {
    val cursor = value.selection.end.coerceIn(0, value.text.length)
    val before = value.text.substring(0, cursor)
    val at = before.lastIndexOf(prefix)
    if (at < 0) return value
    val builder = AnnotatedString.Builder()
    builder.append(value.annotatedString.subSequence(0, at))
    builder.insert()
    builder.append(value.annotatedString.subSequence(cursor, value.annotatedString.length))
    val result = builder.toAnnotatedString()
    val newCursor = (result.length - (value.annotatedString.length - cursor)).coerceIn(0, result.length)
    return TextFieldValue(result, TextRange(newCursor))
}

internal fun annotatedFromMarkdown(markdown: String): AnnotatedString {
    val document = MarkdownParser.parse(markdown)
    return buildAnnotatedString { appendDocument(document) }
}

internal fun markdownFromAnnotated(annotated: AnnotatedString): String {
    val rebuilt = rebuildMarkdown(annotated)
    return rebuilt
}

private fun AnnotatedString.Builder.appendDocument(document: DocumentNode) {
    document.children.forEachIndexed { index, block ->
        if (index > 0) append("\n\n")
        appendBlock(block)
    }
}

private fun AnnotatedString.Builder.appendBlock(block: BlockNode) {
    when (block) {
        is BlockNode.Paragraph -> appendInline(block.children)
        is BlockNode.Heading -> {
            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                appendInline(block.children)
            }
        }
        is BlockNode.CodeBlock -> withStyle(SpanStyle(fontFamily = FontFamily.Monospace)) {
            append(block.value)
        }
        is BlockNode.ListBlock -> {
            block.items.forEachIndexed { index, item ->
                if (index > 0) append("\n")
                append(if (block.ordered) "${(block.start ?: 1) + index}. " else "• ")
                item.children.forEach { child ->
                    when (child) {
                        is com.company.richtext.ast.ListItemChild.Paragraph -> appendInline(child.children)
                        is com.company.richtext.ast.ListItemChild.NestedList -> appendBlock(
                            BlockNode.ListBlock(child.ordered, child.start, child.items),
                        )
                    }
                }
            }
        }
    }
}

private fun AnnotatedString.Builder.appendInline(nodes: List<InlineNode>) {
    nodes.forEach { node ->
        when (node) {
            is InlineNode.Text -> append(node.value)
            InlineNode.HardBreak -> append("\n")
            is InlineNode.Mention -> {
                pushStringAnnotation("mention", "${node.payload.userId}|${node.payload.userName}")
                withStyle(
                    SpanStyle(
                        color = Color(0xFF1D4ED8),
                        fontWeight = FontWeight.SemiBold,
                        background = Color(0xFFE8F1FF),
                    ),
                ) { append("@${node.payload.userName}") }
                pop()
            }
            is InlineNode.Bold -> withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                appendInline(node.children)
            }
            is InlineNode.Italic -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                appendInline(node.children)
            }
            is InlineNode.InlineCode -> withStyle(SpanStyle(fontFamily = FontFamily.Monospace)) {
                append(node.value)
            }
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

private fun rebuildMarkdown(annotated: AnnotatedString): String {
    if (annotated.text.isEmpty()) return ""
    val document = MarkdownParser.parse(reconstruct(annotated))
    return MarkdownSerializer.serialize(document)
}

private fun reconstruct(annotated: AnnotatedString): String {
    val builder = StringBuilder()
    var index = 0
    while (index < annotated.length) {
        val mentions = annotated.getStringAnnotations("mention", index, index + 1)
        val mention = mentions.firstOrNull()
        if (mention != null && mention.start == index) {
            val (userId, userName) = mention.item.split("|", limit = 2).let {
                it[0] to it.getOrElse(1) { "" }
            }
            builder.append("<@$userId|$userName>")
            index = mention.end
            continue
        }
        val urls = annotated.getStringAnnotations("url", index, index + 1)
        val url = urls.firstOrNull()
        if (url != null && url.start == index) {
            val label = annotated.text.substring(url.start, url.end)
            builder.append("[$label](${url.item})")
            index = url.end
            continue
        }
        val span = annotated.spanStyles.firstOrNull { it.start == index }
        if (span != null) {
            val chunk = annotated.text.substring(span.start, span.end)
            val wrapped = wrapSpan(chunk, span.item)
            builder.append(wrapped)
            index = span.end
            continue
        }
        builder.append(annotated.text[index])
        index += 1
    }
    return builder.toString().replace("• ", "- ")
}

private fun wrapSpan(chunk: String, style: SpanStyle): String {
    var value = chunk
    if (style.fontFamily == FontFamily.Monospace) {
        value = "`$value`"
    }
    if (style.fontWeight == FontWeight.Bold) {
        value = "**$value**"
    }
    if (style.fontStyle == FontStyle.Italic) {
        value = "*$value*"
    }
    return value
}
