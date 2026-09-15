import SwiftUI

public struct HeadingPayload: Equatable, Sendable {
    public var level: Int
    public var children: [InlineNode]
}

public struct CodeBlockPayload: Equatable, Sendable {
    public var language: String?
    public var value: String
}

public struct LinkPayload: Equatable, Sendable {
    public var href: String
}

public struct ListPayload: Equatable, Sendable {
    public var ordered: Bool
    public var start: Int?
}

/// Registry of optional SwiftUI view factories. Missing entries fall back to
/// native `AttributedString` / system text styling.
public struct RichTextComponentRegistry {
    public var mention: ((MentionPayload) -> AnyView)?
    public var bold: ((AnyView) -> AnyView)?
    public var italic: ((AnyView) -> AnyView)?
    public var inlineCode: ((String) -> AnyView)?
    public var codeBlock: ((CodeBlockPayload) -> AnyView)?
    public var heading: ((HeadingPayload, AnyView) -> AnyView)?
    public var link: ((LinkPayload, AnyView) -> AnyView)?
    public var list: ((ListPayload, AnyView) -> AnyView)?
    public var listItem: ((AnyView) -> AnyView)?
    public var paragraph: ((AnyView) -> AnyView)?

    public init(
        mention: ((MentionPayload) -> AnyView)? = nil,
        bold: ((AnyView) -> AnyView)? = nil,
        italic: ((AnyView) -> AnyView)? = nil,
        inlineCode: ((String) -> AnyView)? = nil,
        codeBlock: ((CodeBlockPayload) -> AnyView)? = nil,
        heading: ((HeadingPayload, AnyView) -> AnyView)? = nil,
        link: ((LinkPayload, AnyView) -> AnyView)? = nil,
        list: ((ListPayload, AnyView) -> AnyView)? = nil,
        listItem: ((AnyView) -> AnyView)? = nil,
        paragraph: ((AnyView) -> AnyView)? = nil
    ) {
        self.mention = mention
        self.bold = bold
        self.italic = italic
        self.inlineCode = inlineCode
        self.codeBlock = codeBlock
        self.heading = heading
        self.link = link
        self.list = list
        self.listItem = listItem
        self.paragraph = paragraph
    }

    public func view(for type: NodeType) -> Bool {
        switch type {
        case .mention: return mention != nil
        case .bold: return bold != nil
        case .italic: return italic != nil
        case .inlineCode: return inlineCode != nil
        case .codeBlock: return codeBlock != nil
        case .heading: return heading != nil
        case .link: return link != nil
        case .list: return list != nil
        case .listItem: return listItem != nil
        case .paragraph: return paragraph != nil
        default: return false
        }
    }
}

public extension RichTextComponentRegistry {
    static let `default` = RichTextComponentRegistry()
}
