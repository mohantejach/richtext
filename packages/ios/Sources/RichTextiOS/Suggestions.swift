import Foundation

public struct MentionItem: Equatable, Sendable, Identifiable {
    public var id: String
    public var label: String

    public init(id: String, label: String) {
        self.id = id
        self.label = label
    }
}

public struct EmojiItem: Equatable, Sendable, Identifiable {
    public var name: String
    public var char: String
    public var aliases: [String]

    public var id: String { name }

    public init(name: String, char: String, aliases: [String] = []) {
        self.name = name
        self.char = char
        self.aliases = aliases
    }
}

public enum EmojiCatalog {
    public static let all: [EmojiItem] = [
        EmojiItem(name: "smile", char: "😄", aliases: ["happy", "smile"]),
        EmojiItem(name: "grinning", char: "😀", aliases: ["grin"]),
        EmojiItem(name: "joy", char: "😂", aliases: ["laugh", "lol"]),
        EmojiItem(name: "wink", char: "😉", aliases: ["wink"]),
        EmojiItem(name: "heart_eyes", char: "😍", aliases: ["love"]),
        EmojiItem(name: "thinking", char: "🤔", aliases: ["think"]),
        EmojiItem(name: "cry", char: "😢", aliases: ["sad"]),
        EmojiItem(name: "thumbsup", char: "👍", aliases: ["+1", "yes"]),
        EmojiItem(name: "thumbsdown", char: "👎", aliases: ["-1", "no"]),
        EmojiItem(name: "clap", char: "👏", aliases: ["clap"]),
        EmojiItem(name: "wave", char: "👋", aliases: ["hello", "wave"]),
        EmojiItem(name: "fire", char: "🔥", aliases: ["fire", "lit"]),
        EmojiItem(name: "tada", char: "🎉", aliases: ["party", "tada"]),
        EmojiItem(name: "rocket", char: "🚀", aliases: ["ship", "rocket"]),
        EmojiItem(name: "heart", char: "❤️", aliases: ["heart", "love"]),
        EmojiItem(name: "check", char: "✅", aliases: ["check", "done"]),
        EmojiItem(name: "eyes", char: "👀", aliases: ["eyes"]),
        EmojiItem(name: "100", char: "💯", aliases: ["100"]),
        EmojiItem(name: "bug", char: "🐛", aliases: ["bug"]),
        EmojiItem(name: "computer", char: "💻", aliases: ["laptop"]),
        EmojiItem(name: "coffee", char: "☕", aliases: ["coffee"]),
        EmojiItem(name: "sparkles", char: "✨", aliases: ["sparkle"]),
    ]

    public static func search(_ query: String, catalog: [EmojiItem] = all) -> [EmojiItem] {
        let normalized = query.trimmingCharacters(in: .whitespaces).lowercased()
            .trimmingCharacters(in: CharacterSet(charactersIn: ":"))
        if normalized.isEmpty {
            return Array(catalog.prefix(20))
        }
        return catalog.filter { item in
            item.name.contains(normalized) || item.aliases.contains { $0.contains(normalized) }
        }
    }
}
