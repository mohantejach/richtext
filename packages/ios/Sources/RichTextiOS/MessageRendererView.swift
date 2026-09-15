import SwiftUI

public struct MessageRendererView: View {
    public var text: String
    public var components: RichTextComponentRegistry

    public init(text: String, components: RichTextComponentRegistry = .default) {
        self.text = text
        self.components = components
    }

    public var body: some View {
        let document = MarkdownParser.parse(text)
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(document.children.enumerated()), id: \.offset) { _, block in
                BlockView(node: block, components: components)
            }
        }
    }
}

struct BlockView: View {
    let node: BlockNode
    let components: RichTextComponentRegistry

    var body: some View {
        switch node {
        case .paragraph(let children):
            let content = AnyView(InlineFlow(nodes: children, components: components))
            if let paragraph = components.paragraph {
                paragraph(content)
            } else {
                content
            }
        case .heading(let level, let children):
            let inner = AnyView(
                InlineFlow(nodes: children, components: components)
                    .font(headingFont(level))
            )
            if let heading = components.heading {
                heading(HeadingPayload(level: level, children: children), inner)
            } else {
                inner
            }
        case .codeBlock(let language, let value):
            if let codeBlock = components.codeBlock {
                codeBlock(CodeBlockPayload(language: language, value: value))
            } else {
                Text(value)
                    .font(.system(.body, design: .monospaced))
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.primary.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        case .list(let ordered, let start, let items):
            let inner = AnyView(ListBody(ordered: ordered, start: start, items: items, components: components))
            if let list = components.list {
                list(ListPayload(ordered: ordered, start: start), inner)
            } else {
                inner
            }
        }
    }

    private func headingFont(_ level: Int) -> Font {
        switch level {
        case 1: return .largeTitle.bold()
        case 2: return .title.bold()
        case 3: return .title2.bold()
        case 4: return .title3.bold()
        default: return .headline
        }
    }
}

struct ListBody: View {
    let ordered: Bool
    let start: Int?
    let items: [ListItemNode]
    let components: RichTextComponentRegistry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                let marker = ordered ? "\((start ?? 1) + index)." : "•"
                let content = AnyView(
                    HStack(alignment: .top, spacing: 8) {
                        Text(marker).frame(width: 18, alignment: .leading)
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(Array(item.children.enumerated()), id: \.offset) { _, child in
                                switch child {
                                case .paragraph(let nodes):
                                    InlineFlow(nodes: nodes, components: components)
                                case .list(let nestedOrdered, let nestedStart, let nestedItems):
                                    ListBody(
                                        ordered: nestedOrdered,
                                        start: nestedStart,
                                        items: nestedItems,
                                        components: components
                                    )
                                }
                            }
                        }
                    }
                )
                if let listItem = components.listItem {
                    listItem(content)
                } else {
                    content
                }
            }
        }
    }
}

struct InlineFlow: View {
    let nodes: [InlineNode]
    let components: RichTextComponentRegistry

    var body: some View {
        FlowLayout(spacing: 0, lineSpacing: 2) {
            ForEach(Array(nodes.enumerated()), id: \.offset) { _, node in
                InlineNodeView(node: node, components: components)
            }
        }
    }
}

struct InlineNodeView: View {
    let node: InlineNode
    let components: RichTextComponentRegistry

    var body: some View {
        switch node {
        case .text(let value):
            Text(value)
        case .hardBreak:
            Text("\n")
        case .mention(let payload):
            if let mention = components.mention {
                mention(payload)
            } else {
                Text(AttributedString(fallbackMention: payload))
            }
        case .bold(let children):
            let inner = AnyView(InlineFlow(nodes: children, components: components))
            if let bold = components.bold {
                bold(inner)
            } else {
                inner.bold()
            }
        case .italic(let children):
            let inner = AnyView(InlineFlow(nodes: children, components: components))
            if let italic = components.italic {
                italic(inner)
            } else {
                inner.italic()
            }
        case .inlineCode(let value):
            if let inlineCode = components.inlineCode {
                inlineCode(value)
            } else {
                Text(value)
                    .font(.system(.body, design: .monospaced))
                    .padding(.horizontal, 4)
                    .background(Color.primary.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
        case .link(let href, let children):
            let inner = AnyView(InlineFlow(nodes: children, components: components))
            if let link = components.link {
                link(LinkPayload(href: href), inner)
            } else if let url = URL(string: href) {
                Link(destination: url) { inner }
            } else {
                inner
            }
        }
    }
}

extension AttributedString {
    init(fallbackMention payload: MentionPayload) {
        var value = AttributedString("@\(payload.userName)")
        value.foregroundColor = .blue
        value.font = .body.weight(.semibold)
        value.backgroundColor = Color.blue.opacity(0.12)
        self = value
    }
}
