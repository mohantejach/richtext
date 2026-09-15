package com.company.chat.example

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.company.richtext.ast.NodeType
import com.company.richtext.strip.stripMarkdownAndMentions
import com.company.richtext.ui.MessageRenderer
import com.company.richtext.ui.MentionItem
import com.company.richtext.ui.RichTextComponents
import com.company.richtext.ui.RichTextEditor

private val teammates = listOf(
    MentionItem("u123", "Jane Doe"),
    MentionItem("u1", "Ada Lovelace"),
)

@Composable
fun ChatMessage(markdown: String) {
    val components = RichTextComponents.build(
        mention = { data ->
            Text(
                text = "@${data.mention?.userName.orEmpty()}",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .background(Color(0xFF0F766E), RoundedCornerShape(50))
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            )
        },
        bold = { data ->
            androidx.compose.foundation.layout.Box(
                Modifier.background(Color(0xFFF3E8FF), RoundedCornerShape(4.dp)),
            ) { data.content() }
        },
    )
    MessageRenderer(text = markdown, components = components)
}

@Composable
fun ChatComposer() {
    var text by remember {
        mutableStateOf("Hello **team**, ask <@u123|Jane Doe>!")
    }
    RichTextEditor(
        text = text,
        onTextChange = { text = it },
        components = RichTextComponents(mapOf(NodeType.MENTION to { data ->
            Text("@${data.mention?.userName.orEmpty()}", color = Color(0xFF0F766E))
        })),
        onMentionQuery = { query ->
            teammates.filter { it.label.contains(query, ignoreCase = true) }
        },
    )
}

fun smsPreview(markdown: String): String = stripMarkdownAndMentions(markdown)
