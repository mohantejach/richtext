package com.company.richtext.emoji

import com.company.richtext.ui.EmojiItem

object EmojiCatalog {
    val all: List<EmojiItem> = listOf(
        EmojiItem("smile", "😄", listOf("happy", "smile")),
        EmojiItem("grinning", "😀", listOf("grin")),
        EmojiItem("joy", "😂", listOf("laugh", "lol")),
        EmojiItem("wink", "😉", listOf("wink")),
        EmojiItem("heart_eyes", "😍", listOf("love")),
        EmojiItem("thinking", "🤔", listOf("think")),
        EmojiItem("cry", "😢", listOf("sad")),
        EmojiItem("thumbsup", "👍", listOf("+1", "yes")),
        EmojiItem("thumbsdown", "👎", listOf("-1", "no")),
        EmojiItem("clap", "👏", listOf("clap")),
        EmojiItem("wave", "👋", listOf("hello", "wave")),
        EmojiItem("fire", "🔥", listOf("fire", "lit")),
        EmojiItem("tada", "🎉", listOf("party", "tada")),
        EmojiItem("rocket", "🚀", listOf("ship", "rocket")),
        EmojiItem("heart", "❤️", listOf("heart", "love")),
        EmojiItem("check", "✅", listOf("check", "done")),
        EmojiItem("eyes", "👀", listOf("eyes")),
        EmojiItem("100", "💯", listOf("100")),
        EmojiItem("bug", "🐛", listOf("bug")),
        EmojiItem("computer", "💻", listOf("laptop")),
        EmojiItem("coffee", "☕", listOf("coffee")),
        EmojiItem("sparkles", "✨", listOf("sparkle")),
    )

    fun search(query: String, catalog: List<EmojiItem> = all): List<EmojiItem> {
        val normalized = query.trim().lowercase().trimStart(':')
        if (normalized.isEmpty()) return catalog.take(20)
        return catalog.filter { item ->
            item.name.contains(normalized) || item.aliases.any { it.contains(normalized) }
        }.take(20)
    }
}
