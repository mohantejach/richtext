package com.company.richtext.example

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.company.richtext.strip.stripMarkdownAndMentions
import com.company.richtext.ui.MessageRenderer
import com.company.richtext.ui.MentionItem
import com.company.richtext.ui.RichTextComponents
import com.company.richtext.ui.RichTextEditor

private val people = listOf(
    MentionItem("u123", "Jane Doe"),
    MentionItem("u1", "Ada Lovelace"),
    MentionItem("u9", "Sam Lee"),
    MentionItem("u42", "Grace Hopper"),
)

private data class Sample(val id: String, val label: String, val text: String)

private val samples = listOf(
    Sample(
        "canonical",
        "Canonical",
        "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!",
    ),
    Sample(
        "status",
        "Heading + list",
        """
            # Status
            - ship **v1**
            - ask <@u9|Sam Lee>

            See [Help](https://example.com/help).

            ```ts
            const ok = true;
            ```
        """.trimIndent(),
    ),
    Sample(
        "thread",
        "Thread",
        "Hey <@u1|Ada Lovelace>, the *deploy* is ready.\nPing <@u42|Grace Hopper> if CI is red.",
    ),
)

private val customComponents = RichTextComponents.build(
    mention = { data ->
        Text(
            text = "@${data.mention?.userName.orEmpty()}",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(Color(0xFF0F766E))
                .padding(horizontal = 8.dp, vertical = 2.dp),
        )
    },
    bold = { data ->
        androidx.compose.foundation.layout.Box {
            data.content()
        }
    },
    codeBlock = { data ->
        Text(
            text = data.text.orEmpty(),
            color = Color(0xFFA5B4FC),
            fontFamily = FontFamily.Monospace,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(Color(0xFF0F172A))
                .padding(12.dp),
        )
    },
)

@Composable
fun PlaygroundScreen() {
    var sampleId by remember { mutableStateOf(samples.first().id) }
    var markdown by remember { mutableStateOf(samples.first().text) }
    var useCustom by remember { mutableStateOf(true) }
    val components = if (useCustom) customComponents else RichTextComponents.Default

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Rich text playground", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Edit Markdown + mention tokens, preview the renderer, and see the Twilio SMS strip. Type @ for people and : for emoji.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Custom components", modifier = Modifier.weight(1f))
                Switch(checked = useCustom, onCheckedChange = { useCustom = it })
            }
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                samples.forEach { sample ->
                    FilterChip(
                        selected = sample.id == sampleId,
                        onClick = {
                            sampleId = sample.id
                            markdown = sample.text
                        },
                        label = { Text(sample.label) },
                    )
                }
            }
            Panel("Editor") {
                RichTextEditor(
                    text = markdown,
                    onTextChange = { markdown = it },
                    components = components,
                    placeholder = "Write a Slack-like message",
                    onMentionQuery = { query ->
                        val normalized = query.trim().lowercase()
                        people.filter { it.label.lowercase().contains(normalized) }
                    },
                )
                Text(
                    "People: Jane Doe, Ada Lovelace, Sam Lee, Grace Hopper",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            Panel("Renderer") {
                MessageRenderer(text = markdown, components = components)
            }
            Panel("SMS / Twilio") {
                Text(stripMarkdownAndMentions(markdown))
            }
            Panel("Stored Markdown") {
                Text(
                    markdown,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFFE2E8F0),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF0F172A))
                        .padding(12.dp),
                )
            }
        }
    }
}

@Composable
private fun Panel(title: String, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            title.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        content()
    }
}
