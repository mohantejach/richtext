import Foundation

public enum TwilioText {
    /// Converts Markdown + `<@userId|userName>` tokens into plaintext for outbound SMS.
    public static func stripMarkdownAndMentions(_ text: String) -> String {
        let document = MarkdownParser.parse(text)
        return strip(document)
            .replacingOccurrences(of: "[ \\t]+\\n", with: "\n", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func strip(_ document: DocumentNode) -> String {
        document.children.map(stripBlock).joined(separator: "\n\n")
    }

    private static func stripBlock(_ node: BlockNode) -> String {
        switch node {
        case .paragraph(let children):
            return stripInline(children)
        case .heading(_, let children):
            return stripInline(children)
        case .codeBlock(_, let value):
            return value
        case .list(let ordered, let start, let items):
            return items.enumerated().map { index, item in
                let marker = ordered ? "\((start ?? 1) + index). " : "- "
                return item.children.map { child in
                    switch child {
                    case .paragraph(let children):
                        return marker + stripInline(children)
                    case .list(let nestedOrdered, let nestedStart, let nestedItems):
                        return stripBlock(
                            .list(ordered: nestedOrdered, start: nestedStart, items: nestedItems)
                        )
                        .split(separator: "\n")
                        .map { "  \($0)" }
                        .joined(separator: "\n")
                    }
                }.joined(separator: "\n")
            }.joined(separator: "\n")
        }
    }

    private static func stripInline(_ nodes: [InlineNode]) -> String {
        nodes.map(stripInlineNode).joined()
    }

    private static func stripInlineNode(_ node: InlineNode) -> String {
        switch node {
        case .text(let value):
            return value
        case .hardBreak:
            return "\n"
        case .mention(let payload):
            return "@\(payload.userName)"
        case .inlineCode(let value):
            return value
        case .bold(let children), .italic(let children):
            return stripInline(children)
        case .link(let href, let children):
            let label = stripInline(children)
            if label.isEmpty { return href }
            if label == href { return href }
            return "\(label) (\(href))"
        }
    }
}

public func stripMarkdownAndMentions(_ text: String) -> String {
    TwilioText.stripMarkdownAndMentions(text)
}
