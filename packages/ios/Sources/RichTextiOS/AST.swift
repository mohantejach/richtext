import Foundation

public enum NodeType: String, Equatable, Sendable, CaseIterable {
    case document
    case paragraph
    case heading
    case codeBlock
    case list
    case listItem
    case text
    case bold
    case italic
    case inlineCode
    case link
    case mention
    case hardBreak
}

public struct MentionPayload: Equatable, Sendable, Hashable {
    public var userId: String
    public var userName: String

    public init(userId: String, userName: String) {
        self.userId = userId
        self.userName = userName
    }
}

public enum InlineNode: Equatable, Sendable {
    case text(String)
    case mention(MentionPayload)
    case hardBreak
    case bold([InlineNode])
    case italic([InlineNode])
    case inlineCode(String)
    case link(href: String, children: [InlineNode])
}

public enum BlockNode: Equatable, Sendable {
    case paragraph([InlineNode])
    case heading(level: Int, children: [InlineNode])
    case codeBlock(language: String?, value: String)
    case list(ordered: Bool, start: Int?, items: [ListItemNode])
}

public struct ListItemNode: Equatable, Sendable {
    public var children: [ListItemChild]

    public init(children: [ListItemChild]) {
        self.children = children
    }
}

public enum ListItemChild: Equatable, Sendable {
    case paragraph([InlineNode])
    case list(ordered: Bool, start: Int?, items: [ListItemNode])
}

public struct DocumentNode: Equatable, Sendable {
    public var children: [BlockNode]

    public init(children: [BlockNode] = []) {
        self.children = children
    }
}
