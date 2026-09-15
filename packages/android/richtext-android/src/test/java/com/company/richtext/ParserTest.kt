package com.company.richtext

import com.company.richtext.ast.BlockNode
import com.company.richtext.ast.InlineNode
import com.company.richtext.ast.MentionPayload
import com.company.richtext.parser.MarkdownParser
import com.company.richtext.serialize.MarkdownSerializer
import com.company.richtext.strip.stripMarkdownAndMentions
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ParserTest {
    @Test
    fun parsesCanonicalSample() {
        val source =
            "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!"
        val document = MarkdownParser.parse(source)
        assertEquals(1, document.children.size)
        val paragraph = document.children[0] as BlockNode.Paragraph
        assertEquals(InlineNode.Text("Hello "), paragraph.children[0])
        assertEquals(InlineNode.Bold(listOf(InlineNode.Text("team"))), paragraph.children[1])
        assertEquals(InlineNode.InlineCode("const x = 1;"), paragraph.children[3])
        assertEquals(
            InlineNode.Mention(MentionPayload("u123", "Jane Doe")),
            paragraph.children[5],
        )
    }

    @Test
    fun roundTripsCanonicalSample() {
        val source =
            "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!"
        assertEquals(source, MarkdownSerializer.serialize(MarkdownParser.parse(source)))
    }

    @Test
    fun doesNotParseMarkdownInsideInlineCode() {
        val document = MarkdownParser.parse("use `**not bold**`")
        val paragraph = document.children[0] as BlockNode.Paragraph
        assertEquals(
            listOf(InlineNode.Text("use "), InlineNode.InlineCode("**not bold**")),
            paragraph.children,
        )
    }

    @Test
    fun parsesHeadingsListsAndFences() {
        val source = """
            # Status
            - ship **v1**
            - ask <@u9|Sam Lee>

            ```ts
            const ok = true;
            ```
        """.trimIndent()
        val types = MarkdownParser.parse(source).children.map { it::class }
        assertTrue(types[0] == BlockNode.Heading::class)
        assertTrue(types[1] == BlockNode.ListBlock::class)
        assertTrue(types[2] == BlockNode.CodeBlock::class)
    }
}

class StripTest {
    @Test
    fun stripsCanonicalSampleForSms() {
        val source =
            "Hello **team**, check this code `const x = 1;` and ask <@u123|Jane Doe>!"
        assertEquals(
            "Hello team, check this code const x = 1; and ask @Jane Doe!",
            stripMarkdownAndMentions(source),
        )
    }
}
