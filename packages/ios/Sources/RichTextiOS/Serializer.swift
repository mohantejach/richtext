import Foundation

public enum MarkdownSerializer {
    public static func serialize(_ document: DocumentNode) -> String {
        document.children.map(serializeBlock).joined(separator: "\n\n")
    }

    private static func serializeBlock(_ node: BlockNode) -> String {
        switch node {
        case .paragraph(let children):
            return serializeInline(children)
        case .heading(let level, let children):
            return String(repeating: "#", count: level) + " " + serializeInline(children)
        case .codeBlock(let language, let value):
            return "```\(language ?? "")\n\(value)\n```"
        case .list(let ordered, let start, let items):
            return serializeList(ordered: ordered, start: start, items: items, indent: 0)
        }
    }

    private static func serializeList(
        ordered: Bool,
        start: Int?,
        items: [ListItemNode],
        indent: Int
    ) -> String {
        let pad = String(repeating: " ", count: indent)
        return items.enumerated().map { index, item in
            serializeListItem(item, ordered: ordered, start: start, index: index, indent: indent, pad: pad)
        }.joined(separator: "\n")
    }

    private static func serializeListItem(
        _ item: ListItemNode,
        ordered: Bool,
        start: Int?,
        index: Int,
        indent: Int,
        pad: String
    ) -> String {
        let marker = ordered ? "\((start ?? 1) + index)." : "-"
        var parts: [String] = []
        for child in item.children {
            switch child {
            case .paragraph(let children):
                let text = serializeInline(children)
                if parts.isEmpty {
                    parts.append("\(pad)\(marker) \(text)")
                } else {
                    parts.append("\(pad)  \(text)")
                }
            case .list(let nestedOrdered, let nestedStart, let nestedItems):
                parts.append(
                    serializeList(
                        ordered: nestedOrdered,
                        start: nestedStart,
                        items: nestedItems,
                        indent: indent + 2
                    )
                )
            }
        }
        return parts.joined(separator: "\n")
    }

    public static func serializeInline(_ nodes: [InlineNode]) -> String {
        nodes.map(serializeInlineNode).joined()
    }

    private static func serializeInlineNode(_ node: InlineNode) -> String {
        switch node {
        case .text(let value):
            return escapeText(value)
        case .hardBreak:
            return "\n"
        case .mention(let payload):
            return "<@\(payload.userId)|\(payload.userName)>"
        case .inlineCode(let value):
            return wrapCode(value)
        case .bold(let children):
            return "**\(serializeInline(children))**"
        case .italic(let children):
            return "*\(serializeInline(children))*"
        case .link(let href, let children):
            return "[\(serializeInline(children))](\(href))"
        }
    }

    private static func wrapCode(_ value: String) -> String {
        var ticks = 1
        while value.contains(String(repeating: "`", count: ticks)) {
            ticks += 1
        }
        let fence = String(repeating: "`", count: ticks)
        let padded = (value.hasPrefix("`") || value.hasSuffix("`") || value.hasPrefix(" "))
            ? " \(value) "
            : value
        return "\(fence)\(padded)\(fence)"
    }

    private static func escapeText(_ value: String) -> String {
        value.replacingOccurrences(of: "([\\\\`*_\\[\\]<>])", with: "\\\\$1", options: .regularExpression)
    }
}
